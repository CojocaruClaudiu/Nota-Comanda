# Employee Deactivation & PTO Tracking Enhancement

**Date:** February 6, 2026  
**Status:** ✅ Complete

## 📋 Overview

Enhanced the employee management system to properly handle two critical edge cases:
1. **Tracking untaken PTO when employees leave** (for payout calculation)
2. **Handling employee rehiring** (reactivation with proper leave balance management)

## 🎯 Key Features

### 1. PTO Balance at Deactivation
- **Automatic Calculation**: When an employee is deactivated, the system automatically calculates and stores their final leave balance
- **Payout Tracking**: The `finalLeaveBalance` field preserves the exact number of unused PTO days that must be paid out
- **Legal Compliance**: Displays warning that unused days must be paid per labor law

### 2. Deactivation Confirmation Dialog
When marking an employee as inactive, the system shows:
- ⚠️ Number of unused PTO days that require payout
- 📋 What happens to the employee record (frozen calculations, preserved history)
- ℹ️ Note about reactivation possibility

### 3. Reactivation Confirmation Dialog  
When rehiring/reactivating an employee, the system shows:
- ↩️ What happens to leave calculations (restart from reactivation date)
- 📅 Recommendation to update "Hired Date" if it's a new contract
- ⚙️ How leave balances are recalculated

### 4. Visual Indicators

#### Inactive Employee Highlighting
- Gray background (subtle `rgba(0, 0, 0, 0.04)`)
- Reduced opacity (70%)
- Darker hover effect for better UX
- "Inactiv" chip in name column

#### Final Balance Display
For inactive employees with stored final balance:
- Shows final PTO balance at departure
- Displays deactivation date
- Warning icon if balance > 0 (requires payout)
- Clear label "(la plecare)" = "(at departure)"

## 🗄️ Database Changes

### Schema Update
```prisma
model Employee {
  // ... existing fields
  deactivatedAt     DateTime? // Date when employee left/became inactive
  finalLeaveBalance Float?    // Final leave balance at deactivation (for payout)
}
```

### Migration Required
Run: `npx prisma db push` or `npx prisma migrate dev --name add-final-leave-balance`

## 🔧 Technical Implementation

### Backend (`backend/src/index.ts`)
- Enhanced `PUT /employees/:id` endpoint
- Calculates `finalLeaveBalance` when `deactivatedAt` is set
- Clears both fields when reactivating (setting to `null`)
- Uses `calculateLeaveBalance` service with deactivation date

### Frontend Changes

#### `EditEmployeeModal.tsx`
- Added confirmation dialogs for status changes
- Integrated with `useConfirm` hook
- Calculates remaining leave for display
- Shows different dialogs for deactivation vs reactivation

#### `teamPage.improved.tsx`
- Added row styling for inactive employees
- Enhanced leave column to show final balance for inactive employees
- Special tooltip for departed employees showing payout info

#### `employees.ts` (API types)
- Added `finalLeaveBalance?: number | null` to Employee type
- Added `deactivatedAt?: string | null` to Employee type

## 📊 User Experience Flow

### Deactivating an Employee
1. User toggles "Activ/Inactiv" switch
2. System shows confirmation dialog with:
   - Unused PTO days count
   - Payout requirement warning
   - Explanation of what happens
3. On confirmation:
   - Sets `isActive = false`
   - Sets `deactivatedAt = now()`
   - Calculates and stores `finalLeaveBalance`
4. Employee appears grayed out in list
5. Leave column shows final balance with payout warning

### Reactivating an Employee
1. User toggles "Inactiv/Activ" switch
2. System shows reactivation confirmation with:
   - Explanation of leave recalculation
   - Recommendation to update hire date if new contract
3. On confirmation:
   - Sets `isActive = true`
   - Clears `deactivatedAt` (null)
   - Clears `finalLeaveBalance` (null)
4. Employee returns to normal appearance
5. Leave calculations resume from current date

## 🎨 Visual Changes

### Inactive Employees
```typescript
muiTableBodyRowProps={({ row }) => ({
  sx: {
    backgroundColor: row.original.isActive === false 
      ? 'rgba(0, 0, 0, 0.04)' 
      : 'inherit',
    opacity: row.original.isActive === false ? 0.7 : 1,
    '&:hover': {
      backgroundColor: row.original.isActive === false
        ? 'rgba(0, 0, 0, 0.08) !important'
        : undefined,
    },
  },
})}
```

### Final Balance Display
- Chip with warning icon if balance > 0
- "(la plecare)" text label
- Tooltip with deactivation date and payout note

## ⚠️ Important Notes

1. **Legal Compliance**: Unused PTO must be paid out per Romanian labor law
2. **Data Preservation**: All history is preserved when deactivating
3. **Rehiring**: For new contracts, update the "Angajat din" (Hired Date) field
4. **Pro-rata Calculation**: Leave recalculation starts fresh from reactivation date
5. **Manual Carryover**: Consider using manual carryover if rehiring within same year

## 🧪 Testing Scenarios

### Test Case 1: Deactivate with Unused PTO
1. Select active employee with remaining PTO
2. Toggle to inactive
3. Verify confirmation shows correct balance
4. Confirm and check database for `finalLeaveBalance`
5. Verify display shows final balance in leave column

### Test Case 2: Deactivate with Zero PTO
1. Select active employee with 0 remaining PTO
2. Toggle to inactive
3. Confirm and verify `finalLeaveBalance` = 0
4. Verify display shows "0 zile (la plecare)"

### Test Case 3: Reactivate Employee
1. Select inactive employee
2. Toggle to active
3. Read reactivation instructions
4. Confirm and verify `deactivatedAt` and `finalLeaveBalance` are cleared
5. Verify leave calculations resume

### Test Case 4: Rehire with New Contract
1. Reactivate employee
2. Update "Angajat din" field to new hire date
3. Save and verify pro-rata calculations use new date

## 📝 Usage Guidelines

### For HR/Admin Users

**When an employee leaves:**
1. Mark as inactive (toggle switch)
2. Note the final PTO balance shown (for payroll)
3. Process payout according to company policy
4. Keep record for reference

**When rehiring:**
1. Reactivate the employee
2. **Important**: Update "Angajat din" if it's a new contract
3. Review and adjust leave entitlements if needed
4. Consider manual carryover for special cases

## 🔄 Migration Path

```bash
cd backend
npx prisma db push
# or for production:
npx prisma migrate dev --name add-final-leave-balance
```

No data loss - new fields are nullable and optional.

## ✅ Checklist

- [x] Database schema updated
- [x] Backend endpoint enhanced
- [x] Frontend types updated
- [x] Confirmation dialogs implemented
- [x] Visual highlighting added
- [x] Final balance display added
- [x] Documentation created
- [x] Edge cases handled (deactivate/reactivate)

## 🎉 Benefits

1. **Legal Compliance**: Proper tracking of PTO payouts
2. **Audit Trail**: Preserved final balances for reference
3. **User Clarity**: Clear dialogs explain what happens
4. **Flexibility**: Easy rehiring with proper leave handling
5. **Visual Feedback**: Inactive employees clearly distinguishable
6. **Data Integrity**: Frozen calculations at departure prevent drift
