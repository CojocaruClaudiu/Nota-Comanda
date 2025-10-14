-- Create Reception Type enum
CREATE TYPE "ReceptionType" AS ENUM ('SANTIER', 'MAGAZIE');

-- Create Reception table
CREATE TABLE "Reception" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "date" TIMESTAMP(3) NOT NULL,
  "invoice" TEXT NOT NULL,
  "supplier" TEXT NOT NULL,
  "manufacturer" TEXT NOT NULL,
  "material" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "orderId" TEXT,
  "receptionType" "ReceptionType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create indexes
CREATE INDEX "Reception_date_idx" ON "Reception"("date");
CREATE INDEX "Reception_supplier_idx" ON "Reception"("supplier");
CREATE INDEX "Reception_receptionType_idx" ON "Reception"("receptionType");
