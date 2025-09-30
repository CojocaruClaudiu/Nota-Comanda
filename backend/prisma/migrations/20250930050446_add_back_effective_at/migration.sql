/*
  Warnings:

  - Added the required column `effectiveAt` to the `CashEntry` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CashEntry_cashAccountId_createdAt_idx";

-- AlterTable - Add column with default value first
ALTER TABLE "CashEntry" ADD COLUMN "effectiveAt" TIMESTAMP(3);

-- Update existing records to use createdAt as effectiveAt
UPDATE "CashEntry" SET "effectiveAt" = "createdAt" WHERE "effectiveAt" IS NULL;

-- Make the column required
ALTER TABLE "CashEntry" ALTER COLUMN "effectiveAt" SET NOT NULL;

-- CreateIndex
CREATE INDEX "CashEntry_cashAccountId_effectiveAt_idx" ON "CashEntry"("cashAccountId", "effectiveAt");
