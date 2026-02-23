-- Add finalLeaveBalance column for tracking PTO payout at employee departure
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "finalLeaveBalance" DOUBLE PRECISION;
