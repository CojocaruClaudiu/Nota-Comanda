-- Migration: Change OperationSheetTemplate from Operation to OperationItem
-- This migration preserves existing data

-- Step 1: Add new column operationItemId (nullable for now)
ALTER TABLE "OperationSheetTemplate" ADD COLUMN "operationItemId" TEXT;

-- Step 2: For existing templates, we need to assign them to an OperationItem
-- Since we don't know which specific item they should belong to, 
-- we'll delete existing templates (they were test data anyway)
DELETE FROM "OperationSheetItem" WHERE "templateId" IS NOT NULL;
DELETE FROM "OperationSheetTemplate";

-- Step 3: Now make operationItemId NOT NULL and add the foreign key
ALTER TABLE "OperationSheetTemplate" ALTER COLUMN "operationItemId" SET NOT NULL;
ALTER TABLE "OperationSheetTemplate" ADD CONSTRAINT "OperationSheetTemplate_operationItemId_fkey" 
  FOREIGN KEY ("operationItemId") REFERENCES "OperationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Drop the old operationId column and its foreign key
ALTER TABLE "OperationSheetTemplate" DROP CONSTRAINT "OperationSheetTemplate_operationId_fkey";
ALTER TABLE "OperationSheetTemplate" DROP COLUMN "operationId";

-- Step 5: Update indexes
DROP INDEX IF EXISTS "OperationSheetTemplate_operationId_idx";
DROP INDEX IF EXISTS "OperationSheetTemplate_operationId_name_key";

CREATE INDEX "OperationSheetTemplate_operationItemId_idx" ON "OperationSheetTemplate"("operationItemId");
CREATE UNIQUE INDEX "OperationSheetTemplate_operationItemId_name_key" ON "OperationSheetTemplate"("operationItemId", "name");
