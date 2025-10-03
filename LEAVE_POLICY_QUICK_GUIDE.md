# 📅 Leave Policy Management - Quick Visual Guide

## 🎯 Overview
The Leave Policy page allows you to configure company-wide leave settings, blackout periods, and planned shutdowns.

## 📍 Location
**Team Section → Leave Policy** (or navigate to `/team/leave-policy`)

---

## 🔧 Three Main Sections

### 1️⃣ **General Policy Tab** (Read-Only for Now)
Shows your company's current leave configuration:

```
┌─────────────────────────────────────────────────────┐
│ Configurare de Bază                                 │
├─────────────────────────────────────────────────────┤
│ ● Zile de bază: 21                                  │
│ ● Bonus: +1 zi la fiecare 5 ani                     │
│                                                     │
│ Exemplu: Employee cu 7 ani = 22 zile (21 + 1)     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Metoda de Acumulare                                 │
├─────────────────────────────────────────────────────┤
│ ● Pro-rata (recomandat)                            │
│   → Zilele se acumulează pe parcursul anului       │
│   → Angajat pe 1 iulie = 50% drept până dec       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Regulile de Report                                  │
├─────────────────────────────────────────────────────┤
│ ● Permite report: Da                               │
│ ● Maximum: 5 zile                                  │
│ ● Expiră: 31/3                                     │
│                                                     │
│ ⚠️ Zilele reportate expiră pe 31 martie!          │
└─────────────────────────────────────────────────────┘
```

---

### 2️⃣ **Blackout Periods Tab** ⛔
Define periods when employees **cannot request leave**.

#### **How to Add:**
```
Click [+ Adaugă Blackout Period]
    ↓
┌──────────────────────────────────────┐
│ Adaugă Perioada Blackout             │
├──────────────────────────────────────┤
│ Motiv: [Sezon de vârf construcții]  │
│ Data început: [📅 01/07/2025]        │
│ Data sfârșit: [📅 15/07/2025]        │
│ □ Permite aprobare manuală           │
│                                      │
│ [Anulează]  [Salvează] ← Click      │
└──────────────────────────────────────┘
```

---

### 3️⃣ **Company Shutdowns Tab** 🏢❄️
Define when the **entire company is closed**.

#### **How to Add:**
```
Click [+ Adaugă Închidere Firmă]
    ↓
┌──────────────────────────────────────┐
│ Adaugă Închidere Firmă               │
├──────────────────────────────────────┤
│ Motiv: [Sărbători Crăciun 2025]     │
│ Data început: [📅 23/12/2025]        │
│ Data sfârșit: [📅 27/12/2025]        │
│ Zile lucrătoare: [5]                 │
│ ☑️ Deduce din dreptul de concediu    │
│                                      │
│ [Anulează]  [Salvează] ← Click      │
└──────────────────────────────────────┘
```

---

## 🚀 Quick Start

1. ✅ **Fixed Employee Modal** - All fields now save correctly (CNP, phone, ID, address)
2. ✅ **Leave Policy UI** - Configure blackouts and shutdowns dynamically
3. ✅ **Real Database** - No more hard-coded dates!

**Need help?** Check: `LEAVE_POLICY_AND_EMPLOYEE_FIXES.md`
