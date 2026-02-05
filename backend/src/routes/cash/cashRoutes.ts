import express from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { createCashEntrySchema, updateCashEntrySchema, listCashEntriesQuerySchema, transferSchema, balanceQuerySchema, closeDaySchema, closeMonthSchema } from './validators';
import { z } from 'zod';

const prisma = new PrismaClient();
const router = express.Router();

// helper to hide internal fields from API responses (if any in future)
function stripInternal<T>(obj: T) {
  return obj;
}


function toNumber(v: any) { return Number(v ?? 0); }

// List entries with filters & pagination
router.get('/cash-entries', async (req, res) => {
  try {
    const parsed = listCashEntriesQuerySchema.parse(req.query);
    const { companyId, cashAccountId, from, to, search, page = 1, pageSize = 50, sort = 'dateAsc' } = parsed as any;
  const where: any = { companyId };
    if (cashAccountId) where.cashAccountId = cashAccountId;
    if (from || to) where.effectiveAt = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
    if (search) where.OR = [
      { notes: { contains: search, mode: 'insensitive' } },
    ];

    const orderBy = { effectiveAt: sort === 'dateAsc' ? 'asc' : 'desc' } as const;
    const skip = (page - 1) * pageSize;

    const [total, rowsRaw, sumIn, sumOut] = await Promise.all([
      prisma.cashEntry.count({ where }),
      prisma.cashEntry.findMany({ where, orderBy: { createdAt: 'asc' }, skip, take: pageSize, include: { employee: true, cashAccount: true } }),
  prisma.cashEntry.aggregate({ where: { ...where, type: 'IN' }, _sum: { amount: true } }),
  prisma.cashEntry.aggregate({ where: { ...where, type: 'OUT' }, _sum: { amount: true } }),
    ]);

    // Compute prior balance before first row in this page (if pagination beyond first)
    let priorBalance = 0;
    if (rowsRaw.length) {
      const firstDate = rowsRaw[0].effectiveAt;
  const priorAgg = await prisma.cashEntry.groupBy({ by: ['type'], where: { ...where, createdAt: { lt: firstDate } }, _sum: { amount: true } });
  for (const g of priorAgg) { const amt = toNumber(g._sum.amount||0); priorBalance += g.type === 'IN' ? amt : -amt; }
    }
    let running = priorBalance;
  const rows = rowsRaw.map((r:any) => { const delta = r.type === 'IN' ? toNumber(r.amount) : -toNumber(r.amount); running += delta; return { ...r, runningBalance: running }; });

    res.json({ total, page, pageSize, rows, sumIn: toNumber(sumIn._sum.amount||0), sumOut: toNumber(sumOut._sum.amount||0) });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    console.error('GET /cash-entries error', e);
    res.status(500).json({ error: 'Failed list cash entries' });
  }
});

async function computeBalanceAfter(accountId: string) {
  const agg = await prisma.cashEntry.groupBy({ by: ['type'], where: { cashAccountId: accountId }, _sum: { amount: true } });
  let balance = 0; for (const g of agg) { const amt = toNumber(g._sum.amount||0); balance += g.type === 'IN' ? amt : -amt; }
  return balance;
}

async function ensureNonNegative(accountId: string, delta: number, overrideNegative?: boolean) {
  const current = await computeBalanceAfter(accountId);
  if (current + delta < 0 && !overrideNegative) throw new Error('Balance would become negative');
}

// Sequence number generation per company/year (transaction safe) - REMOVED
// async function nextSequence(companyId: string, year: number, tx: Prisma.TransactionClient) {
//   const row = await tx.cashEntry.findFirst({ where: { companyId, sequenceYear: year }, orderBy: { sequenceNo: 'desc' }, select: { sequenceNo: true } });
//   return (row?.sequenceNo ?? 0) + 1;
// }

async function computeBalanceExcludingEntry(accountId: string, entryId: string) {
  const agg = await prisma.cashEntry.groupBy({ by: ['type'], where: { cashAccountId: accountId, id: { not: entryId } }, _sum: { amount: true } });
  let balance = 0; for (const g of agg) { const amt = toNumber(g._sum.amount||0); balance += g.type === 'IN' ? amt : -amt; }
  return balance;
}

// Create IN/OUT entry
router.post('/cash-entries', async (req, res) => {
  try {
    const data = createCashEntrySchema.parse(req.body);
    const effectiveAt = new Date(data.effectiveAt as any);
    const account = await prisma.cashAccount.findUnique({ where: { id: data.cashAccountId }, include: { company: true } });
    if (!account) return res.status(404).json({ error: 'Cash account not found' });
    const delta = data.type === 'IN' ? data.amount : -data.amount;
    await ensureNonNegative(account.id, delta, data.overrideNegative);
    
    const created = await prisma.cashEntry.create({ data: { 
      companyId: account.companyId,
      cashAccountId: account.id,
      effectiveAt,
      type: data.type,
  amount: data.amount,
      currency: (data.currency as any) || 'RON',
      employeeId: (data as any).employeeId || null,
      notes: data.notes || null,
    }});
    
    res.status(201).json(created);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    if (e instanceof Error && e.message.includes('negative')) return res.status(400).json({ error: e.message });
    console.error('POST /cash-entries error', e);
    res.status(500).json({ error: 'Failed create entry' });
  }
});

// Update entry
router.patch('/cash-entries/:id', async (req, res) => {
  try {
    const id = req.params.id;
  const existing = await prisma.cashEntry.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const data = updateCashEntrySchema.parse(req.body);
    const { cashAccountId: _cashAccountId, overrideNegative: _overrideNegative } = data;
  let updatedAmountDecimal: number | undefined;
    if (data.amount !== undefined) {
  const baseBalance = await computeBalanceExcludingEntry(existing.cashAccountId, existing.id);
  const newBalance = baseBalance + (existing.type === 'IN' ? data.amount : -data.amount);
      if (newBalance < 0 && !(req.body as any).overrideNegative) {
        return res.status(400).json({ error: 'Balance would become negative' });
      }
  updatedAmountDecimal = data.amount;
    }
    const updateData: Prisma.CashEntryUncheckedUpdateInput = {};
    if (data.effectiveAt !== undefined) updateData.effectiveAt = new Date(data.effectiveAt as any);
    if (data.type !== undefined) updateData.type = data.type;
    if (data.currency !== undefined) updateData.currency = data.currency as any;
    if (data.employeeId !== undefined) updateData.employeeId = data.employeeId;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (updatedAmountDecimal !== undefined) updateData.amount = updatedAmountDecimal;
    const updated = await prisma.cashEntry.update({ where: { id }, data: updateData });
    res.json(updated);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Failed update entry' });
  }
});

// Transfer
router.post('/cash-entries/transfer', async (req, res) => {
  try {
    const data = transferSchema.parse(req.body);
    if (data.sourceAccountId === data.destinationAccountId) return res.status(400).json({ error: 'Same account' });
    const [src, dst] = await Promise.all([
      prisma.cashAccount.findUnique({ where: { id: data.sourceAccountId } }),
      prisma.cashAccount.findUnique({ where: { id: data.destinationAccountId } }),
    ]);
    if (!src || !dst) return res.status(404).json({ error: 'Account missing' });
    const effectiveAt = new Date(data.effectiveAt as any);
    
    if (!data.overrideNegative) {
      const current = await computeBalanceAfter(src.id);
      if (current - data.amount < 0) return res.status(400).json({ error: 'Insufficient funds for transfer' });
    }
    const transferGroupId = crypto.randomUUID();
  const created = await prisma.$transaction(async (tx: any) => {
      const out = await tx.cashEntry.create({ data: {
        companyId: src.companyId,
        cashAccountId: src.id,
        effectiveAt,
        type: 'OUT',
  amount: data.amount,
        currency: 'RON',
        notes: data.notes || null,
        employeeId: (data as any).employeeId || null,
        transferGroupId,
      }});
      const inn = await tx.cashEntry.create({ data: {
        companyId: dst.companyId,
        cashAccountId: dst.id,
        effectiveAt,
        type: 'IN',
  amount: data.amount,
        currency: 'RON',
        notes: data.notes || null,
        employeeId: (data as any).employeeId || null,
        transferGroupId,
      }});
      return { out, in: inn };
    });
    res.status(201).json({ out: created.out, in: created.in });
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    console.error('POST /cash-entries/transfer', e);
    res.status(500).json({ error: 'Failed transfer' });
  }
});

// Balances
router.get('/balances', async (req, res) => {
  try {
    const { companyId, asOf } = balanceQuerySchema.parse(req.query);
    const date = asOf ? new Date(asOf) : new Date();
    const accounts = await prisma.cashAccount.findMany({ where: { companyId: companyId || undefined } });
    const result: any[] = [];
    for (const acc of accounts) {
      const agg = await prisma.cashEntry.groupBy({ by: ['type'], where: { cashAccountId: acc.id, effectiveAt: { lte: date } }, _sum: { amount: true } });
  let balance = 0; for (const g of agg) { const amt = toNumber(g._sum.amount||0); balance += g.type === 'IN' ? amt : -amt; }
      result.push({ accountId: acc.id, accountName: acc.name, companyId: acc.companyId, balance });
    }
    res.json(result);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(500).json({ error: 'Failed balances' });
  }
});

export default router;

// ---- Auxiliary lists ----
router.get('/companies', async (_req,res)=>{
  const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } });
  res.json(companies);
});

router.get('/cash-accounts', async (req,res)=>{
  const { companyId } = req.query as { companyId?: string };
  const accounts = await prisma.cashAccount.findMany({ where: { companyId: companyId || undefined }, orderBy: { name: 'asc' } });
  res.json(accounts);
});

router.get('/cash-categories', async (_req,res)=>{
  const cats = await prisma.cashCategory.findMany({ orderBy: { name: 'asc' } });
  res.json(cats);
});
router.post('/cash-categories', async (req,res)=>{
  const { name } = req.body || {}; if (!name) return res.status(400).json({ error: 'name required' });
  try { const c = await prisma.cashCategory.create({ data: { name } }); res.status(201).json(c);} catch(e){ return res.status(409).json({ error: 'duplicate?' }); }
});

router.get('/persons', async (_req,res)=>{
  const persons = await prisma.person.findMany({ orderBy: { name: 'asc' } });
  res.json(persons);
});
router.post('/persons', async (req,res)=>{
  const { name } = req.body || {}; if (!name) return res.status(400).json({ error: 'name required' });
  const p = await prisma.person.create({ data: { name } });
  res.status(201).json(p);
});

// Delete entry
router.delete('/cash-entries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.cashEntry.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.cashEntry.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /cash-entries/:id', e);
    res.status(500).json({ error: 'Failed delete' });
  }
});
