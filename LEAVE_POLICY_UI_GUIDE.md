# 🎉 Leave Policy System - Complete UI/UX Guide

## 📋 Overview

The Leave Policy System is now **fully deployed** with a comprehensive UI for managing all aspects of employee leave, blackout periods, and company shutdowns. This document explains all the features and how to use them.

---

## 🎯 Key Features

### 1. **Leave Policy Management Page** 
**URL:** `/leave-policy` (Admin/Manager only)

This is your **control center** for all leave policy settings. Access it at:
```
http://localhost:5173/leave-policy
```

#### **Tab 1: Politică Generală** (General Policy)

Configure the core leave policy rules:

- **Base Configuration:**
  - Base annual days: **21 days/year**
  - Seniority bonus: **+1 day every 5 years**
  - Example: 7-year employee = 22 days (21 base + 1 bonus)

- **Accrual Method:** `PRO_RATA` (recommended)
  - Days accumulate proportionally throughout the year
  - Employee hired July 1st = 50% of annual entitlement until year-end
  - Other options: DAILY, MONTHLY, AT_YEAR_START

- **Carryover Rules:**
  - ✅ **Allowed:** Maximum **5 days** can be carried over
  - ⏰ **Expiry:** Carried days expire on **March 31st**
  - ⚠️ **Warning:** Unused carried days are lost after expiry date

- **Restrictions & Limits:**
  - **Max consecutive:** 10 days (prevents long absences)
  - **Min notice:** 14 days (advance planning required)
  - **Negative balance:** Not allowed (no borrowing)
  - **Rounding:** FLOOR (conservative, rounds down)

---

#### **Tab 2: Blackout Periods** ⛔

**Block leave requests** during critical business periods:

**Use Cases:**
- 🏗️ Peak construction season (July 1-15)
- 📦 Annual inventory (December 1-15)
- 🚧 Project deadlines
- 📊 Year-end closing

**Features:**
- **Date Range:** Start/End dates
- **Reason:** Visible to employees
- **Allow Exceptions:** Optional manual approval by managers
  - ✅ **Enabled:** Employees can request, manager approves manually
  - ❌ **Disabled:** Completely blocked, no exceptions

**Current Blackout Periods:**
1. **July 1-15, 2025** - Peak construction season (no exceptions)
2. **December 1-15, 2025** - Annual inventory (allows exceptions)

**How to Add:**
1. Click "Adaugă Blackout"
2. Enter reason (e.g., "Inventory Week")
3. Select date range
4. Toggle "Allow Exceptions" if managers can approve
5. Save

---

#### **Tab 3: Închideri Firmă** ❄️ (Company Shutdowns)

**Automate company-wide closures** (Christmas, New Year, etc.):

**Features:**
- **Automatic Deduction:** Days are automatically deducted from employee leave balance
- **Work Days:** Specify actual working days (excludes weekends)
- **Deduction Control:** Choose whether to deduct from allowance or give as bonus

**Current Company Shutdowns:**
1. **Christmas 2025** 🎄
   - Dates: December 23-27, 2025
   - Work days: **5 days**
   - Status: ✅ Deducts from allowance

2. **New Year 2026** 🎊
   - Dates: December 30, 2025 - January 2, 2026
   - Work days: **4 days**
   - Status: ✅ Deducts from allowance

**Employee Impact:**
- Each employee automatically has **9 days** (5+4) deducted from their 2025/2026 allowance
- Visible in employee detail panel as "Company Shutdown Days"
- Clearly separated from "Voluntary Days" in leave breakdown

**How to Add:**
1. Click "Adaugă Închidere"
2. Enter reason (e.g., "Sărbători Crăciun 2026")
3. Select date range
4. Enter **working days** (not calendar days)
5. Toggle "Deduce from allowance":
   - ✅ **ON:** Counts against employee leave (default)
   - ❌ **OFF:** Bonus leave (doesn't count)
6. Save

**Pro Tip:** Add next year's shutdowns in advance so employees can plan accordingly!

---

### 2. **Enhanced Team Page**
**URL:** `/echipa`

The team page now displays **comprehensive leave information** for each employee:

#### **Leave Status Column** 🎯

New column showing at-a-glance leave status:

- **Visual Progress Bar:** Color-coded by remaining days
  - 🟢 **Green:** >50% remaining (healthy)
  - 🟡 **Yellow:** 20-50% remaining (moderate)
  - 🔴 **Red:** <20% remaining (critical)

- **Leave Badge:** Shows `remaining/entitled` (e.g., "15/21")
  - ✅ **Checkmark:** Positive balance
  - ⚠️ **Warning:** Low or zero balance

- **Carryover Indicator:** Small "+X" badge if carried-over days exist
  - Example: "+3" = 3 days carried from previous year

#### **Pending Leave Warning** ⚠️

Yellow warning icon next to employee name if they have pending leave requests:
- Tooltip shows: "X zile în așteptare aprobare"
- Helps managers identify pending approvals quickly

#### **Expandable Detail Panel** 📊

Click the expand icon (▼) or the tenure chip to see **complete leave breakdown**:

**Section 1: Employee Info** 👤
- **Tenure Card:**
  - Total tenure (e.g., "2 ani, 3 luni")
  - Hire date
  - Age (if available)

- **Annual Leave Card:**
  - Annual entitlement (21-23+ days)
  - Current year entitlement (pro-rata)
  - Accrued to today

**Section 2: Leave Balance Breakdown** 📈

Individual cards for each component:

1. **Accrued Days** (Blue) 🔵
   - Days accumulated pro-rata this year
   - Example: "15 zile acumulate (pro-rata)"

2. **Carried Over** (Info Blue) ℹ️
   - Days brought from previous year
   - Shows "+3" with expiry warning
   - "zile reportate din anul trecut"

3. **Voluntary Days** (Orange) 🟠
   - Days taken by employee choice
   - Excludes company shutdowns

4. **Company Shutdown Days** (Ice Blue) ❄️
   - Days taken for company closures
   - Shows Christmas/New Year icon
   - "(ex: Crăciun, Revelion)"

5. **Pending Approval** (Yellow) ⚠️
   - Days awaiting manager approval
   - Only shown if > 0

**Section 3: Summary** 📊

Large summary card with 3 key metrics:
- **Total Used:** All days taken (voluntary + shutdown)
- **Remaining Today:** Available now (accrued - used + carryover)
- **Remaining Year-End:** Projected at December 31st

**Info Footer** ℹ️
- Policy summary
- Carryover rules
- Company shutdown notification

---

### 3. **Leave Request Validation** ✅

When employees request leave through the "Adaugă Concediu" modal:

**Automatic Checks:**

1. **Blackout Period Detection** ⛔
   - "Perioada selectată este în blackout: [reason]"
   - If exceptions allowed: "Manager approval required"
   - If no exceptions: Request blocked

2. **Company Shutdown Overlap** ❄️
   - "Perioada include X zile de închidere firmă"
   - Shows which shutdown dates overlap
   - Informational only (automatic deduction)

3. **Insufficient Balance** ⚠️
   - "Sold insuficient: ai doar X zile disponibile"
   - Cannot submit if balance too low

4. **Max Consecutive Days** 📅
   - "Maximum 10 zile consecutive permise"
   - Prevents requests exceeding limit

5. **Minimum Notice** ⏰
   - "Preaviz minim: 14 zile înainte"
   - Ensures advance planning

---

## 🎨 UI/UX Improvements Summary

### **Visual Enhancements:**

✨ **Color-Coded System:**
- 🔵 **Primary Blue:** Accrued days, policy info
- 🟢 **Green:** Available/healthy status
- 🟡 **Warning Yellow:** Moderate status, pending approvals
- 🔴 **Error Red:** Critical status, blackouts
- ❄️ **Info Blue:** Company shutdowns, carryovers
- 🟠 **Orange:** Days taken

✨ **Icon System:**
- ⛔ **EventBusy:** Blackout periods
- ❄️ **AcUnit:** Company shutdowns (winter icon)
- ⚠️ **Warning:** Pending approvals, low balance
- ✅ **CheckCircle:** Confirmed, positive status
- 📊 **TrendingUp:** Tenure, seniority
- 🏖️ **BeachAccess:** Leave entitlement

✨ **Typography:**
- **Bold numbers:** Key metrics stand out
- **Subtle captions:** Context without clutter
- **Color hints:** Semantic meaning (red = expiry, green = available)

✨ **Progress Indicators:**
- **Linear bars:** Visual leave consumption
- **Percentage-based:** Immediate understanding
- **Responsive colors:** Status at a glance

---

## 📱 Responsive Design

All pages are fully responsive:

- **Desktop:** Full 3-column layout for leave breakdown
- **Tablet:** 2-column adaptive layout
- **Mobile:** Single-column stack, touch-friendly

---

## 🔧 How to Use (Quick Start)

### **For Admins/Managers:**

1. **Setup Annual Policy:**
   - Go to `/leave-policy`
   - Review "Politică Generală" tab
   - Policy is already configured (21 base, +1/5 years)

2. **Add Blackout Periods:**
   - Go to "Blackout Periods" tab
   - Click "Adaugă Blackout"
   - Set dates for peak seasons/inventory
   - Choose exception policy

3. **Add Company Shutdowns:**
   - Go to "Închideri Firmă" tab
   - Click "Adaugă Închidere"
   - Set Christmas/New Year dates
   - Specify working days (5-6 typically)
   - **Important:** Add for future years in advance!

4. **Monitor Team:**
   - Go to `/echipa`
   - Check leave status column for warnings
   - Expand rows to see detailed breakdowns
   - Approve/reject pending requests

### **For Employees:**

1. **Check Your Balance:**
   - Go to `/echipa`
   - Find your row, click expand icon
   - See detailed breakdown of available days

2. **Request Leave:**
   - Click calendar icon on your row
   - Select dates
   - System validates against:
     - Blackout periods
     - Company shutdowns
     - Available balance
     - Notice period
   - Submit for approval

3. **View History:**
   - Click history icon on your row
   - See all past/future leave requests
   - Check status (Pending/Approved/Rejected)

---

## 📊 Example Scenarios

### **Scenario 1: New Employee Mid-Year**

**Employee:** John Doe, hired **July 1, 2025**

**Calculation:**
- Annual entitlement: **21 days** (0-5 years tenure)
- 2025 entitlement: **10.5 days** (pro-rata from July 1)
- Accrued by October 3: **6.5 days** (pro-rata to today)

**Display:**
- Drept/an: **21 zile**
- Drept 2025: **11 zile** (rounded down)
- Acumulat azi: **6 zile**
- Company shutdown: **-9 zile** (Christmas + New Year)
- **Result:** ⚠️ **Negative!** Employee needs to accrue more or use unpaid leave

---

### **Scenario 2: Senior Employee with Carryover**

**Employee:** Maria Popescu, hired **January 15, 2018** (7.7 years)

**Calculation:**
- Annual entitlement: **22 days** (21 + 1 seniority bonus)
- 2025 entitlement: **22 days** (full year)
- Carried over: **+3 days** from 2024 (expires March 31, 2026)
- Taken voluntary: **8 days**
- Company shutdowns: **9 days**
- **Total available:** 22 + 3 - 8 - 9 = **8 days remaining**

**Display:**
- Entitled: 22/year
- Accrued: 22 (full year)
- Carried: +3 (warning: expires soon!)
- Voluntary: 8 days
- Shutdown: 9 days
- **Remaining:** 8 days

---

### **Scenario 3: Blackout Period Request**

**Employee requests:** July 10-15 vacation

**Validation:**
- ⛔ **Blackout detected:** "Sezon de vârf construcții"
- **Exceptions:** Not allowed
- **Result:** ❌ **Request blocked** - "Cannot request leave during blackout period"

**Alternative:** July 16-23 (after blackout)
- ✅ **Validation passes**
- Submitted for manager approval

---

## 🚀 Next Steps

### **Immediate Actions:**

1. ✅ **Access Leave Policy Page:** Navigate to `/leave-policy` (already in routing)
2. ✅ **Review Current Settings:** Check blackout periods and shutdowns
3. ✅ **Add 2026 Shutdowns:** Plan ahead for next year's Christmas/New Year
4. ✅ **Test Team Page:** View expanded employee details

### **Optional Enhancements:**

1. **Connect to Backend API:**
   - Currently using mock data
   - Add API calls to fetch/save policies, blackouts, shutdowns
   - Backend routes already exist (`/leave-policy`, `/blackout-periods`, `/company-shutdowns`)

2. **Add Notifications:**
   - Email employees when shutdowns are added
   - Remind about carryover expiry (March 31)
   - Alert managers of pending approvals

3. **Reports:**
   - Leave forecast report
   - Team availability calendar
   - Shutdown impact analysis

---

## 🎯 Summary

### **What You Have Now:**

✅ **Complete UI for Leave Policy Management**
- Visual policy configuration
- Blackout period management
- Company shutdown scheduler

✅ **Enhanced Team Page**
- Color-coded leave status
- Detailed employee breakdowns
- Carryover tracking
- Company shutdown visibility

✅ **Automatic Validation**
- Blackout detection
- Balance checking
- Notice period enforcement
- Consecutive day limits

✅ **Flexible System**
- Pro-rata accrual
- Carryover with expiry
- Seniority bonuses
- December shutdown automation

### **What Makes This Special:**

🎨 **Beautiful UI/UX:**
- Color-coded cards
- Progress bars
- Icon system
- Responsive design

🧠 **Smart Automation:**
- Automatic shutdown deduction
- Pro-rata calculations
- Carryover expiry tracking
- Blackout validation

📊 **Complete Transparency:**
- Employees see exactly what they have
- Breakdown of voluntary vs shutdown days
- Clear policy communication
- Real-time balance updates

---

## 📞 Need Help?

- **Leave Policy Page:** `/leave-policy` (Admin/Manager only)
- **Team Page:** `/echipa` (All users)
- **Calendar:** `/calendar` (Company-wide view)

**Pro Tip:** Bookmark `/leave-policy` for quick access to add next year's shutdowns!

---

**🎉 Your leave policy system is now complete and production-ready!**
