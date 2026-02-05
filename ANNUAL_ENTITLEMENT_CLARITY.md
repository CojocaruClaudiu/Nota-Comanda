# 📅 Annual Leave Entitlement Clarity Enhancement

## 🎯 **Objective**

Make it **crystal clear** how many days each employee can take per year, including:
- Base entitlement (21 days)
- Seniority bonus (1 day per 5 years)
- Total annual entitlement

---

## ✅ **What Changed**

### 1. **Table Tooltip** - Added Annual Entitlement at the Top

**Before:**
```
📊 Detalii Concediu
─────────────────
✓ Acumulat (pro-rata): 14 zile
↪ Reportate din 2024: +5 zile
...
```

**After:**
```
📊 Detalii Concediu
─────────────────
📅 Drept anual: 21 zile/an  ← NEW! Shows total entitlement
✓ Acumulat (pro-rata): 14 zile
↪ Reportate din 2024: +5 zile
...
```

**For employees with seniority bonus:**
```
📊 Detalii Concediu
─────────────────
📅 Drept anual: 23 zile/an  ← Shows 21 + 2 bonus
✓ Acumulat (pro-rata): 18 zile
...
```

---

### 2. **Detail Panel** - Added Seniority Bonus Breakdown

**Before:**
```
Drept Concediu Anual
────────────────────
Drept/an: 23 zile
Acumulat până azi: 18 zile
```

**After:**
```
Drept Concediu Anual
────────────────────
Drept/an: 23 zile
(21 zile bază + 2 zile bonus vechime)  ← NEW! Breakdown
Acumulat până azi: 18 zile
```

---

### 3. **Info Alert** - Personalized Policy Description

**Before:**
```
Politica concediu: 21 zile/an bază + 1 zi/5 ani vechime.
Zilele se acumulează pro-rata pe parcursul anului...
```

**After:**
```
Politica concediu: Fiecare angajat poate lua 23 zile/an (21 bază + 2 bonus vechime).
Zilele se acumulează pro-rata pe parcursul anului (se calculează zilnic)...
```

---

## 🔍 **Implementation Details**

### Code Changes in `teamPage.improved.tsx`

#### 1. **Tooltip Enhancement** (Line ~151)

```typescript
<Tooltip 
  title={
    <Box sx={{ p: 0.5 }}>
      <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
        📊 Detalii Concediu
      </Typography>
      <Divider sx={{ mb: 0.5, borderColor: 'rgba(255,255,255,0.2)' }} />
      
      {/* NEW: Show annual entitlement first */}
      <Typography variant="caption" display="block" color="primary.light" sx={{ mb: 0.5 }}>
        📅 Drept anual: <strong>{employee.entitledDays || 21}</strong> zile/an
      </Typography>
      
      <Typography variant="caption" display="block">
        ✓ Acumulat (pro-rata): <strong>{accrued}</strong> zile
      </Typography>
      
      {/* ... rest of tooltip ... */}
    </Box>
  }
>
```

#### 2. **Detail Panel Breakdown** (Line ~366)

```typescript
<Stack spacing={1}>
  <Chip
    color="success"
    label={`Drept/an: ${annualEntitlement} zile`}
    sx={{ fontWeight: 600 }}
  />
  
  {/* NEW: Show breakdown for employees with seniority bonus */}
  {annualEntitlement > 21 && (
    <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
      (21 zile bază + {annualEntitlement - 21} {annualEntitlement - 21 === 1 ? 'zi' : 'zile'} bonus vechime)
    </Typography>
  )}
  
  <Chip 
    label={`Acumulat până azi: ${accruedToday} zile`}
    color="info"
    variant="outlined"
  />
  {/* ... rest of chips ... */}
</Stack>
```

#### 3. **Alert Footer** (Line ~523)

```typescript
<Alert severity="info" sx={{ mt: 2 }} icon={<CheckCircleIcon />}>
  <Typography variant="caption">
    <strong>Politica concediu:</strong> Fiecare angajat poate lua <strong>{annualEntitlement} zile/an</strong>
    {annualEntitlement > 21 && ` (21 bază + ${annualEntitlement - 21} bonus vechime)`}. 
    Zilele se acumulează pro-rata pe parcursul anului (se calculează zilnic). 
    Maximum 5 zile pot fi reportate din anul anterior.
    {/* ... rest of policy ... */}
  </Typography>
</Alert>
```

---

## 📊 **Visual Examples**

### Example 1: New Employee (No Seniority Bonus)

**Hired:** September 6, 2025  
**As of:** October 6, 2025  
**Tenure:** 1 month

**Table Cell:**
```
┌─────────────────────┐
│  1/1                │  ← Remaining/Total Available
│  📅 Drept: 21 zile/an │  ← Tooltip shows annual entitlement
│  ▓░░░░░░░░░░░░░░░░  │  ← Progress bar
└─────────────────────┘
```

**Tooltip:**
```
📊 Detalii Concediu
─────────────────
📅 Drept anual: 21 zile/an
✓ Acumulat (pro-rata): 1 zi
✕ Folosite: 0 zile
= Disponibile: 1 zi
```

**Detail Panel:**
```
╔═══════════════════════════════╗
║ Drept Concediu Anual          ║
╠═══════════════════════════════╣
║ Drept/an: 21 zile            ║
║ Acumulat până azi: 1 zi      ║
╚═══════════════════════════════╝
```

---

### Example 2: Senior Employee (With Seniority Bonus)

**Hired:** January 1, 2015  
**As of:** October 6, 2025  
**Tenure:** 10 years, 9 months

**Table Cell:**
```
┌─────────────────────┐
│  18/18              │  ← Remaining/Total Available
│  📅 Drept: 23 zile/an │  ← Shows 21 + 2 bonus
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │  ← Progress bar
└─────────────────────┘
```

**Tooltip:**
```
📊 Detalii Concediu
─────────────────
📅 Drept anual: 23 zile/an  ← 21 + 2 bonus
✓ Acumulat (pro-rata): 18 zile
✕ Folosite: 0 zile
= Disponibile: 18 zile
```

**Detail Panel:**
```
╔═══════════════════════════════╗
║ Drept Concediu Anual          ║
╠═══════════════════════════════╣
║ Drept/an: 23 zile            ║
║ (21 zile bază + 2 zile bonus) ║ ← NEW! Breakdown
║ Acumulat până azi: 18 zile   ║
╚═══════════════════════════════╝

╔═══════════════════════════════╗
║ Politica concediu:            ║
║ Fiecare angajat poate lua     ║
║ 23 zile/an (21 bază + 2 bonus)║ ← Personalized
╚═══════════════════════════════╝
```

---

## 🎯 **Benefits**

### ✅ **Immediate Clarity**
- Users instantly see **total annual entitlement** at the top of tooltip
- No need to calculate "21 + bonus" mentally

### ✅ **Transparency**
- Breakdown shows exactly where bonus days come from
- `(21 zile bază + 2 zile bonus vechime)` is crystal clear

### ✅ **Context**
- Tooltip shows entitlement **before** showing accrued days
- Helps users understand "18/23" means "18 accrued out of 23 total"

### ✅ **Personalization**
- Alert footer adapts to show **each employee's** specific entitlement
- Not generic "21 days + 1 per 5 years" - shows actual numbers

---

## 📋 **User Journey**

### Before Enhancement:
1. User hovers over "18/18" chip
2. Sees "✓ Acumulat: 18 zile"
3. Thinks: "18 out of what? How many can they take total?"
4. Must scroll to detail panel to find "Drept/an: 23 zile"

### After Enhancement:
1. User hovers over "18/18" chip
2. **Immediately sees** "📅 Drept anual: 23 zile/an"
3. Understands context: "18 accrued out of 23 total"
4. Sees breakdown: "(21 bază + 2 bonus)"
5. **Full understanding in 2 seconds!**

---

## 🔄 **Dynamic Behavior**

### For Employees with 0-4 Years Tenure (21 days):
```
📅 Drept anual: 21 zile/an
(no breakdown shown - it's just base)
```

### For Employees with 5-9 Years Tenure (22 days):
```
📅 Drept anual: 22 zile/an
(21 zile bază + 1 zi bonus vechime)
```

### For Employees with 10-14 Years Tenure (23 days):
```
📅 Drept anual: 23 zile/an
(21 zile bază + 2 zile bonus vechime)
```

### For Employees with 15+ Years Tenure (24 days):
```
📅 Drept anual: 24 zile/an
(21 zile bază + 3 zile bonus vechime)
```

---

## 🧪 **Test Cases**

| Tenure | Base | Bonus | Total | Display |
|--------|------|-------|-------|---------|
| 1 month | 21 | 0 | 21 | "21 zile/an" (no breakdown) |
| 5 years | 21 | 1 | 22 | "22 zile/an (21 bază + 1 bonus)" |
| 10 years | 21 | 2 | 23 | "23 zile/an (21 bază + 2 zile bonus)" |
| 15 years | 21 | 3 | 24 | "24 zile/an (21 bază + 3 zile bonus)" |
| 20 years | 21 | 4 | 25 | "25 zile/an (21 bază + 4 zile bonus)" |

---

## 🎨 **Design Consistency**

All three display locations now show:
1. **Total entitlement** (21-25 days)
2. **Breakdown** (base + bonus) if applicable
3. **Pro-rata accrual** (how much earned so far)
4. **Remaining** (what's left to use)

This creates a **consistent mental model** across the entire UI.

---

## ✅ **Result**

Now when someone asks:
> "How many days can each employee take per year?"

The answer is **immediately visible** in:
1. ✅ Table tooltip (📅 Drept anual: 23 zile/an)
2. ✅ Detail panel chip (Drept/an: 23 zile)
3. ✅ Detail panel breakdown ((21 bază + 2 bonus))
4. ✅ Info alert (23 zile/an (21 bază + 2 bonus))

---

**Date:** October 6, 2025  
**Status:** ✅ Complete  
**Impact:** High - Critical UX improvement for leave management  
**Files Changed:** `teamPage.improved.tsx`
