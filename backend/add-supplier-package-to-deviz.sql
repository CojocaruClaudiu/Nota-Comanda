-- Add supplier and package information to ProjectDevizMaterial table
-- Migration to support Necesar Aprovizionare feature enhancements

ALTER TABLE "public"."ProjectDevizMaterial"
ADD COLUMN IF NOT EXISTS "supplier" TEXT,
ADD COLUMN IF NOT EXISTS "packageSize" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "packageUnit" TEXT;

-- Create index for supplier lookups (optional, for performance)
CREATE INDEX IF NOT EXISTS "idx_project_deviz_material_supplier" 
ON "public"."ProjectDevizMaterial"("supplier");

-- Comment the columns for documentation
COMMENT ON COLUMN "public"."ProjectDevizMaterial"."supplier" IS 'Supplier/vendor name (Furnizor)';
COMMENT ON COLUMN "public"."ProjectDevizMaterial"."packageSize" IS 'Package size (e.g., 25 for 25kg bag)';
COMMENT ON COLUMN "public"."ProjectDevizMaterial"."packageUnit" IS 'Package unit (e.g., kg, buc, m²)';
