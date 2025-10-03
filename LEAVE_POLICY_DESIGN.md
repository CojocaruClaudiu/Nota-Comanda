# Leave Policy System - Design Document

## 📋 Overview

This document outlines the comprehensive leave policy system with:
- Company-wide and per-employee policy overrides
- Advanced accrual methods (daily, monthly, at year start)
- Carryover rules with expiry dates
- Blackout periods (project deadlines, inventory, etc.)
- Forced company shutdowns (December holidays)
- Negative balance control
- Maximum consecutive days

---

## 🗄️ Database Schema Changes

### 1. LeavePolicy Model

```prisma
model LeavePolicy {
  id                    String              @id @default(uuid())
  name                  String              // "Default Company Policy", "Manager Override", etc.
  isCompanyDefault      Boolean             @default(false) // One policy per company is default
  companyId             String?             // null = system-wide template
  
  // Base entitlement
  baseAnnualDays        Int                 @default(21)
  seniorityStepYears    Int                 @default(5)     // +1 day every X years
  bonusPerStep          Int                 @default(1)     // +N days per step
  
  // Accrual method
  accrualMethod         AccrualMethod       @default(DAILY)
  roundingMethod        RoundingMethod      @default(FLOOR)
  
  // Carryover rules
  allowCarryover        Boolean             @default(true)
  maxCarryoverDays      Int?                // null = unlimited
  carryoverExpiryMonth  Int?                // 1-12 (e.g., 3 = March 31)
  carryoverExpiryDay    Int?                // 1-31
  
  // Borrowing/Negative balance
  maxNegativeBalance    Int                 @default(0)     // 0 = no borrowing
  
  // Constraints
  maxConsecutiveDays    Int?                // null = unlimited (e.g., 10 days max)
  minNoticedays         Int?                // days before leave start
  
  // Metadata
  active                Boolean             @default(true)
  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
  
  // Relations
  company               Company?            @relation(fields: [companyId], references: [id])
  employeeOverrides     EmployeePolicyOverride[]
  blackoutPeriods       BlackoutPeriod[]
  companyShutdowns      CompanyShutdown[]
  
  @@unique([companyId, isCompanyDefault]) // Only one default per company
  @@index([companyId, active])
}

enum AccrualMethod {
  DAILY          // Accrues daily (21/365 per day)
  MONTHLY        // Accrues monthly (21/12 per month on 1st)
  AT_YEAR_START  // Full entitlement on Jan 1
  PRO_RATA       // Pro-rata based on hire date (current implementation)
}

enum RoundingMethod {
  FLOOR   // Conservative (always round down)
  CEIL    // Liberal (always round up)
  ROUND   // Math.round (nearest integer)
}

### 2. Employee Policy Override

```prisma
model EmployeePolicyOverride {
  id                    String         @id @default(uuid())
  employeeId            String         @unique // One override per employee
  policyId              String         // Reference to base policy
  
  // Override fields (null = use policy default)
  baseAnnualDays        Int?
  seniorityStepYears    Int?
  bonusPerStep          Int?
  accrualMethod         AccrualMethod?
  roundingMethod        RoundingMethod?
  allowCarryover        Boolean?
  maxCarryoverDays      Int?
  maxNegativeBalance    Int?
  maxConsecutiveDays    Int?
  
  reason                String?        // "Negotiated in contract", "Special accommodation", etc.
  
  createdAt             DateTime       @default(now())
  updatedAt             DateTime       @updatedAt
  
  employee              Employee       @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  policy                LeavePolicy    @relation(fields: [policyId], references: [id])
  
  @@index([employeeId])
}
```

### 3. Blackout Periods

```prisma
model BlackoutPeriod {
  id          String       @id @default(uuid())
  policyId    String
  startDate   DateTime
  endDate     DateTime
  reason      String       // "Year-end inventory", "Project deadline", "Peak season"
  allowExceptions Boolean  @default(false) // Manager can approve exceptions
  
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  policy      LeavePolicy  @relation(fields: [policyId], references: [id], onDelete: Cascade)
  
  @@index([policyId, startDate, endDate])
}
```

### 4. Company Shutdowns (Forced Leave)

```prisma
model CompanyShutdown {
  id          String       @id @default(uuid())
  policyId    String
  startDate   DateTime
  endDate     DateTime
  days        Int          // Calculated workdays
  reason      String       // "December holidays", "Summer closure"
  deductFromAllowance Boolean @default(true) // true = counts against employee allowance
  
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  policy      LeavePolicy  @relation(fields: [policyId], references: [id], onDelete: Cascade)
  
  @@index([policyId, startDate])
}
```

### 5. Enhanced Leave Model

```prisma
model Leave {
  id               String       @id @default(uuid())
  employeeId       String
  startDate        DateTime
  endDate          DateTime?
  days             Int
  note             String?
  
  // New fields
  status           LeaveStatus  @default(APPROVED)  // Future: add approval workflow
  requestedAt      DateTime     @default(now())
  approvedBy       String?
  approvedAt       DateTime?
  cancelledAt      DateTime?
  cancellationReason String?
  
  // Shutdown tracking
  isCompanyShutdown Boolean     @default(false)
  shutdownId        String?
  
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  
  employee         Employee     @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  shutdown         CompanyShutdown? @relation(fields: [shutdownId], references: [id])
  
  @@index([employeeId, startDate])
  @@index([status])
}

enum LeaveStatus {
  PENDING      // Awaiting approval
  APPROVED     // Approved and scheduled
  REJECTED     // Rejected by manager
  CANCELLED    // Cancelled by employee/manager
  COMPLETED    // Leave period has passed
}
```

---

## 💼 Business Logic

### Calculation Flow

```typescript
function calculateLeaveBalance(
  employee: Employee,
  policy: LeavePolicy,
  override?: EmployeePolicyOverride,
  asOf: Date = new Date()
): LeaveBalance {
  
  // 1. Get effective policy (merge override if exists)
  const effectivePolicy = mergePolicy(policy, override);
  
  // 2. Calculate base entitlement with seniority bonus
  const tenure = calculateTenure(employee.hiredAt, asOf);
  const seniorityBonus = Math.floor(tenure.years / effectivePolicy.seniorityStepYears) 
                         * effectivePolicy.bonusPerStep;
  const annualEntitlement = effectivePolicy.baseAnnualDays + seniorityBonus;
  
  // 3. Apply accrual method
  const accrued = calculateAccrued(employee.hiredAt, annualEntitlement, effectivePolicy.accrualMethod, asOf);
  
  // 4. Apply rounding
  const rounded = applyRounding(accrued, effectivePolicy.roundingMethod);
  
  // 5. Get taken days (excluding company shutdowns if not deducted)
  const taken = getTakenDays(employee.id, asOf.getFullYear());
  
  // 6. Calculate carryover from previous year
  const carryover = calculateCarryover(employee.id, asOf.getFullYear(), effectivePolicy);
  
  // 7. Calculate available balance
  const available = rounded + carryover - taken;
  
  // 8. Check against negative balance limit
  const canBorrow = available < 0 && Math.abs(available) <= effectivePolicy.maxNegativeBalance;
  
  return {
    annualEntitlement,
    accrued: rounded,
    carriedOver: carryover,
    taken,
    available,
    canBorrow,
    effectiveBalance: Math.max(available, -effectivePolicy.maxNegativeBalance)
  };
}
```

### Carryover Logic

```typescript
function calculateCarryover(
  employeeId: string,
  currentYear: number,
  policy: LeavePolicy
): number {
  if (!policy.allowCarryover) return 0;
  
  const previousYear = currentYear - 1;
  const previousBalance = getYearEndBalance(employeeId, previousYear);
  
  if (previousBalance <= 0) return 0;
  
  // Apply max carryover limit
  const carryover = policy.maxCarryoverDays 
    ? Math.min(previousBalance, policy.maxCarryoverDays)
    : previousBalance;
  
  // Check if carryover has expired
  if (policy.carryoverExpiryMonth && policy.carryoverExpiryDay) {
    const expiryDate = new Date(currentYear, policy.carryoverExpiryMonth - 1, policy.carryoverExpiryDay);
    if (new Date() > expiryDate) return 0;
  }
  
  return carryover;
}
```

### Blackout Period Validation

```typescript
function validateLeaveRequest(
  employeeId: string,
  startDate: Date,
  endDate: Date,
  policy: LeavePolicy
): ValidationResult {
  const errors: string[] = [];
  
  // Check blackout periods
  const blackouts = getActiveBlackouts(policy.id, startDate, endDate);
  if (blackouts.length > 0 && !blackouts.every(b => b.allowExceptions)) {
    errors.push(`Leave overlaps with blackout period: ${blackouts[0].reason}`);
  }
  
  // Check company shutdowns (info only, not blocking)
  const shutdowns = getCompanyShutdowns(policy.id, startDate, endDate);
  const warnings = shutdowns.map(s => `Company shutdown: ${s.reason}`);
  
  // Check max consecutive days
  if (policy.maxConsecutiveDays) {
    const days = calculateWorkdays(startDate, endDate);
    if (days > policy.maxConsecutiveDays) {
      errors.push(`Maximum ${policy.maxConsecutiveDays} consecutive days allowed`);
    }
  }
  
  // Check minimum notice
  if (policy.minNoticeDays) {
    const daysUntil = differenceInDays(startDate, new Date());
    if (daysUntil < policy.minNoticeDays) {
      errors.push(`Minimum ${policy.minNoticeDays} days notice required`);
    }
  }
  
  // Check balance
  const balance = calculateLeaveBalance(employee, policy);
  const requestedDays = calculateWorkdays(startDate, endDate);
  if (requestedDays > balance.effectiveBalance) {
    errors.push(`Insufficient balance: ${balance.effectiveBalance} days available`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

---

## 📊 Simplified Table Columns

### Current (Redundant):
- Drept/an (Annual Entitlement)
- Drept 2025 (Year Entitlement - pro-rata)
- Acumulat azi (Accrued Today)
- Folosite (Taken)
- Rămase azi (Remaining Today)

### **Proposed (Clean):**

| Column | Description | Calculation |
|--------|-------------|-------------|
| **Drept Total** | Full entitlement (base + seniority) | 21 + Math.floor(years/5) |
| **Acumulat** | Available to use today | Pro-rata accrued + carryover |
| **Folosit** | Days taken this year | Sum of approved leaves |
| **Disponibil** | Days remaining | Accrued + carryover - taken |
| **Report** | Carried from last year | Previous year surplus (max 5) |

**Detail Panel (expandable):**
- Drept anual complet: 23 zile
- Acumulat până azi: 15 zile
- Report din 2024: 3 zile (expiră 31 Mar)
- Folosit în 2025: 8 zile
- **Disponibil total: 10 zile**
- Sold minim permis: -2 zile (poate împrumuta)

---

## 🎯 Implementation Priority

### Phase 1: Database & Core Logic (Week 1)
- ✅ Add LeavePolicy, BlackoutPeriod, CompanyShutdown models
- ✅ Migration script
- ✅ Core calculation functions
- ✅ API endpoints for policy CRUD

### Phase 2: UI Integration (Week 2)
- ✅ Policy management page
- ✅ Updated leave calculation hook
- ✅ Simplified table columns
- ✅ Enhanced detail panel

### Phase 3: Advanced Features (Week 3)
- ✅ Blackout period management
- ✅ Company shutdown scheduling
- ✅ Leave request validation
- ✅ Carryover tracking

---

## 📝 Migration Notes

### Default Policy Creation

```typescript
// After migration, seed default policy
await prisma.leavePolicy.create({
  data: {
    name: "Default Company Policy",
    isCompanyDefault: true,
    baseAnnualDays: 21,
    seniorityStepYears: 5,
    bonusPerStep: 1,
    accrualMethod: "PRO_RATA",
    roundingMethod: "FLOOR",
    allowCarryover: true,
    maxCarryoverDays: 5,
    carryoverExpiryMonth: 3,  // March
    carryoverExpiryDay: 31,
    maxNegativeBalance: 0,
    maxConsecutiveDays: 10,
    minNoticeDays: 14,
  }
});
```

---

## 🔄 Backwards Compatibility

- Existing `Leave` records remain unchanged
- Default policy applies to all employees automatically
- Gradual migration: can run old and new calculations side-by-side
- No breaking changes to current UI

---

Next steps: Should I implement this system?
