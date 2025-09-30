/*
  Warnings:

  - You are about to drop the column `effectiveAt` on the `CashEntry` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "CashEntry_cashAccountId_effectiveAt_idx";

-- DropIndex
DROP INDEX "CashEntry_companyId_effectiveAt_idx";

-- AlterTable
ALTER TABLE "CashEntry" DROP COLUMN "effectiveAt";

-- CreateIndex
CREATE INDEX "CashEntry_cashAccountId_createdAt_idx" ON "CashEntry"("cashAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "CashEntry_companyId_createdAt_idx" ON "CashEntry"("companyId", "createdAt");
