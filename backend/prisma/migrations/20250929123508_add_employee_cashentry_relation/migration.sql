/*
  Warnings:

  - You are about to drop the column `documentNo` on the `CashEntry` table. All the data in the column will be lost.
  - You are about to drop the column `documentType` on the `CashEntry` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CashEntry" DROP COLUMN "documentNo",
DROP COLUMN "documentType",
ADD COLUMN     "employeeId" TEXT;

-- DropEnum
DROP TYPE "CashDocumentType";

-- AddForeignKey
ALTER TABLE "CashEntry" ADD CONSTRAINT "CashEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
