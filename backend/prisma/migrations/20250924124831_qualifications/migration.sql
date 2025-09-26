/*
  Warnings:

  - You are about to drop the column `qualifications` on the `Employee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "qualifications";

-- CreateTable
CREATE TABLE "Qualification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_EmployeeToQualification" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Qualification_name_key" ON "Qualification"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_EmployeeToQualification_AB_unique" ON "_EmployeeToQualification"("A", "B");

-- CreateIndex
CREATE INDEX "_EmployeeToQualification_B_index" ON "_EmployeeToQualification"("B");

-- AddForeignKey
ALTER TABLE "_EmployeeToQualification" ADD CONSTRAINT "_EmployeeToQualification_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EmployeeToQualification" ADD CONSTRAINT "_EmployeeToQualification_B_fkey" FOREIGN KEY ("B") REFERENCES "Qualification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
