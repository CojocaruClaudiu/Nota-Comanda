import { PrismaClient } from '@prisma/client';

// These tests assume an ephemeral test database or isolated environment.
// They focus on sequence number monotonic increase per company/year.

describe('CashEntry sequence', () => {
  const prisma = new PrismaClient();
  const p: any = prisma as any;
  let companyId: string; let accountId: string;

  beforeAll(async () => {
    // Create company & account
    const company = await p.company.create({ data: { name: 'Test Co Seq ' + Date.now() } });
    companyId = company.id;
    const account = await p.cashAccount.create({ data: { companyId, name: 'Casa Test' } });
    accountId = account.id;
  });

  afterAll(async () => { await prisma.$disconnect(); });

  it('increments sequence numbers per year', async () => {
    const now = new Date();
    const base = { companyId, cashAccountId: accountId, effectiveAt: now, type: 'IN', amount: 100, currency: 'RON', sequenceYear: now.getUTCFullYear(), createdBy: 1 };
    const first = await p.cashEntry.create({ data: base });
    const second = await p.cashEntry.create({ data: base });
    expect(second.sequenceNo).toBe(first.sequenceNo + 1);
  });
});
