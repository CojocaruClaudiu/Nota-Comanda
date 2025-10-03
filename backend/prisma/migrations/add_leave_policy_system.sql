-- Add leave policy system
-- This migration adds comprehensive leave policy management

-- Create enums
CREATE TYPE "AccrualMethod" AS ENUM ('DAILY', 'MONTHLY', 'AT_YEAR_START', 'PRO_RATA');
CREATE TYPE "RoundingMethod" AS ENUM ('FLOOR', 'CEIL', 'ROUND');
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- LeavePolicy table
CREATE TABLE "LeavePolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isCompanyDefault" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT,
    
    -- Base entitlement
    "baseAnnualDays" INTEGER NOT NULL DEFAULT 21,
    "seniorityStepYears" INTEGER NOT NULL DEFAULT 5,
    "bonusPerStep" INTEGER NOT NULL DEFAULT 1,
    
    -- Accrual settings
    "accrualMethod" "AccrualMethod" NOT NULL DEFAULT 'PRO_RATA',
    "roundingMethod" "RoundingMethod" NOT NULL DEFAULT 'FLOOR',
    
    -- Carryover rules
    "allowCarryover" BOOLEAN NOT NULL DEFAULT true,
    "maxCarryoverDays" INTEGER,
    "carryoverExpiryMonth" INTEGER,
    "carryoverExpiryDay" INTEGER,
    
    -- Negative balance
    "maxNegativeBalance" INTEGER NOT NULL DEFAULT 0,
    
    -- Constraints
    "maxConsecutiveDays" INTEGER,
    "minNoticeDays" INTEGER,
    
    -- Metadata
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "LeavePolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Employee policy overrides
CREATE TABLE "EmployeePolicyOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL UNIQUE,
    "policyId" TEXT NOT NULL,
    
    -- Override fields (null = use policy default)
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "EmployeePolicyOverride_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmployeePolicyOverride_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "LeavePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Blackout periods (project deadlines, peak seasons, etc.)
CREATE TABLE "BlackoutPeriod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "allowExceptions" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "BlackoutPeriod_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "LeavePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Company shutdowns (December holidays, etc.)
CREATE TABLE "CompanyShutdown" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "policyId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "deductFromAllowance" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    
    CONSTRAINT "CompanyShutdown_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "LeavePolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Alter existing Leave table
ALTER TABLE "Leave" 
  ADD COLUMN "status" "LeaveStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "approvedBy" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancellationReason" TEXT,
  ADD COLUMN "isCompanyShutdown" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "shutdownId" TEXT,
  ADD CONSTRAINT "Leave_shutdownId_fkey" FOREIGN KEY ("shutdownId") REFERENCES "CompanyShutdown"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes
CREATE UNIQUE INDEX "LeavePolicy_companyId_isCompanyDefault_key" ON "LeavePolicy"("companyId", "isCompanyDefault") WHERE "isCompanyDefault" = true;
CREATE INDEX "LeavePolicy_companyId_active_idx" ON "LeavePolicy"("companyId", "active");
CREATE INDEX "EmployeePolicyOverride_employeeId_idx" ON "EmployeePolicyOverride"("employeeId");
CREATE INDEX "BlackoutPeriod_policyId_startDate_endDate_idx" ON "BlackoutPeriod"("policyId", "startDate", "endDate");
CREATE INDEX "CompanyShutdown_policyId_startDate_idx" ON "CompanyShutdown"("policyId", "startDate");
CREATE INDEX "Leave_employeeId_startDate_idx" ON "Leave"("employeeId", "startDate");
CREATE INDEX "Leave_status_idx" ON "Leave"("status");

-- Insert default company policy
INSERT INTO "LeavePolicy" (
  "id", 
  "name", 
  "isCompanyDefault", 
  "baseAnnualDays", 
  "seniorityStepYears", 
  "bonusPerStep",
  "accrualMethod",
  "roundingMethod",
  "allowCarryover",
  "maxCarryoverDays",
  "carryoverExpiryMonth",
  "carryoverExpiryDay",
  "maxNegativeBalance",
  "maxConsecutiveDays",
  "minNoticeDays",
  "active",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'Default Company Policy',
  true,
  21,    -- baseAnnualDays
  5,     -- seniorityStepYears
  1,     -- bonusPerStep
  'PRO_RATA',
  'FLOOR',
  true,  -- allowCarryover
  5,     -- maxCarryoverDays
  3,     -- March
  31,    -- 31st
  0,     -- no borrowing by default
  10,    -- max 10 consecutive days
  14,    -- 2 weeks notice
  true,
  CURRENT_TIMESTAMP
);
