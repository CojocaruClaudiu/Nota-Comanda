-- Add new fields to Material table for Reception Registry functionality
-- This allows the existing Materials table to serve as the reception registry

-- Add ReceptionType enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "ReceptionType" AS ENUM ('SANTIER', 'MAGAZIE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to Material table
ALTER TABLE "Material" 
ADD COLUMN IF NOT EXISTS "manufacturer" TEXT,
ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT,
ADD COLUMN IF NOT EXISTS "receptionType" "ReceptionType",
ADD COLUMN IF NOT EXISTS "receivedQuantity" DECIMAL(12,4);

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS "Material_invoiceNumber_idx" ON "Material"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "Material_receptionType_idx" ON "Material"("receptionType");

-- Add comment to explain the dual purpose of this table
COMMENT ON TABLE "Material" IS 'Serves both as Materials Catalog and Reception Registry (Registru Recepții)';
COMMENT ON COLUMN "Material"."manufacturer" IS 'Producător - for reception registry';
COMMENT ON COLUMN "Material"."invoiceNumber" IS 'Nr. Factură (ex: ANR TGV 56836) - for reception tracking';
COMMENT ON COLUMN "Material"."receptionType" IS 'Tip Recepție: SANTIER or MAGAZIE - filters materials by reception location';
COMMENT ON COLUMN "Material"."receivedQuantity" IS 'Cantitate recepționată - actual received quantity (may differ from pack quantity)';
