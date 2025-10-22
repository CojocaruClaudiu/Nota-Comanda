-- Ensure the receptionType column exists and stores free-form text (project IDs or MAGAZIE)
ALTER TABLE "Material"
  ADD COLUMN IF NOT EXISTS "receptionType" TEXT;

ALTER TABLE "Material"
  ALTER COLUMN "receptionType" TYPE TEXT USING "receptionType"::text;

-- Drop legacy enum type if the database still has it
DROP TYPE IF EXISTS "ReceptionType";

-- Ensure index exists for filtering by receptionType
CREATE INDEX IF NOT EXISTS "Material_receptionType_idx" ON "Material"("receptionType");