/*
  Warnings:

  - A unique constraint covering the columns `[cnp]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "cnp" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cnp_key" ON "Employee"("cnp");
