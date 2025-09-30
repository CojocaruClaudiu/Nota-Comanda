-- AlterTable
ALTER TABLE "public"."_EmployeeToQualification" ADD CONSTRAINT "_EmployeeToQualification_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_EmployeeToQualification_AB_unique";
