import { z } from 'zod';

export const cashEntryBaseSchema = z.object({
  cashAccountId: z.string().uuid(),
  effectiveAt: z.string().datetime().or(z.date()),
  type: z.enum(['IN', 'OUT']),
  amount: z.number().positive(),
  currency: z.string().default('RON'),
  employeeId: z.string().uuid().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  overrideNegative: z.boolean().optional().default(false)
});

export const createCashEntrySchema = cashEntryBaseSchema;
export const updateCashEntrySchema = cashEntryBaseSchema.partial();

export const listCashEntriesQuerySchema = z.object({
  companyId: z.string().uuid(),
  cashAccountId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().optional(),
  page: z.string().transform(v=>parseInt(v,10)).optional(),
  pageSize: z.string().transform(v=>parseInt(v,10)).optional(),
  sort: z.enum(['dateAsc','dateDesc']).optional()
});

export const transferSchema = z.object({
  sourceAccountId: z.string().uuid(),
  destinationAccountId: z.string().uuid(),
  amount: z.number().positive(),
  effectiveAt: z.string().datetime().or(z.date()),
  notes: z.string().optional().nullable(),
  employeeId: z.string().uuid().optional().nullable(),
  overrideNegative: z.boolean().optional().default(false)
});

export const balanceQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  asOf: z.string().datetime().optional()
});

export const closeDaySchema = z.object({ date: z.string().datetime(), companyId: z.string().uuid() });
export const closeMonthSchema = z.object({ year: z.number().int(), month: z.number().int().min(1).max(12), companyId: z.string().uuid() });
