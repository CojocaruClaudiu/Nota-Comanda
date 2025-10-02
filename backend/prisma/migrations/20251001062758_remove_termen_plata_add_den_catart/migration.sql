/*
  Warnings:

  - You are about to drop the column `termenPlata` on the `Furnizor` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Furnizor" DROP COLUMN "termenPlata",
ADD COLUMN     "den_catart" TEXT;

-- CreateIndex
CREATE INDEX "Furnizor_den_catart_idx" ON "public"."Furnizor"("den_catart");
