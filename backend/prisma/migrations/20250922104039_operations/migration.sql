/*
  Warnings:

  - You are about to drop the column `description` on the `OperationCategory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OperationCategory" DROP COLUMN "description";

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Operation_categoryId_idx" ON "Operation"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Operation_categoryId_name_key" ON "Operation"("categoryId", "name");

-- AddForeignKey
ALTER TABLE "Operation" ADD CONSTRAINT "Operation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "OperationCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
