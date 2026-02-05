-- Ensure the receptionType column exists and stores free-form text (project IDs or MAGAZIE)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'Material'
  ) THEN
    -- Ensure the receptionType column exists and stores free-form text (project IDs or MAGAZIE)
    ALTER TABLE "Material"
      ADD COLUMN IF NOT EXISTS "receptionType" TEXT;

    ALTER TABLE "Material"
      ALTER COLUMN "receptionType" TYPE TEXT USING "receptionType"::text;

    -- Ensure index exists for filtering by receptionType
    EXECUTE 'CREATE INDEX IF NOT EXISTS "Material_receptionType_idx" ON "Material"("receptionType")';
  END IF;
END
$$;

-- Drop legacy enum type if the database still has it
DROP TYPE IF EXISTS "ReceptionType";
