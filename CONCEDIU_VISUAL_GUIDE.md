# 📊 Concediu Field - Visual Guide

## 🎯 Overview

The **Concediu (Leave)** column in the team table has been completely redesigned to provide **comprehensive, at-a-glance information** about each employee's leave status.

---

## 📐 Column Layout

```
┌─────────────────────────────────────────┐
│          CONCEDIU (240px)               │
├─────────────────────────────────────────┤
│                                         │
│  Main Chip   Carryover   Pending       │
│  ┌────────┐  ┌───────┐  ┌──────┐      │
│  │ 15/18  │  │  +3   │  │ ⏳2  │      │
│  └────────┘  └───────┘  └──────┘      │
│                                         │
│  Primary Progress Bar                  │
│  ████████████░░░░░░░░░░░░              │
│                                         │
│  Carryover Indicator                   │
│  ████░░░░░░░░░░░░░░░░░░░               │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎨 Component Breakdown

### 1. **Main Chip** (`remaining/accrued`)

Shows the **most important information**: days available vs. days accrued.

**Color Coding:**
- 🟢 **Green (Success)**: `≥50%` remaining → Everything is fine
- 🟡 **Yellow (Warning)**: `25-49%` remaining → Getting low
- 🔴 **Red (Error)**: `<25%` OR `≤0` remaining → Critical

**Icon:**
- ✅ `CheckCircleIcon`: When `remaining > 0` and no warnings
- ⚠️ `WarningAmberIcon`: When `remaining ≤ 0` OR `pending > 0`

**Examples:**
```
┌─────────┐          ┌─────────┐          ┌─────────┐
│ ✅ 15/18│  Green   │ ⚠️ 8/18 │  Yellow  │ ⚠️ 0/18 │  Red
└─────────┘          └─────────┘          └─────────┘
  67% left             44% left             0% left
```

---

### 2. **Carryover Chip** (`+X`)

Shows days **carried over from previous year**.

**Visibility:** Only shown if `carriedOver > 0`

**Style:**
- Color: `info` (blue)
- Variant: `outlined`
- Size: Small (`0.7rem` font)

**Tooltip:** "Zile reportate din anul trecut (expiră 31 martie)"

**Examples:**
```
┌───────┐
│  +3   │  ← 3 days from 2024
└───────┘

┌───────┐
│  +5   │  ← Maximum allowed (policy default)
└───────┘
```

---

### 3. **Pending Chip** (`⏳X`)

Shows days **pending approval**.

**Visibility:** Only shown if `pendingDays > 0`

**Style:**
- Color: `warning` (orange)
- Variant: `filled`
- Size: Small (`0.7rem` font)
- Icon: ⏳ (hourglass emoji)

**Tooltip:** "Zile în așteptare aprobare"

**Examples:**
```
┌──────┐
│ ⏳2  │  ← 2 days waiting for approval
└──────┘

┌──────┐
│ ⏳5  │  ← 5 days pending
└──────┘
```

---

### 4. **Primary Progress Bar**

Visual representation of **remaining vs. accrued days**.

**Calculation:**
```typescript
percentage = (remaining / accrued) * 100
// Clamped to 0-100
```

**Properties:**
- Height: `5px`
- Border radius: `2px`
- Background: `action.hover` (light gray)
- Bar color: Matches main chip color (green/yellow/red)
- Rounded bar edges

**Examples:**
```
15/18 (83%)
████████████████░░░░  ← Almost full (green)

8/18 (44%)
████████░░░░░░░░░░░░  ← Half full (yellow)

2/18 (11%)
██░░░░░░░░░░░░░░░░░░  ← Almost empty (red)

0/18 (0%)
░░░░░░░░░░░░░░░░░░░░  ← Empty (red)
```

---

### 5. **Carryover Indicator Bar**

Secondary progress bar showing **proportion of carryover**.

**Visibility:** Only shown if `carriedOver > 0`

**Properties:**
- Height: `2px` (thinner than primary)
- Border radius: `1px`
- Background: `transparent`
- Bar color: `info` (blue)
- Opacity: `0.6` (semi-transparent)
- Margin-top: `0.25` (close to primary bar)

**Calculation:**
```typescript
percentage = (carriedOver / accrued) * 100
// Clamped to 0-100
```

**Example:**
```
Accrued: 18, Carryover: 3

Primary bar (remaining):
████████████████░░░░  ← 15/18

Carryover bar:
███░░░░░░░░░░░░░░░░  ← 3/18 (17%)
```

---

## 🔍 Tooltip Content

**Rich, structured information** displayed on hover.

### Structure:
```
┌────────────────────────────────────┐
│ 📊 Detalii Concediu               │  ← Header
├────────────────────────────────────┤
│                                    │
│ ✓ Acumulat (pro-rata): 18 zile   │  ← Always shown
│                                    │
│ ↪ Reportate din 2024: +3 zile    │  ← Only if > 0
│                                    │
│ ✕ Folosite: 6 zile               │  ← Always shown
│   (4 personale + 2 firmă)         │  ← Breakdown if both > 0
│                                    │
│ ⏳ În așteptare: 2 zile           │  ← Only if > 0
│                                    │
├────────────────────────────────────┤
│ = Disponibile: 15 zile            │  ← Final balance (bold)
└────────────────────────────────────┘
```

### Conditional Rendering:

1. **Carryover line** - Only if `carriedOver > 0`
2. **Breakdown line** - Only if both `voluntary > 0` AND `companyShutdown > 0`
3. **Pending line** - Only if `pending > 0`
4. **Final balance color**:
   - 🟢 Green if `remaining > 0`
   - 🔴 Red if `remaining ≤ 0`

---

## 📊 Real-World Examples

### Example 1: Normal Employee (Healthy Balance)
```
Employee: Ion Popescu
Hired: 2020-01-15 (5 years ago)
Policy: 21 base + 1 bonus = 22 days/year
Accrual: Pro-rata (18 days accrued to Oct 6)
Taken: 4 days
Carryover: 3 days
Pending: 0
Available: 17 days (18 + 3 - 4)

Display:
┌─────────────────────────────┐
│ ✅ 17/18  +3               │
│ ████████████████████░░░░   │ ← 94% (green)
│ ███░░░░░░░░░░░░░░░░░░░░░   │ ← Carryover
└─────────────────────────────┘
```

### Example 2: Low Balance Employee (Warning)
```
Employee: Maria Ionescu
Hired: 2022-03-01 (3 years ago)
Policy: 21 days/year
Accrual: Pro-rata (17 days accrued to Oct 6)
Taken: 10 days
Carryover: 0
Pending: 2 days
Available: 7 days (17 - 10)

Display:
┌─────────────────────────────┐
│ ⚠️ 7/17  ⏳2               │
│ ████████░░░░░░░░░░░░░░░░   │ ← 41% (yellow)
└─────────────────────────────┘
```

### Example 3: Critical Employee (Overused)
```
Employee: Andrei Popa
Hired: 2024-01-01 (10 months ago)
Policy: 21 days/year
Accrual: Pro-rata (17 days accrued to Oct 6)
Taken: 18 days (borrowed 1 day)
Carryover: 0
Pending: 0
Available: -1 days (17 - 18)

Display:
┌─────────────────────────────┐
│ ⚠️ -1/17                   │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← 0% (red)
└─────────────────────────────┘
```

### Example 4: New Employee (Just Started)
```
Employee: Elena Dumitrescu
Hired: 2025-10-01 (6 days ago)
Policy: 21 days/year
Accrual: Pro-rata (0 days accrued to Oct 6)
Taken: 0 days
Carryover: 0
Pending: 0
Available: 0 days

Display:
┌─────────────────────────────┐
│ ⚠️ 0/0                     │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← 0% (red)
└─────────────────────────────┘
```

### Example 5: Employee with Company Shutdown
```
Employee: Cristian Moldovan
Hired: 2018-06-15 (7 years ago)
Policy: 21 base + 1 bonus = 22 days/year
Accrual: Pro-rata (18 days accrued to Oct 6)
Taken: 8 days (3 personal + 5 company shutdown)
Carryover: 5 days (max allowed)
Pending: 3 days
Available: 15 days (18 + 5 - 8)

Display:
┌─────────────────────────────┐
│ ✅ 15/18  +5  ⏳3          │
│ ████████████████░░░░░░░░   │ ← 83% (green)
│ █████░░░░░░░░░░░░░░░░░░░   │ ← Carryover (28%)
└─────────────────────────────┘

Tooltip:
┌────────────────────────────────┐
│ 📊 Detalii Concediu           │
├────────────────────────────────┤
│ ✓ Acumulat: 18 zile           │
│ ↪ Reportate 2024: +5 zile     │
│ ✕ Folosite: 8 zile            │
│   (3 personale + 5 firmă)     │
│ ⏳ În așteptare: 3 zile       │
├────────────────────────────────┤
│ = Disponibile: 15 zile        │
└────────────────────────────────┘
```

---

## 🎯 Design Principles

### 1. **Progressive Disclosure**
- Show the most important info first (main chip)
- Additional details in tooltips
- Only show chips when relevant (carryover, pending)

### 2. **Visual Hierarchy**
- Main chip: Largest, most prominent
- Secondary chips: Smaller, less prominent
- Progress bars: Visual reinforcement

### 3. **Color Psychology**
- 🟢 Green: Safe, good, continue
- 🟡 Yellow: Caution, watch out
- 🔴 Red: Danger, action required
- 🔵 Blue: Information, neutral

### 4. **Accessibility**
- Color + icons (not color alone)
- High contrast ratios
- Clear, readable tooltips
- Proper ARIA labels

### 5. **Data Accuracy**
- Uses backend calculations (pro-rata aware)
- Falls back to legacy data when needed
- Shows real-time pending requests
- Tracks company shutdowns separately

---

## 🔄 State Transitions

### Employee Takes Leave:
```
Before:                After:
┌──────────┐          ┌──────────┐
│ ✅ 15/18│    →     │ ⚠️ 7/18 │
│ ████████ │          │ ████░░░░ │
└──────────┘          └──────────┘
Took 8 days           Only 7 left (warning)
```

### Employee Requests Leave (Pending):
```
Before:                After:
┌──────────┐          ┌────────────────┐
│ ✅ 15/18│    →     │ ⚠️ 15/18  ⏳5  │
│ ████████ │          │ ████████       │
└──────────┘          └────────────────┘
No pending            5 days pending
```

### Carryover Expires (April 1):
```
March 31:              April 1:
┌──────────────┐       ┌──────────┐
│ ✅ 15/18  +5│   →   │ ✅ 10/18│
│ ████████     │       │ ████░░░░ │
│ █████░░░░░   │       └──────────┘
└──────────────┘       No carryover
```

### Year Rollover (January 1):
```
Dec 31:                Jan 1:
┌──────────┐          ┌──────────────┐
│ ✅ 8/21 │    →     │ ✅ 0/0   +5 │
│ ████░░░░ │          │ ░░░░░░░░░░░░ │
└──────────┘          │ █████░░░░░░░ │
                      └──────────────┘
8 unused → 5 carryover (max policy)
```

---

## 📝 Implementation Notes

### Data Source Priority:
1. **Primary**: `employee.leaveBalance.*` (from backend calculations)
2. **Fallback**: `employee.entitledDays`, `employee.takenDays`, etc.
3. **Default**: Policy defaults (21 days)

### Performance:
- No expensive calculations in the render
- Uses pre-calculated backend data
- Memoized where appropriate

### Responsive:
- Column width: 240px (fixed)
- Chips wrap if needed
- Tooltips adapt to viewport

### Extensibility:
- Easy to add more chips (e.g., "borrowed")
- Can add more progress bars (e.g., forecast)
- Tooltip structure is modular

---

**Created:** October 6, 2025  
**Status:** ✅ Implemented  
**Component:** `teamPage.improved.tsx` (lines 115-222)
