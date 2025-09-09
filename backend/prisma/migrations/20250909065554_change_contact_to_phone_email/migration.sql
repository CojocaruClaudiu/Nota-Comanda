/*
  Warnings:

  - You are about to drop the column `cif` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `contact` on the `Client` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cui]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `phone` to the `Client` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Client_cif_key";

-- AlterTable: First, add new columns and copy data
ALTER TABLE "Client" 
ADD COLUMN "cui" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "phone" TEXT;

-- Update existing records: move cif to cui and contact to phone
UPDATE "Client" SET "cui" = "cif", "phone" = "contact";

-- Now drop the old columns
ALTER TABLE "Client" 
DROP COLUMN "cif",
DROP COLUMN "contact";

-- Make phone required by adding NOT NULL constraint
ALTER TABLE "Client" ALTER COLUMN "phone" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Client_cui_key" ON "Client"("cui");
