-- Baseline the Materials catalog tables so shadow databases match production.

-- Ensure MaterialGroup table exists with expected columns
CREATE TABLE IF NOT EXISTS "MaterialGroup" (
  "id"        TEXT        NOT NULL,
  "name"      TEXT        NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaterialGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MaterialGroup_name_key" ON "MaterialGroup"("name");

-- Ensure Material table exists with the columns currently used by the application
CREATE TABLE IF NOT EXISTS "Material" (
  "id"              TEXT         NOT NULL,
  "groupId"         TEXT,
  "code"            TEXT         NOT NULL,
  "description"     TEXT         NOT NULL,
  "supplierName"    TEXT,
  "supplierId"      TEXT,
  "manufacturer"    TEXT,
  "unit"            TEXT         NOT NULL DEFAULT 'buc',
  "price"           NUMERIC      NOT NULL DEFAULT 0,
  "currency"        "Currency"   NOT NULL DEFAULT 'RON',
  "purchaseDate"    TIMESTAMP(3),
  "invoiceNumber"   TEXT,
  "receptionType"   TEXT,
  "receivedQuantity" NUMERIC,
  "technicalSheet"  TEXT,
  "notes"           TEXT,
  "packQuantity"    NUMERIC,
  "packUnit"        TEXT,
  "active"          BOOLEAN      NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- Backfill any missing columns for legacy databases
ALTER TABLE "Material"
  ADD COLUMN IF NOT EXISTS "manufacturer" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "receptionType" TEXT,
  ADD COLUMN IF NOT EXISTS "receivedQuantity" DECIMAL(12,4),
  ADD COLUMN IF NOT EXISTS "technicalSheet" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "packQuantity" DECIMAL(12,4),
  ADD COLUMN IF NOT EXISTS "packUnit" TEXT,
  ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMP(3);

-- Ensure defaults align with the Prisma schema
ALTER TABLE "Material"
  ALTER COLUMN "unit" SET DEFAULT 'buc',
  ALTER COLUMN "price" SET DEFAULT 0,
  ALTER COLUMN "currency" SET DEFAULT 'RON',
  ALTER COLUMN "active" SET DEFAULT true,
  ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Ensure useful indexes exist for frequent queries
CREATE INDEX IF NOT EXISTS "Material_groupId_idx" ON "Material"("groupId");
CREATE INDEX IF NOT EXISTS "Material_code_idx" ON "Material"("code");
CREATE INDEX IF NOT EXISTS "Material_description_idx" ON "Material"("description");
CREATE INDEX IF NOT EXISTS "Material_supplierName_idx" ON "Material"("supplierName");
CREATE INDEX IF NOT EXISTS "Material_invoiceNumber_idx" ON "Material"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "Material_code_createdAt_idx" ON "Material"("code", "createdAt");

-- Ensure relation between Material and MaterialGroup exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Material'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'MaterialGroup'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.constraint_name = 'Material_groupId_fkey'
  ) THEN
    ALTER TABLE "Material"
      ADD CONSTRAINT "Material_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "MaterialGroup"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
