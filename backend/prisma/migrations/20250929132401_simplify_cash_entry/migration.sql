/*
  Warnings:

  - You are about to drop the column `createdBy` on the `CashEntry` table. All the data in the column will be lost.
  - You are about to drop the column `sequenceNo` on the `CashEntry` table. All the data in the column will be lost.
  - You are about to drop the column `sequenceYear` on the `CashEntry` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CashEntry" DROP CONSTRAINT "CashEntry_createdBy_fkey";

-- DropIndex
DROP INDEX "CashEntry_companyId_sequenceYear_sequenceNo_key";

-- AlterTable
ALTER TABLE "CashEntry" DROP COLUMN "createdBy",
DROP COLUMN "sequenceNo",
DROP COLUMN "sequenceYear";
