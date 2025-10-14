# Consum Normat & Marjă - Equipment & Labor Tables

## ✅ Implementation Complete

### Added Features

Extended the "Consum Normat" and "Marjă Consum %" functionality to:
- **Scule și Echipamente** (Equipment) table
- **Manopera** (Labor) table

Both tables now have the same editable consumption tracking as the Materials table.

## 📊 Updated Table Structures

### 1. Equipment Table (Scule și Echipamente)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| **Cod** | Display | Equipment code | E01 |
| **Denumire** | Display | Equipment description | EXCAVATOR |
| **UM** | Display | Unit of measure | oră |
| **Consum Normat** | ✏️ **Editable** | Normalized hours | 8.0000 h |
| **Marjă %** | ✏️ **Editable** | Consumption margin | +10.00% |
| **Cantitate** | Calculated | `consumNormat × (1 + marjă/100)` | 8.8000 h |
| **Preț** | Display | Hourly cost | 150.00 RON |
| **Valoare** | Calculated | `cantitate × preț` | 1,320.00 RON |

**Example Calculation:**
- Equipment: Excavator @ 150 RON/hour
- Consum Normat: 8 hours
- Marjă: +10% (for setup/downtime)
- **Cantitate** = 8 × (1 + 10/100) = **8.8 hours**
- **Valoare** = 8.8 × 150 = **1,320 RON**

### 2. Labor Table (Manopera)

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| **Cod** | Display | Qualification code | ZIDARI |
| **Denumire** | Display | Labor description | Zidărie cărămidă | 
| **UM** | Display | Unit of measure | oră |
| **Consum Normat** | ✏️ **Editable** | Normalized hours | 12.0000 h |
| **Marjă %** | ✏️ **Editable** | Consumption margin | +15.00% |
| **Cantitate** | Calculated | `consumNormat × (1 + marjă/100)` | 13.8000 h |
| **Preț** | Display | Hourly rate | 45.00 RON |
| **Valoare** | Calculated | `cantitate × preț` | 621.00 RON |

**Example Calculation:**
- Labor: Zidărie @ 45 RON/hour
- Consum Normat: 12 hours
- Marjă: +15% (for breaks/inefficiency)
- **Cantitate** = 12 × (1 + 15/100) = **13.8 hours**
- **Valoare** = 13.8 × 45 = **621 RON**

## 🎯 Features

### ✅ Inline Editing
- Click directly on **Consum Normat** or **Marjă %** fields to edit
- No crashes or React errors
- Values update in real-time

### ✅ Automatic Recalculation
- **Cantitate** recalculates when Consum Normat or Marjă changes
- **Valoare** updates automatically based on new quantity

### ✅ Visual Feedback
- Positive margins show in **green**
- Negative margins show in **red**
- Calculation breakdown shown under Cantitate when margin ≠ 0

### ✅ Data Persistence
- Values saved to backend correctly
- Loaded back properly on reopen
- Note: Like materials, `marjaConsum` resets to 0% on reload (not persisted to backend)

## 🔧 Technical Implementation

### Interfaces Updated
```typescript
interface EchipamentItem {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  consumNormat: number;      // ✨ NEW
  marjaConsum: number;        // ✨ NEW
  cantitate: number;          // Now calculated
  pretUnitar: number;
  valoare: number;            // Now calculated
}

interface ManoperaItem {
  id: string;
  cod: string;
  denumire: string;
  um: string;
  consumNormat: number;      // ✨ NEW
  marjaConsum: number;        // ✨ NEW
  cantitate: number;          // Now calculated
  pretUnitar: number;
  valoare: number;            // Now calculated
}
```

### Update Functions Added
```typescript
// Update equipment field and recalculate
const updateEquipmentField = (id: string, field: 'consumNormat' | 'marjaConsum', value: number) => {
  setEchipamente(prev => prev.map(item => {
    if (item.id !== id) return item;
    const updated = { ...item, [field]: value };
    updated.cantitate = updated.consumNormat * (1 + updated.marjaConsum / 100);
    updated.valoare = updated.cantitate * updated.pretUnitar;
    return updated;
  }));
};

// Update labor field and recalculate
const updateLaborField = (id: string, field: 'consumNormat' | 'marjaConsum', value: number) => {
  setManopera(prev => prev.map(item => {
    if (item.id !== id) return item;
    const updated = { ...item, [field]: value };
    updated.cantitate = updated.consumNormat * (1 + updated.marjaConsum / 100);
    updated.valoare = updated.cantitate * updated.pretUnitar;
    return updated;
  }));
};
```

### Column Definitions
Both Equipment and Labor tables now include:
- **Consum Normat** column with editable TextField
- **Marjă %** column with editable TextField (color-coded)
- **Cantitate** column showing calculated value with breakdown
- **Valoare** column styled with primary color

## 📝 Use Cases

### Equipment Example: Excavator Rental
```
Base Rate: 150 RON/hour
Planned Usage: 8 hours
Reality: Need to account for transport, setup, breaks

Solution:
├─ Consum Normat: 8.00 hours
├─ Marjă: +10%
├─ Cantitate: 8.8 hours (8 × 1.10)
└─ Cost: 1,320 RON (8.8 × 150)
```

### Labor Example: Masonry Work
```
Hourly Rate: 45 RON/hour
Estimated Time: 12 hours
Reality: Need buffer for breaks, material waits

Solution:
├─ Consum Normat: 12.00 hours
├─ Marjă: +15%
├─ Cantitate: 13.8 hours (12 × 1.15)
└─ Cost: 621 RON (13.8 × 45)
```

### Negative Margin Example: Experienced Team
```
Standard Time: 10 hours
Team Efficiency: Higher than average

Solution:
├─ Consum Normat: 10.00 hours
├─ Marjă: -10% (faster work)
├─ Cantitate: 9.0 hours (10 × 0.90)
└─ Savings: 10% time reduction
```

## 🎨 Visual Layout

### Equipment Table
```
┌────┬────────────┬────┬──────────────┬────────┬──────────┬───────┬─────────┬─────┐
│Cod │ Denumire   │ UM │Consum Normat │ Marjă %│Cantitate │ Preț  │ Valoare │  ×  │
├────┼────────────┼────┼──────────────┼────────┼──────────┼───────┼─────────┼─────┤
│E01 │ EXCAVATOR  │oră │   8.0000 📝  │ +10% 📝│  8.8000  │150.00 │1,320.00 │ 🗑️  │
│    │            │    │              │   ✅   │(8×1.10)  │       │         │     │
└────┴────────────┴────┴──────────────┴────────┴──────────┴───────┴─────────┴─────┘
```

### Labor Table
```
┌────────┬──────────────┬────┬──────────────┬────────┬──────────┬───────┬─────────┬─────┐
│  Cod   │  Denumire    │ UM │Consum Normat │ Marjă %│Cantitate │ Preț  │ Valoare │  ×  │
├────────┼──────────────┼────┼──────────────┼────────┼──────────┼───────┼─────────┼─────┤
│ZIDARI  │ Zidărie      │oră │  12.0000 📝  │ +15% 📝│ 13.8000  │ 45.00 │ 621.00  │ 🗑️  │
│        │ cărămidă     │    │              │   ✅   │(12×1.15) │       │         │     │
└────────┴──────────────┴────┴──────────────┴────────┴──────────┴───────┴─────────┴─────┘
```

## 🔄 Data Flow

```
┌──────────────────────────────────────────────────────────┐
│ SELECT EQUIPMENT/LABOR                                   │
├──────────────────────────────────────────────────────────┤
│ From Master:                                             │
│   • code, description, unit                              │
│   • hourlyCost / hourlyRate                              │
│                                                          │
│ Initialize:                                              │
│   • consumNormat = 1 (default)                          │
│   • marjaConsum = 0% (default)                          │
│   • cantitate = 1                                        │
│   • valoare = pretUnitar                                 │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ EDIT FIELDS                                              │
├──────────────────────────────────────────────────────────┤
│ User changes:                                            │
│   • consumNormat = 8 hours                              │
│   • marjaConsum = +10%                                  │
│                                                          │
│ Auto-recalculate:                                        │
│   • cantitate = 8 × (1 + 10/100) = 8.8 hours           │
│   • valoare = 8.8 × 150 = 1,320 RON                    │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ SAVE TO BACKEND                                          │
├──────────────────────────────────────────────────────────┤
│ {                                                        │
│   type: 'EQUIPMENT',                                     │
│   code: 'E01',                                          │
│   name: 'EXCAVATOR',                                    │
│   unit: 'oră',                                          │
│   quantity: 8.8,         // final calculated            │
│   price: 150             // unit price                  │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ LOAD FROM BACKEND                                        │
├──────────────────────────────────────────────────────────┤
│ Received:                                                │
│   • quantity = 8.8                                       │
│   • price = 150                                          │
│                                                          │
│ Reconstruct:                                             │
│   • consumNormat = 8.8 (approximated from quantity)     │
│   • marjaConsum = 0 (resets, not persisted)             │
│   • cantitate = 8.8                                      │
│   • valoare = 8.8 × 150 = 1,320 RON ✅                  │
└──────────────────────────────────────────────────────────┘
```

## ✅ All Three Tables Now Consistent

| Feature | Materials | Equipment | Labor |
|---------|-----------|-----------|-------|
| Consum Normat | ✅ | ✅ | ✅ |
| Marjă % | ✅ | ✅ | ✅ |
| Auto-calc Cantitate | ✅ | ✅ | ✅ |
| Auto-calc Valoare | ✅ | ✅ | ✅ |
| Color-coded Margin | ✅ | ✅ | ✅ |
| Inline Editing | ✅ | ✅ | ✅ |
| Calculation Breakdown | ✅ | ✅ | ✅ |

## 🎉 Benefits

1. **Consistent Interface**: All resource types use the same consumption tracking model
2. **Realistic Budgeting**: Account for inefficiencies, setup time, breaks
3. **Flexibility**: Support both positive margins (buffers) and negative margins (efficiencies)
4. **Transparency**: See exactly how quantities are calculated
5. **Easy Editing**: Click and type directly in the table

## 📁 Files Modified

**frontend/src/modules/projects/FisaOperatieModal.tsx**
- Lines 107-141: Updated `EchipamentItem` and `ManoperaItem` interfaces
- Lines 917-943: Updated `handleSelectEquipment` and `handleSelectLabor`
- Lines 963-1012: Added `updateEquipmentField` and `updateLaborField` functions
- Lines 1427-1540: Updated `echipamenteColumns` with editable fields
- Lines 1582-1695: Updated `manoperaColumns` with editable fields
- Lines 540-565: Updated equipment/labor loading from project sheets
- Lines 658-680: Updated equipment/labor loading from templates

