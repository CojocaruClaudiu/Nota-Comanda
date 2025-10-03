# ✅ Company Shutdowns Now Update Employee Table!

## 🎯 Problem Fixed

When adding, editing, or deleting a company shutdown (like Christmas break), the changes weren't reflected in the main employee table. Employees' `companyShutdownDays` count stayed the same until you manually refreshed the page.

---

## 🔧 Root Cause

The leave policy mutations (create/update/delete company shutdowns) were only invalidating the `leave-policy` React Query cache, but **not** the `employees` cache. This meant:

1. ✅ LeavePolicyPage would refresh (showing updated shutdowns)
2. ❌ TeamPage would NOT refresh (showing stale employee data)

---

## ✅ Solution Applied

Added employee query invalidation to all three company shutdown mutations:

### **Before:**
```typescript
export const useCreateCompanyShutdown = () => {
  return useMutation({
    mutationFn: ({ policyId, data }) => createCompanyShutdown(policyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAVE_POLICY_KEY });
      // ❌ Employee table doesn't refresh
      successNotistack('Închiderea firmei a fost adăugată cu succes');
    },
  });
};
```

### **After:**
```typescript
export const useCreateCompanyShutdown = () => {
  return useMutation({
    mutationFn: ({ policyId, data }) => createCompanyShutdown(policyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAVE_POLICY_KEY });
      queryClient.invalidateQueries({ queryKey: ['employees'] }); // ✅ Refresh employee table
      successNotistack('Închiderea firmei a fost adăugată cu succes');
    },
  });
};
```

---

## 📝 Updated Mutations

### **1. useCreateCompanyShutdown** ✅
- Invalidates: `leave-policy` + `employees`
- Triggers: When adding a new company shutdown (e.g., "Sărbători Crăciun 2025")

### **2. useUpdateCompanyShutdown** ✅
- Invalidates: `leave-policy` + `employees`
- Triggers: When editing a shutdown (changing dates, days, reason)

### **3. useDeleteCompanyShutdown** ✅
- Invalidates: `leave-policy` + `employees`
- Triggers: When removing a shutdown period

---

## 🎯 What Happens Now

### **Scenario: Add Christmas Shutdown (5 days, Dec 23-27)**

1. **User Action:** Opens LeavePolicyPage → Company Shutdowns tab → Clicks "Adaugă Închidere"
2. **Fills Form:**
   - Reason: "Sărbători Crăciun 2025"
   - Start: Dec 23, 2025
   - Days: 5
   - Deducts from leave: ✅ Yes
3. **Clicks Save**
4. **Backend:** Creates shutdown → Automatically deducts 5 days from all employees' leave balance
5. **Frontend (OLD):**
   - ✅ LeavePolicyPage refreshes
   - ❌ TeamPage shows stale data (old companyShutdownDays)
6. **Frontend (NEW):**
   - ✅ LeavePolicyPage refreshes
   - ✅ **TeamPage ALSO refreshes** → Shows updated `companyShutdownDays: 5`
   - ✅ Employee detail panel shows: "Zile închidere firmă: 5 (ex: Crăciun, Revelion)"
   - ✅ Leave balance recalculates automatically

---

## 🎨 Visual Impact

### **Employee Table - Leave Column:**
```
┌─────────────────────────────────────────┐
│ Concediu                                │
├─────────────────────────────────────────┤
│ 16/21 🎄+5 ████████████░░░░░░░          │  ← +5 chip appears
│                                         │
│ Hover tooltip shows:                    │
│ • Drept: 21 zile                       │
│ • Folosite: 5 zile                     │
│ • Rămase: 16 zile                      │
│ • Reportate: 0 zile                    │
│ • Închidere firmă: 5 zile 🎄          │  ← NEW INFO
└─────────────────────────────────────────┘
```

### **Employee Detail Panel (Expanded):**
```
┌─────────────────────────────────────────┐
│ Detalii Concediu                        │
├─────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│ │   21    │ │    5    │ │  🎄 5   │    │  ← Shows shutdown
│ │Acumulate│ │Personal │ │ Firmă   │    │
│ └─────────┘ └─────────┘ └─────────┘    │
│                                         │
│ (ex: Crăciun, Revelion) ← appears      │
└─────────────────────────────────────────┘
```

---

## 🔄 Data Flow

```
User adds shutdown in LeavePolicyPage
         ↓
createCompanyShutdown mutation
         ↓
Backend: POST /company-shutdowns
         ↓
Backend: Auto-deducts days from all employees
         ↓
onSuccess callback fires
         ↓
├─ invalidateQueries(['leave-policy'])
│  → LeavePolicyPage refetches → Shows new shutdown
│
└─ invalidateQueries(['employees'])  ← NEW!
   → TeamPage refetches → Shows updated companyShutdownDays
   → Detail panels update → Shows shutdown breakdown
```

---

## ✅ Benefits

1. **Instant Feedback:** See changes immediately without page refresh
2. **Data Consistency:** Both pages always show same data
3. **Better UX:** No confusion about whether changes took effect
4. **Automatic Recalculation:** Leave balances update in real-time

---

## 🎉 Result

**Now when you add/edit/delete a company shutdown:**
- ✅ LeavePolicyPage updates
- ✅ **TeamPage (main employee table) updates automatically**
- ✅ `companyShutdownDays` counter reflects changes
- ✅ Leave balance recalculates
- ✅ Detail panels show updated breakdown

**No manual refresh needed!** 🚀
