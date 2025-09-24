/*
  Warnings:

  - You are about to drop the `OperationItemVariant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OperationItemVariant" DROP CONSTRAINT "OperationItemVariant_itemId_fkey";

-- AlterTable
ALTER TABLE "OperationItem" ADD COLUMN     "unit" TEXT;

-- DropTable
DROP TABLE "OperationItemVariant";
