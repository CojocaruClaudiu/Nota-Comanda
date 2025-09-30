/*
  Warnings:

  - You are about to drop the column `currency` on the `CashAccount` table. All the data in the column will be lost.
  - You are about to drop the column `approvedBy` on the `CashEntry` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `CashEntry` table. All the data in the column will be lost.
  - You are about to drop the column `lockedAt` on the `CashEntry` table. All the data in the column will be lost.
  - You are about to drop the column `personId` on the `CashEntry` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `CashEntry` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "CashEntry" DROP CONSTRAINT "CashEntry_approvedBy_fkey";

-- DropForeignKey
ALTER TABLE "CashEntry" DROP CONSTRAINT "CashEntry_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "CashEntry" DROP CONSTRAINT "CashEntry_personId_fkey";

-- DropForeignKey
ALTER TABLE "CashEntry" DROP CONSTRAINT "CashEntry_projectId_fkey";

-- AlterTable
ALTER TABLE "CashAccount" DROP COLUMN "currency";

-- AlterTable
ALTER TABLE "CashEntry" DROP COLUMN "approvedBy",
DROP COLUMN "categoryId",
DROP COLUMN "lockedAt",
DROP COLUMN "personId",
DROP COLUMN "projectId";
