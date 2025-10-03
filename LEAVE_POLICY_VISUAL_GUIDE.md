# Leave Policy System - Visual Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     LEAVE POLICY MANAGEMENT SYSTEM                       │
│                    http://localhost:5173/leave-policy                    │
│                         (Admin/Manager Only)                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  TAB 1:         │      │  TAB 2:         │      │  TAB 3:         │
│  Politică       │      │  Blackout       │      │  Închideri      │
│  Generală       │      │  Periods        │      │  Firmă          │
└─────────────────┘      └─────────────────┘      └─────────────────┘
│                        │                        │
│ • Base: 21 days       │ ⛔ Peak Seasons        │ ❄️ Christmas
│ • Seniority: +1/5yr   │ • Jul 1-15: Peak      │ • Dec 23-27: 5d
│ • Accrual: Pro-rata   │ • Dec 1-15: Invent    │ • Dec 30-Jan 2: 4d
│ • Carryover: Max 5    │ • Allow exceptions?   │ • Auto-deduct
│ • Expires: Mar 31     │ • Add/Edit/Delete     │ • Add/Edit/Delete
│ • Max consecutive: 10 │                        │
│ • Min notice: 14d     │                        │
└───────────────────────┴────────────────────────┴───────────────────┘
                                    │
                                    │ Policy applies to ↓
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          ENHANCED TEAM PAGE                              │
│                      http://localhost:5173/echipa                        │
│                            (All Users)                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  Name        CNP      Qualifications   Hired     Tenure   Leave Status   │
├──────────────────────────────────────────────────────────────────────────┤
│  ▼ Maria     2801...  Electrician     15.01.18  7y 3m    8/22  +3  🟡   │
│  ▼ Popescu                                                ████░░░░  36%  │
│                                                                           │
│  ▼ EXPANDED DETAIL PANEL ▼                                               │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Maria Popescu                                                      │ │
│  ├────────────────────────────────────────────────────────────────────┤ │
│  │                                                                     │ │
│  │  ┌───────────────────┐  ┌───────────────────────────────────────┐ │ │
│  │  │ 📈 Vechime        │  │ 🏖️ Drept Concediu Anual             │ │ │
│  │  │ • 7 ani, 3 luni   │  │ • Drept/an: 22 zile                 │ │ │
│  │  │ • Angajat: 15.01  │  │ • Drept 2025: 22 zile               │ │ │
│  │  │ • Vârstă: 34 ani  │  │ • Acumulat azi: 22 zile             │ │ │
│  │  └───────────────────┘  └───────────────────────────────────────┘ │ │
│  │                                                                     │ │
│  │  📊 Detalii Concediu                                               │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                          │ │
│  │  │  22  │  │  +3  │  │   8  │  │   9  │                          │ │
│  │  │ Acum │  │Report│  │  Vol │  │❄️Shut│                          │ │
│  │  │(blue)│  │(info)│  │(warn)│  │(info)│                          │ │
│  │  └──────┘  └──────┘  └──────┘  └──────┘                          │ │
│  │  Pro-rata  Expires   Personal  Christmas                           │ │
│  │            Mar 31    choice    + New Year                          │ │
│  │                                                                     │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │ Summary:                                                      │ │ │
│  │  │ • Total Used: 17 days                                        │ │ │
│  │  │ • Remaining Today: 8 days     🟢                             │ │ │
│  │  │ • Remaining Year-End: 8 days  🟢                             │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  │                                                                     │ │
│  │  ℹ️ Policy: 21 base + 1/5yr, Pro-rata, Max 5 carryover (exp 3/31) │ │
│  │  Shutdowns deduct automatically (Christmas + New Year = 9 days)   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ▶ John Doe   2005...  Sudor          01.07.25  0y 3m    0/11  ⚠️  🔴   │
│                                                           ░░░░░░░░   0%  │
└───────────────────────────────────────────────────────────────────────────┘

                                    │
                                    │ When requesting leave ↓
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     LEAVE REQUEST VALIDATION                             │
└─────────────────────────────────────────────────────────────────────────┘

Employee clicks "Adaugă Concediu" (Calendar icon) →

┌──────────────────────────────────────────────────────────────┐
│  Request Leave                                                │
├──────────────────────────────────────────────────────────────┤
│  Dates: Jul 10 - Jul 15                                      │
│                                                               │
│  ⛔ ERROR: Blackout Period Detected!                         │
│  "Sezon de vârf construcții"                                │
│  No exceptions allowed.                                       │
│  ❌ Request blocked                                          │
└──────────────────────────────────────────────────────────────┘

Employee tries: Dec 23 - Jan 2 →

┌──────────────────────────────────────────────────────────────┐
│  Request Leave                                                │
├──────────────────────────────────────────────────────────────┤
│  Dates: Dec 23 - Jan 2                                       │
│                                                               │
│  ❄️ INFO: Company Shutdown Overlap                          │
│  9 working days in this period are company shutdowns:        │
│  • Dec 23-27: Christmas (5 days)                             │
│  • Dec 30-Jan 2: New Year (4 days)                           │
│                                                               │
│  These will be automatically deducted.                        │
│  ✅ Request allowed (informational only)                     │
└──────────────────────────────────────────────────────────────┘

Employee tries: Aug 1 - Aug 20 →

┌──────────────────────────────────────────────────────────────┐
│  Request Leave                                                │
├──────────────────────────────────────────────────────────────┤
│  Dates: Aug 1 - Aug 20 (14 working days)                     │
│                                                               │
│  ⚠️ WARNING: Exceeds Limit                                   │
│  Maximum 10 consecutive days allowed.                         │
│  ❌ Request blocked                                          │
└──────────────────────────────────────────────────────────────┘

Employee tries: Aug 1 - Aug 10 (10 days, has 8 days balance) →

┌──────────────────────────────────────────────────────────────┐
│  Request Leave                                                │
├──────────────────────────────────────────────────────────────┤
│  Dates: Aug 1 - Aug 10 (7 working days)                      │
│                                                               │
│  ⚠️ ERROR: Insufficient Balance                              │
│  You have 8 days available, but requesting 10 days.          │
│  Negative balance not allowed.                                │
│  ❌ Request blocked                                          │
└──────────────────────────────────────────────────────────────┘

Employee tries: Jul 20 - Jul 25 (5 days, has 8 days balance) →

┌──────────────────────────────────────────────────────────────┐
│  Request Leave                                                │
├──────────────────────────────────────────────────────────────┤
│  Dates: Jul 20 - Jul 25 (4 working days)                     │
│                                                               │
│  ✅ All validations passed:                                  │
│  • Not in blackout period                                     │
│  • No company shutdown conflict                               │
│  • Within consecutive day limit (4 ≤ 10)                     │
│  • Sufficient balance (4 ≤ 8)                                │
│  • Meets notice requirement (14+ days)                        │
│                                                               │
│  Status: Pending manager approval                             │
│  ✅ Request submitted                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
┌──────────────┐
│  DATABASE    │
│              │
│ • LeavePolicy│───────┐
│ • Blackout   │       │
│ • Shutdown   │       │
│ • Employee   │       │
│ • Leave      │       │
└──────────────┘       │
                       │
                       ▼
┌──────────────────────────────────┐
│  BACKEND (Express + Prisma)      │
│                                  │
│  leaveCalculations.ts:           │
│  • calculateLeaveBalance()       │
│    ├─ Annual entitlement (21+)  │
│    ├─ Pro-rata accrual          │
│    ├─ Carryover (max 5)         │
│    ├─ Taken (voluntary)         │
│    ├─ Company shutdowns         │
│    └─ Available                 │
│                                  │
│  • validateLeaveRequest()        │
│    ├─ Check blackouts           │
│    ├─ Check shutdowns           │
│    ├─ Check balance             │
│    ├─ Check consecutive         │
│    └─ Check notice              │
│                                  │
│  GET /employees:                 │
│  • Returns enhanced data with    │
│    leaveBalance breakdown        │
└──────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────┐
│  FRONTEND (React + MUI)          │
│                                  │
│  /leave-policy (Management)      │
│  • Policy configuration          │
│  • Blackout CRUD                 │
│  • Shutdown CRUD                 │
│                                  │
│  /echipa (Team View)             │
│  • Leave status column           │
│  • Detail breakdown panels       │
│  • Color-coded indicators        │
│  • Carryover warnings            │
│                                  │
│  AddLeaveModal (Request)         │
│  • Date picker                   │
│  • Validation display            │
│  • Blackout warnings             │
│  • Shutdown notifications        │
└──────────────────────────────────┘
```

---

## Color Coding System

```
Leave Status Indicators:

🟢 GREEN (>50% remaining)
   ████████████░░░░░░░░  60%
   Status: Healthy
   
🟡 YELLOW (20-50% remaining)
   ████████░░░░░░░░░░░░  35%
   Status: Moderate
   
🔴 RED (<20% remaining)
   ██░░░░░░░░░░░░░░░░░░  10%
   Status: Critical

Card Colors:

🔵 BLUE - Accrued Days (primary metric)
ℹ️ INFO BLUE - Carryover + Company Shutdowns
🟠 ORANGE - Voluntary Days Taken
🟡 YELLOW - Pending Approvals
⚠️ RED - Errors, Blackouts, Expiry
```

---

## Icon Legend

```
⛔ EventBusy     - Blackout Periods
❄️ AcUnit        - Company Shutdowns (Christmas/New Year)
⚠️ Warning       - Pending Approvals, Low Balance
✅ CheckCircle   - Confirmed, Available
📊 TrendingUp    - Tenure, Seniority
🏖️ BeachAccess   - Leave Entitlement
📈 Timeline      - Accrual, Progress
🎯 Settings      - Policy Configuration
📅 Calendar      - Leave Requests
🔔 Notification  - Alerts, Reminders
```

---

## Summary

**3 Main Components:**

1. **Policy Management** (`/leave-policy`)
   - Configure rules
   - Manage blackouts
   - Schedule shutdowns

2. **Team View** (`/echipa`)
   - Visual status
   - Detailed breakdowns
   - Quick actions

3. **Validation System** (Backend + Frontend)
   - Real-time checking
   - Clear error messages
   - Automatic deductions

**User Experience:**
- Admin sets policy → 
- Employees see their balance → 
- Request leave → 
- System validates → 
- Manager approves → 
- Auto-deduct shutdowns → 
- Clear visibility

**Your December Use Case:**
✅ Solved! Company shutdowns automatically deduct 9 days from everyone
✅ Visible in breakdown as "Company Shutdown Days"
✅ Separate from "Voluntary Days"
✅ Easy to add future years via UI
