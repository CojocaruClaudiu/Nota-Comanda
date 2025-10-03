-- Drop existing constraints and recreate tables
DROP TABLE IF EXISTS "Material" CASCADE;
DROP TABLE IF EXISTS "MaterialGroup" CASCADE;

-- Create MaterialGroup table
CREATE TABLE "MaterialGroup" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Material table (single level, groupId optional)
CREATE TABLE "Material" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "groupId" TEXT,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "supplierName" TEXT,
    "supplierId" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'buc',
    "price" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "technicalSheet" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Material_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MaterialGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX "Material_groupId_idx" ON "Material"("groupId");
CREATE INDEX "Material_code_idx" ON "Material"("code");
CREATE INDEX "Material_description_idx" ON "Material"("description");
CREATE INDEX "Material_supplierName_idx" ON "Material"("supplierName");
