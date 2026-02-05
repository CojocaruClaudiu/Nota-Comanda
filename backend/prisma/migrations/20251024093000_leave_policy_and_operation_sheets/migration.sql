-- Align Prisma migration history with the existing leave policy, reception registry,
-- and operation sheet structures already present in the database.

-- ======================
-- Enum declarations
-- ======================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccrualMethod') THEN
    CREATE TYPE "AccrualMethod" AS ENUM ('DAILY', 'MONTHLY', 'AT_YEAR_START', 'PRO_RATA');
  END IF;
END
$$;

-- ======================
-- Numeric precision alignment
-- ======================
ALTER TABLE "Material"
  ALTER COLUMN "price" TYPE NUMERIC(65, 30)
  USING "price"::NUMERIC(65, 30);

ALTER TABLE IF EXISTS "OperationSheetItem"
  ALTER COLUMN "quantity" TYPE NUMERIC(10, 2)
    USING "quantity"::NUMERIC(10, 2),
  ALTER COLUMN "unitPrice" TYPE NUMERIC(10, 2)
    USING "unitPrice"::NUMERIC(10, 2);


DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RoundingMethod') THEN
    CREATE TYPE "RoundingMethod" AS ENUM ('FLOOR', 'CEIL', 'ROUND');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeaveStatus') THEN
    CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SheetItemType') THEN
    CREATE TYPE "SheetItemType" AS ENUM ('MATERIAL', 'CONSUMABLE', 'EQUIPMENT', 'LABOR');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReceptionType') THEN
    CREATE TYPE "ReceptionType" AS ENUM ('SANTIER', 'MAGAZIE');
  END IF;
END
$$;

-- ======================
-- Leave policy tables
-- ======================

CREATE TABLE IF NOT EXISTS "LeavePolicy" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "isCompanyDefault" BOOLEAN NOT NULL DEFAULT false,
  "companyId" TEXT,
  "baseAnnualDays" INTEGER NOT NULL DEFAULT 21,
  "seniorityStepYears" INTEGER NOT NULL DEFAULT 5,
  "bonusPerStep" INTEGER NOT NULL DEFAULT 1,
  "accrualMethod" "AccrualMethod" NOT NULL DEFAULT 'PRO_RATA',
  "roundingMethod" "RoundingMethod" NOT NULL DEFAULT 'FLOOR',
  "allowCarryover" BOOLEAN NOT NULL DEFAULT true,
  "maxCarryoverDays" INTEGER,
  "carryoverExpiryMonth" INTEGER,
  "carryoverExpiryDay" INTEGER,
  "maxNegativeBalance" INTEGER NOT NULL DEFAULT 0,
  "maxConsecutiveDays" INTEGER,
  "minNoticeDays" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeavePolicy_pkey" ON "LeavePolicy"("id");
CREATE UNIQUE INDEX IF NOT EXISTS "LeavePolicy_companyId_isCompanyDefault_key"
  ON "LeavePolicy"("companyId", "isCompanyDefault");
CREATE INDEX IF NOT EXISTS "LeavePolicy_companyId_active_idx"
  ON "LeavePolicy"("companyId", "active");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'LeavePolicy_companyId_fkey'
  ) THEN
    ALTER TABLE "LeavePolicy"
      ADD CONSTRAINT "LeavePolicy_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "EmployeePolicyOverride" (
  "id" TEXT PRIMARY KEY,
  "employeeId" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "baseAnnualDays" INTEGER,
  "seniorityStepYears" INTEGER,
  "bonusPerStep" INTEGER,
  "accrualMethod" "AccrualMethod",
  "roundingMethod" "RoundingMethod",
  "allowCarryover" BOOLEAN,
  "maxCarryoverDays" INTEGER,
  "maxNegativeBalance" INTEGER,
  "maxConsecutiveDays" INTEGER,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmployeePolicyOverride_pkey" ON "EmployeePolicyOverride"("id");
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeePolicyOverride_employeeId_key" ON "EmployeePolicyOverride"("employeeId");
CREATE INDEX IF NOT EXISTS "EmployeePolicyOverride_employeeId_idx" ON "EmployeePolicyOverride"("employeeId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'EmployeePolicyOverride_employeeId_fkey'
  ) THEN
    ALTER TABLE "EmployeePolicyOverride"
      ADD CONSTRAINT "EmployeePolicyOverride_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"("id")
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'EmployeePolicyOverride_policyId_fkey'
  ) THEN
    ALTER TABLE "EmployeePolicyOverride"
      ADD CONSTRAINT "EmployeePolicyOverride_policyId_fkey"
      FOREIGN KEY ("policyId") REFERENCES "LeavePolicy"("id")
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "BlackoutPeriod" (
  "id" TEXT PRIMARY KEY,
  "policyId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "allowExceptions" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlackoutPeriod_pkey" ON "BlackoutPeriod"("id");
CREATE INDEX IF NOT EXISTS "BlackoutPeriod_policyId_startDate_endDate_idx"
  ON "BlackoutPeriod"("policyId", "startDate", "endDate");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'BlackoutPeriod_policyId_fkey'
  ) THEN
    ALTER TABLE "BlackoutPeriod"
      ADD CONSTRAINT "BlackoutPeriod_policyId_fkey"
      FOREIGN KEY ("policyId") REFERENCES "LeavePolicy"("id")
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "CompanyShutdown" (
  "id" TEXT PRIMARY KEY,
  "policyId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "days" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "deductFromAllowance" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "CompanyShutdown_pkey" ON "CompanyShutdown"("id");
CREATE INDEX IF NOT EXISTS "CompanyShutdown_policyId_startDate_idx"
  ON "CompanyShutdown"("policyId", "startDate");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'CompanyShutdown_policyId_fkey'
  ) THEN
    ALTER TABLE "CompanyShutdown"
      ADD CONSTRAINT "CompanyShutdown_policyId_fkey"
      FOREIGN KEY ("policyId") REFERENCES "LeavePolicy"("id")
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END
$$;

-- Extend Leave table with policy fields
ALTER TABLE "Leave"
  ADD COLUMN IF NOT EXISTS "status" "LeaveStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN IF NOT EXISTS "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "isCompanyShutdown" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "shutdownId" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Leave_employeeId_startDate_idx"
  ON "Leave"("employeeId", "startDate");
CREATE INDEX IF NOT EXISTS "Leave_status_idx"
  ON "Leave"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'Leave_shutdownId_fkey'
  ) THEN
    ALTER TABLE "Leave"
      ADD CONSTRAINT "Leave_shutdownId_fkey"
      FOREIGN KEY ("shutdownId") REFERENCES "CompanyShutdown"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END
$$;

-- Seed a default leave policy if the table is empty
INSERT INTO "LeavePolicy" (
  "id", "name", "isCompanyDefault", "baseAnnualDays", "seniorityStepYears",
  "bonusPerStep", "accrualMethod", "roundingMethod", "allowCarryover",
  "maxCarryoverDays", "carryoverExpiryMonth", "carryoverExpiryDay",
  "maxNegativeBalance", "maxConsecutiveDays", "minNoticeDays",
  "active", "updatedAt"
)
SELECT
  gen_random_uuid(),
  'Default Company Policy',
  true,
  21,
  5,
  1,
  'PRO_RATA',
  'FLOOR',
  true,
  5,
  3,
  31,
  0,
  10,
  14,
  true,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "LeavePolicy");

-- ======================
-- Reception registry
-- ======================
CREATE TABLE IF NOT EXISTS "Reception" (
  "id" TEXT PRIMARY KEY,
  "date" TIMESTAMP(3) NOT NULL,
  "invoice" TEXT NOT NULL,
  "supplier" TEXT NOT NULL,
  "manufacturer" TEXT NOT NULL,
  "material" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL,
  "orderId" TEXT,
  "receptionType" "ReceptionType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "Reception_pkey" ON "Reception"("id");
CREATE INDEX IF NOT EXISTS "Reception_date_idx" ON "Reception"("date");
CREATE INDEX IF NOT EXISTS "Reception_supplier_idx" ON "Reception"("supplier");
CREATE INDEX IF NOT EXISTS "Reception_receptionType_idx" ON "Reception"("receptionType");

-- ======================
-- Equipment catalog enhancements
-- ======================
ALTER TABLE "Equipment"
  ADD COLUMN IF NOT EXISTS "status" TEXT,
  ADD COLUMN IF NOT EXISTS "serialNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "lastRepairDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "repairCost" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "repairCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "warranty" TEXT,
  ADD COLUMN IF NOT EXISTS "equipmentNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "generation" TEXT,
  ADD COLUMN IF NOT EXISTS "purchasePrice" DOUBLE PRECISION;

UPDATE "Equipment"
SET "status" = 'Activ'
WHERE "status" IS NULL;

ALTER TABLE "Equipment"
  ALTER COLUMN "status" SET DEFAULT 'Activ',
  ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "Equipment"
  ALTER COLUMN "lastRepairDate" TYPE TIMESTAMP(3)
    USING "lastRepairDate"::TIMESTAMP(3);

-- ======================
-- Project deviz material enhancements
-- ======================
ALTER TABLE "ProjectDevizMaterial"
  ADD COLUMN IF NOT EXISTS "supplier" TEXT,
  ADD COLUMN IF NOT EXISTS "packageSize" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "packageUnit" TEXT;

CREATE INDEX IF NOT EXISTS "idx_project_deviz_material_supplier"
  ON "ProjectDevizMaterial"("supplier");

-- ======================
-- Project sheet operation enhancements
-- ======================
ALTER TABLE "ProjectSheetOperation"
  ADD COLUMN IF NOT EXISTS "operationItemId" TEXT;

CREATE INDEX IF NOT EXISTS "ProjectSheetOperation_operationItemId_idx"
  ON "ProjectSheetOperation"("operationItemId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'ProjectSheetOperation_operationItemId_fkey'
  ) THEN
    ALTER TABLE "ProjectSheetOperation"
      ADD CONSTRAINT "ProjectSheetOperation_operationItemId_fkey"
      FOREIGN KEY ("operationItemId") REFERENCES "OperationItem"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END
$$;

-- ======================
-- Operation sheet system
-- ======================
CREATE TABLE IF NOT EXISTS "OperationSheetTemplate" (
  "id" TEXT PRIMARY KEY,
  "operationItemId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "OperationSheetTemplate_pkey" ON "OperationSheetTemplate"("id");
CREATE UNIQUE INDEX IF NOT EXISTS "OperationSheetTemplate_operationItemId_name_key"
  ON "OperationSheetTemplate"("operationItemId", "name");
CREATE INDEX IF NOT EXISTS "OperationSheetTemplate_operationItemId_idx"
  ON "OperationSheetTemplate"("operationItemId");
CREATE INDEX IF NOT EXISTS "OperationSheetTemplate_isDefault_idx"
  ON "OperationSheetTemplate"("isDefault");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'OperationSheetTemplate_operationItemId_fkey'
  ) THEN
    ALTER TABLE "OperationSheetTemplate"
      ADD CONSTRAINT "OperationSheetTemplate_operationItemId_fkey"
      FOREIGN KEY ("operationItemId") REFERENCES "OperationItem"("id")
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "ProjectOperationSheet" (
  "id" TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "templateId" TEXT,
  "templateVersion" INTEGER,
  "name" TEXT,
  "description" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectOperationSheet_pkey" ON "ProjectOperationSheet"("id");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectOperationSheet_projectId_operationId_key"
  ON "ProjectOperationSheet"("projectId", "operationId");
CREATE INDEX IF NOT EXISTS "ProjectOperationSheet_projectId_idx"
  ON "ProjectOperationSheet"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectOperationSheet_operationId_idx"
  ON "ProjectOperationSheet"("operationId");
CREATE INDEX IF NOT EXISTS "ProjectOperationSheet_templateId_idx"
  ON "ProjectOperationSheet"("templateId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'ProjectOperationSheet_projectId_fkey'
  ) THEN
    ALTER TABLE "ProjectOperationSheet"
      ADD CONSTRAINT "ProjectOperationSheet_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'ProjectOperationSheet_templateId_fkey'
  ) THEN
    ALTER TABLE "ProjectOperationSheet"
      ADD CONSTRAINT "ProjectOperationSheet_templateId_fkey"
      FOREIGN KEY ("templateId") REFERENCES "OperationSheetTemplate"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "OperationSheetItem" (
  "id" TEXT PRIMARY KEY,
  "templateId" TEXT,
  "projectSheetId" TEXT,
  "itemType" "SheetItemType" NOT NULL,
  "referenceId" TEXT,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "quantity" NUMERIC NOT NULL DEFAULT 1,
  "unitPrice" NUMERIC NOT NULL DEFAULT 0,
  "notes" TEXT,
  "addedBy" TEXT,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "OperationSheetItem_pkey" ON "OperationSheetItem"("id");
CREATE INDEX IF NOT EXISTS "OperationSheetItem_templateId_idx"
  ON "OperationSheetItem"("templateId");
CREATE INDEX IF NOT EXISTS "OperationSheetItem_projectSheetId_idx"
  ON "OperationSheetItem"("projectSheetId");
CREATE INDEX IF NOT EXISTS "OperationSheetItem_itemType_idx"
  ON "OperationSheetItem"("itemType");
CREATE INDEX IF NOT EXISTS "OperationSheetItem_referenceId_idx"
  ON "OperationSheetItem"("referenceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'OperationSheetItem_templateId_fkey'
  ) THEN
    ALTER TABLE "OperationSheetItem"
      ADD CONSTRAINT "OperationSheetItem_templateId_fkey"
      FOREIGN KEY ("templateId") REFERENCES "OperationSheetTemplate"("id")
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'OperationSheetItem_projectSheetId_fkey'
  ) THEN
    ALTER TABLE "OperationSheetItem"
      ADD CONSTRAINT "OperationSheetItem_projectSheetId_fkey"
      FOREIGN KEY ("projectSheetId") REFERENCES "ProjectOperationSheet"("id")
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "OperationSheetModification" (
  "id" TEXT PRIMARY KEY,
  "projectSheetId" TEXT NOT NULL,
  "userId" TEXT,
  "userName" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "action" TEXT NOT NULL,
  "itemType" "SheetItemType",
  "itemId" TEXT,
  "itemDescription" TEXT,
  "oldValue" JSONB,
  "newValue" JSONB,
  "deviationFromTemplate" BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX IF NOT EXISTS "OperationSheetModification_pkey" ON "OperationSheetModification"("id");
CREATE INDEX IF NOT EXISTS "OperationSheetModification_projectSheetId_idx"
  ON "OperationSheetModification"("projectSheetId");
CREATE INDEX IF NOT EXISTS "OperationSheetModification_timestamp_idx"
  ON "OperationSheetModification"("timestamp");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'OperationSheetModification_projectSheetId_fkey'
  ) THEN
    ALTER TABLE "OperationSheetModification"
      ADD CONSTRAINT "OperationSheetModification_projectSheetId_fkey"
      FOREIGN KEY ("projectSheetId") REFERENCES "ProjectOperationSheet"("id")
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
END
$$;
