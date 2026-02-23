-- Create equipment type enum
DO $$ BEGIN
    CREATE TYPE "EquipmentType" AS ENUM ('BOOTS', 'PANTS', 'JACKET', 'GLOVES', 'HELMET', 'VEST', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create equipment condition enum
DO $$ BEGIN
    CREATE TYPE "EquipmentCondition" AS ENUM ('NEW', 'GOOD', 'WORN', 'DAMAGED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create equipment issues table
CREATE TABLE IF NOT EXISTS "EquipmentIssue" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "equipmentType" "EquipmentType" NOT NULL,
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedDate" TIMESTAMP(3),
    "size" TEXT,
    "condition" "EquipmentCondition" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentIssue_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "EquipmentIssue_employeeId_equipmentType_idx" ON "EquipmentIssue"("employeeId", "equipmentType");
CREATE INDEX IF NOT EXISTS "EquipmentIssue_issuedDate_idx" ON "EquipmentIssue"("issuedDate");

-- Add foreign key constraint
DO $$ BEGIN
    ALTER TABLE "EquipmentIssue" ADD CONSTRAINT "EquipmentIssue_employeeId_fkey" 
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
