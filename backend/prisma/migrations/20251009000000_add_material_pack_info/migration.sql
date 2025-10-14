-- Ensure Material table exists
CREATE TABLE IF NOT EXISTS "public"."Material" (
  "id" TEXT NOT NULL,
  "groupId" TEXT,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "supplierName" TEXT,
  "supplierId" TEXT,
  "unit" TEXT NOT NULL DEFAULT 'buc',
  "price" DECIMAL NOT NULL DEFAULT 0,
  "currency" "Currency" NOT NULL DEFAULT 'RON',
  "purchaseDate" TIMESTAMP(3),
  "technicalSheet" TEXT,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- Add packaging conversion information to materials
ALTER TABLE "public"."Material"
  ADD COLUMN IF NOT EXISTS "packQuantity" DECIMAL(12,4),
  ADD COLUMN IF NOT EXISTS "packUnit" TEXT;
