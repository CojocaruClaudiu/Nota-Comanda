-- Introduce material families and link materials to optional family buckets.

CREATE TABLE IF NOT EXISTS "MaterialFamily" (
  "id"            TEXT         NOT NULL,
  "name"          TEXT         NOT NULL,
  "normalizedKey" TEXT,
  "confidence"    TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaterialFamily_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MaterialFamily_name_key" ON "MaterialFamily"("name");
CREATE INDEX IF NOT EXISTS "MaterialFamily_normalizedKey_idx" ON "MaterialFamily"("normalizedKey");

ALTER TABLE "Material"
  ADD COLUMN IF NOT EXISTS "familyId" TEXT;

CREATE INDEX IF NOT EXISTS "Material_familyId_idx" ON "Material"("familyId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.constraint_schema = 'public'
      AND tc.constraint_name = 'Material_familyId_fkey'
  ) THEN
    ALTER TABLE "Material"
      ADD CONSTRAINT "Material_familyId_fkey"
      FOREIGN KEY ("familyId") REFERENCES "MaterialFamily"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$ LANGUAGE plpgsql;
