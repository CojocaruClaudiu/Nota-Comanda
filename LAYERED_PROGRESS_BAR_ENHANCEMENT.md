# 🎨 Layered Progress Bar - Full Year Visualization

## 🎯 **Enhancement Summary**

The leave progress bar now shows a **complete visual picture** of the entire annual leave allocation with a **3-layer design**:
1. **Grey background** - Full annual entitlement (total possible for the year)
2. **Light colored layer** - Total available (accrued + carryover)
3. **Solid colored layer** - Remaining days (what's actually left)

---

## 📊 **Visual Design**

### Old Design (2-layer):
```
┌────────────────────────────┐
│ Remaining (solid)          │ ← 15 days
│ ░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← Empty (grey)
└────────────────────────────┘
   ↑                      ↑
   0                     21 (full entitlement)
```
**Problem:** Can't see how much is accrued vs. not yet earned.

---

### New Design (3-layer):
```
┌────────────────────────────┐
│ █████████████████░░░░░░░░░ │ Layer 3: Remaining (15) - SOLID GREEN
│ ██████████████████████░░░░ │ Layer 2: Available (21) - LIGHT GREEN
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │ Layer 1: Full year (23) - GREY
└────────────────────────────┘
│←─ Used ─→│← Remaining →│← Not accrued yet →│
    6 days     15 days         2 days
```

**Benefits:**
- ✅ See remaining days (solid color)
- ✅ See total available (light color extending past solid)
- ✅ See full year entitlement (grey background)
- ✅ See what's not yet earned (grey portion beyond light color)

---

## 🎨 **Layer Breakdown**

### **Layer 1: Background (Grey)**
- **Width:** Full annual entitlement (e.g., 23 days for senior employee)
- **Color:** `action.hover` (light grey)
- **Purpose:** Shows the **maximum possible** days for the entire year
- **Calculation:** `employee.entitledDays` (base 21 + seniority bonus)

### **Layer 2: Total Available (Light Color)**
- **Width:** Accrued + Carryover (e.g., 18 accrued + 3 carryover = 21 days)
- **Color:** Light version of status color (green/yellow/red at 30% opacity)
- **Purpose:** Shows **what's available right now** (earned + carried over)
- **Calculation:** `(totalAvailable / entitledDays) * 100%`

### **Layer 3: Remaining (Solid Color)**
- **Width:** Unused days (e.g., 15 days)
- **Color:** Full status color (green/yellow/red)
- **Purpose:** Shows **what's still usable**
- **Calculation:** `(remaining / entitledDays) * 100%`

### **Bonus: Carryover Indicator (Blue)**
- **Position:** Below main bar
- **Width:** Carryover portion (e.g., 3 days)
- **Color:** Blue (`info`) at 60% opacity
- **Purpose:** Highlights how much is from previous year
- **Calculation:** `(carriedOver / entitledDays) * 100%`

---

## 📐 **Real-World Examples**

### Example 1: Mid-Year Employee (Normal Case)
```
Employee: Ion Popescu
Hired: 2020-01-15 (5 years)
Annual Entitlement: 22 days (21 base + 1 seniority)
Accrued to Oct 6: 18 days
Carryover: 3 days
Taken: 6 days
Remaining: 15 days

Visual:
┌──────────────────────────────────────┐
│ Chip: 15/21  +3                      │
├──────────────────────────────────────┤
│ ████████████████░░░░░░░░░░░░░░░░░░░ │ Remaining: 15/22 (68% solid green)
│ ███████████████████░░░░░░░░░░░░░░░░ │ Available: 21/22 (95% light green)
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ Full: 22/22 (100% grey)
│ ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ Carryover: 3/22 (14% blue)
└──────────────────────────────────────┘
  │← Used: 6 →│←─ Left: 15 ─→│← Not yet: 1 →│
```

**Interpretation:**
- **Solid green (68%):** What you can use NOW (15 days)
- **Light green (95%):** What's available total (21 days, including carryover)
- **Grey gap (5%):** What you'll earn by Dec 31 (1 more day)
- **Blue line (14%):** Shows 3 days are from last year

---

### Example 2: New Employee (Started Recently)
```
Employee: Ana Marinescu
Hired: 2025-09-01 (1 month)
Annual Entitlement: 21 days
Accrued to Oct 6: 2 days
Carryover: 0 days
Taken: 0 days
Remaining: 2 days

Visual:
┌──────────────────────────────────────┐
│ Chip: 2/2                            │
├──────────────────────────────────────┤
│ ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ Remaining: 2/21 (10% solid green)
│ ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ Available: 2/21 (10% light green)
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ Full: 21/21 (100% grey)
└──────────────────────────────────────┘
  │← 2 →│←────────── Will earn: 19 ──────→│
```

**Interpretation:**
- **Solid green (10%):** Only 2 days available now
- **Light green (10%):** Same as solid (no carryover)
- **Grey (90%):** Will earn 19 more days by Dec 31
- **Visual:** Mostly grey = new employee, hasn't earned much yet

---

### Example 3: Heavy User (Low Balance)
```
Employee: Mihai Popescu
Hired: 2023-01-01 (2 years)
Annual Entitlement: 21 days
Accrued to Oct 6: 17 days
Carryover: 2 days
Taken: 16 days
Remaining: 3 days

Visual:
┌──────────────────────────────────────┐
│ Chip: 3/19  +2                       │
├──────────────────────────────────────┤
│ ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ Remaining: 3/21 (14% solid RED)
│ ██████████████████░░░░░░░░░░░░░░░░░ │ Available: 19/21 (90% light RED)
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ Full: 21/21 (100% grey)
│ ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ Carryover: 2/21 (10% blue)
└──────────────────────────────────────┘
  │←── Used: 16 ──→│← 3 →│← 2 →│
```

**Interpretation:**
- **Solid red (14%):** CRITICAL - only 3 days left! ⚠️
- **Light red (90%):** Already used 16 of 19 available
- **Grey (10%):** Will earn 2 more days by Dec 31
- **Warning:** Color is RED because percentage < 25%

---

### Example 4: Employee with Max Carryover
```
Employee: Elena Dumitrescu
Hired: 2018-01-01 (7 years)
Annual Entitlement: 22 days (21 + 1 seniority)
Accrued to Oct 6: 18 days
Carryover: 5 days (maximum allowed)
Taken: 3 days
Remaining: 20 days

Visual:
┌──────────────────────────────────────┐
│ Chip: 20/23  +5                      │
├──────────────────────────────────────┤
│ ██████████████████████░░░░░░░░░░░░░ │ Remaining: 20/22 (91% solid GREEN)
│ ██████████████████████████░░░░░░░░░ │ Available: 23/22 (105% light GREEN) ⚡
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ Full: 22/22 (100% grey)
│ ██████████░░░░░░░░░░░░░░░░░░░░░░░░░ │ Carryover: 5/22 (23% blue)
└──────────────────────────────────────┘
  │← Used: 3 →│←───── Left: 20 ─────→│
```

**Interpretation:**
- **Light green extends beyond grey!** Available (23) > Entitlement (22)
- This is CORRECT - employee has 5 carryover days
- **Solid green (91%):** 20 days still available
- **Blue line (23%):** Significant carryover portion

---

## 🎨 **Color States**

### Green (Success) - Healthy Balance
```
Condition: remaining > 0 AND percentage ≥ 50%

┌────────────────────────────┐
│ ████████████░░░░░░░░░░░░░ │ Solid: success.main
│ ████████████████░░░░░░░░░ │ Light: success.light (opacity 0.3)
│ ░░░░░░░░░░░░░░░░░░░░░░░░░ │ Grey: action.hover
└────────────────────────────┘
```

### Yellow (Warning) - Getting Low
```
Condition: 25% ≤ percentage < 50%

┌────────────────────────────┐
│ ██████░░░░░░░░░░░░░░░░░░░ │ Solid: warning.main
│ ████████████░░░░░░░░░░░░░ │ Light: warning.light (opacity 0.3)
│ ░░░░░░░░░░░░░░░░░░░░░░░░░ │ Grey: action.hover
└────────────────────────────┘
```

### Red (Error) - Critical
```
Condition: remaining ≤ 0 OR percentage < 25%

┌────────────────────────────┐
│ ██░░░░░░░░░░░░░░░░░░░░░░░ │ Solid: error.main
│ ████░░░░░░░░░░░░░░░░░░░░░ │ Light: error.light (opacity 0.3)
│ ░░░░░░░░░░░░░░░░░░░░░░░░░ │ Grey: action.hover
└────────────────────────────┘
```

---

## 🧮 **Calculation Details**

### Width Calculations:
```typescript
// Full annual entitlement (100% width)
const fullEntitlement = employee.entitledDays || 21;

// Layer 2: Total available width
const availableWidth = (totalAvailable / fullEntitlement) * 100;
// Can exceed 100% if carryover is large!

// Layer 3: Remaining width
const remainingWidth = (remaining / fullEntitlement) * 100;

// Carryover indicator width
const carryoverWidth = (carriedOver / fullEntitlement) * 100;
```

### Example Calculation:
```
Given:
- fullEntitlement = 22 days
- accrued = 18 days
- carriedOver = 5 days
- taken = 8 days

Calculate:
- totalAvailable = 18 + 5 = 23 days
- remaining = 23 - 8 = 15 days

Widths:
- availableWidth = (23/22) * 100 = 105% ⚡ (exceeds 100%!)
- remainingWidth = (15/22) * 100 = 68%
- carryoverWidth = (5/22) * 100 = 23%
```

**Note:** Available width can exceed 100% when carryover is large. This is **intentional** and visually shows the employee has more than the annual entitlement.

---

## 🎭 **Edge Cases**

### Case 1: No Days Accrued Yet
```
accrued = 0, carryover = 0, remaining = 0

┌────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░ │ All grey (nothing earned)
└────────────────────────────┘
```

### Case 2: Negative Balance (Borrowed Days)
```
remaining = -3

┌────────────────────────────┐
│                            │ No solid layer (0%)
│ █████████████████░░░░░░░░ │ Light red shows what was available
│ ░░░░░░░░░░░░░░░░░░░░░░░░░ │ Grey shows full entitlement
└────────────────────────────┘
```

### Case 3: Over 100% Available (Large Carryover)
```
accrued = 18, carryover = 8, entitlement = 21

┌────────────────────────────┐
│ ██████████████████████████ │ Light layer EXTENDS beyond grey!
│ ░░░░░░░░░░░░░░░░░░░░░░░░░ │ Grey shows base entitlement
└────────────────────────────┘
```

### Case 4: All Available Days Used
```
remaining = 0, available = 18, taken = 18

┌────────────────────────────┐
│                            │ No solid layer
│ █████████████████░░░░░░░░ │ Light layer shows what was there
│ ░░░░░░░░░░░░░░░░░░░░░░░░░ │ Grey shows full year
└────────────────────────────┘
```

---

## 🎯 **User Benefits**

### At-a-Glance Understanding:
1. **Solid color length** → "How much I have LEFT"
2. **Light color length** → "How much I have TOTAL"
3. **Grey area** → "How much I'll EARN by year end"
4. **Blue line** → "How much is from LAST YEAR"

### Quick Visual Checks:
- ✅ "Am I running low?" → Short solid bar = YES
- ✅ "Can I take 5 days?" → Is solid bar > 25%? 
- ✅ "When will I earn more?" → Gap between light and grey
- ✅ "Do I have carryover?" → Blue line visible

---

## 🔄 **Animation & Interaction**

### Smooth Transitions:
```css
transition: width 0.3s ease
```
When days are taken/added, the bars **smoothly animate** to the new values.

### Hover Effects:
The entire cell has a tooltip showing exact numbers, complementing the visual.

### Responsive:
All layers scale proportionally to the column width (240px).

---

## 📊 **Comparison: Before vs After**

### Before (Simple Bar):
```
Information shown:
- ✓ Remaining days
- ✗ Total available
- ✗ Full year entitlement
- ✗ What's still to be earned

Visual complexity: Low
Information density: Low
User effort: High (need to read chips + do math)
```

### After (Layered Bar):
```
Information shown:
- ✓ Remaining days (solid layer)
- ✓ Total available (light layer)
- ✓ Full year entitlement (grey background)
- ✓ What's still to be earned (grey gap)
- ✓ Carryover portion (blue indicator)

Visual complexity: Medium
Information density: Very High
User effort: Low (understand at-a-glance)
```

---

## 🎨 **Implementation Details**

### Technology:
- **Material-UI Box components** (not LinearProgress)
- **Absolute positioning** for layering
- **Percentage-based widths** for responsiveness
- **CSS transitions** for smooth animations

### Performance:
- No re-renders unless data changes
- Pure CSS for visuals (no canvas/SVG)
- Lightweight (< 5 KB)

### Accessibility:
- Tooltip provides exact numbers
- Color + length (not color alone)
- High contrast between layers
- Works without color vision

---

## 🧪 **Testing Checklist**

- [x] Employee with no carryover (2 layers only)
- [x] Employee with carryover (3 layers)
- [x] Employee with max carryover (light extends beyond grey)
- [x] New employee (mostly grey)
- [x] Heavy user (thin solid, wide light)
- [x] Negative balance (no solid layer)
- [x] Zero accrued (all grey)
- [x] All used (no solid, light only)
- [x] Color changes at thresholds (25%, 50%)
- [x] Animation on data change
- [x] Responsive to column width

---

## 📝 **Summary**

The new **3-layer progress bar** provides:

1. **Complete Picture:** See entire year allocation, not just current status
2. **Visual Hierarchy:** Solid > Light > Grey shows what's usable now vs. later
3. **Instant Understanding:** No math needed - just look at the bars
4. **Smart Colors:** Green/Yellow/Red based on actual situation
5. **Carryover Clarity:** Blue line shows what's from previous year

**Result:** Employees and managers can make better leave planning decisions! 🎉

---

**Created:** October 6, 2025  
**Status:** ✅ Implemented  
**Component:** `teamPage.improved.tsx`  
**Impact:** High - Transforms leave visualization
