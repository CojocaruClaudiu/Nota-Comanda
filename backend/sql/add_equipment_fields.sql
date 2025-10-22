-- Add nullable equipment fields (safe, non-destructive)
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "serialNumber" text;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "referenceNumber" text;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "lastRepairDate" timestamptz;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "repairCost" double precision;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "repairCount" integer;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS warranty text;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "equipmentNumber" text;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS generation text;
ALTER TABLE "Equipment" ADD COLUMN IF NOT EXISTS "purchasePrice" double precision;
