# Material Pack & Cost Unitar - Bug Fixes

## 🐛 Issues Fixed

### 1. App Crash on Field Edit
**Problem:** Editing "Consum Normat" or "Marjă %" crashed the app

**Root Cause:** Using `muiTableBodyCellEditTextFieldProps` with `onChange` triggered updates during render, causing React errors.

**Solution:** Replaced with custom `TextField` components in the `Cell` renderer:
```tsx
Cell: ({ row }) => (
  <TextField
    type="number"
    value={row.original.consumNormat}
    onChange={(e) => {
      const newValue = parseFloat(e.target.value) || 0;
      updateMaterialField(row.original.id, 'consumNormat', newValue);
    }}
    size="small"
    inputProps={{ step: '0.01', style: { textAlign: 'right' }}}
    sx={{ width: '100%' }}
  />
)
```

### 2. Prices Reverting After Save
**Problem:** After saving, `valoare` field showed full pack price instead of calculated unit price

**Root Cause:** When loading data back from API, we weren't properly reconstructing the `packPrice`, so `costUnitar` wasn't calculated correctly.

**Solution:** Calculate `packPrice` when loading:
```typescript
const packQty = item.packQuantity ?? null;
const costUnitar = item.unitPrice;
const packPrice = (packQty && packQty > 0) ? costUnitar * packQty : null;
```

This ensures:
- `costUnitar` = saved unit price (e.g., 2.49 RON/KG)
- `packPrice` = reconstructed pack price (e.g., 62.25 RON)
- `packQuantity` = pack size (e.g., 25 KG)

## ✅ Current Behavior

### Material Table - Working State

| Field | Type | Source | Example |
|-------|------|--------|---------|
| **Cod** | Display | Material master | M01 |
| **Descriere** | Display | Material master | FLEX MARMOR |
| **Consum Normat** | ✏️ **Editable** | User input | 10.0000 KG |
| **Cost Unitar** | Display | `packPrice / packQuantity` | 2.49 RON/KG<br>(62.25/25KG) |
| **Marjă %** | ✏️ **Editable** | User input | +15.00% |
| **Cantitate** | Calculated | `consumNormat × (1 + marjă/100)` | 11.5000 KG |
| **Valoare** | Calculated | `cantitate × costUnitar` | 28.64 RON |

### Data Flow - Corrected

```
┌─────────────────────────────────────────────────────┐
│ 1. SELECT MATERIAL                                  │
├─────────────────────────────────────────────────────┤
│ From Material Master:                               │
│   • price = 62.25 RON (pack price)                  │
│   • packQuantity = 25 KG                            │
│   • packUnit = "KG"                                 │
│                                                     │
│ Calculate:                                          │
│   • costUnitar = 62.25 / 25 = 2.49 RON/KG          │
│   • consumNormat = 1 (default)                      │
│   • marjaConsum = 0% (default)                      │
│   • cantitate = 1 × (1 + 0/100) = 1                │
│   • valoare = 1 × 2.49 = 2.49 RON                  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. EDIT FIELDS                                      │
├─────────────────────────────────────────────────────┤
│ User changes:                                       │
│   • consumNormat = 10 KG                            │
│   • marjaConsum = +15%                              │
│                                                     │
│ Auto-recalculate:                                   │
│   • cantitate = 10 × (1 + 15/100) = 11.5 KG        │
│   • valoare = 11.5 × 2.49 = 28.64 RON              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. SAVE TO BACKEND                                  │
├─────────────────────────────────────────────────────┤
│ POST /operation-sheets/projects/{id}/operations/{id}│
│ {                                                   │
│   items: [{                                         │
│     type: 'MATERIAL',                               │
│     code: 'M01',                                    │
│     name: 'FLEX MARMOR',                            │
│     unit: 'KG',                                     │
│     quantity: 11.5,      // final calculated qty    │
│     price: 2.49,         // cost unitar             │
│     packQuantity: 25,    // reference info          │
│     packUnit: 'KG'       // reference info          │
│   }]                                                │
│ }                                                   │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 4. LOAD FROM BACKEND                                │
├─────────────────────────────────────────────────────┤
│ Received from API:                                  │
│   • quantity = 11.5                                 │
│   • unitPrice = 2.49                                │
│   • packQuantity = 25                               │
│   • packUnit = 'KG'                                 │
│                                                     │
│ Reconstruct:                                        │
│   • costUnitar = unitPrice = 2.49                   │
│   • packPrice = 2.49 × 25 = 62.25 ✅                │
│   • consumNormat = quantity = 11.5 (approximate)    │
│   • marjaConsum = 0 (can't reverse-engineer)        │
│   • cantitate = 11.5                                │
│   • valoare = 11.5 × 2.49 = 28.64 RON ✅            │
└─────────────────────────────────────────────────────┘
```

## 📝 Important Notes

### Limitation: Margin Not Persisted
Currently, `marjaConsum` (margin percentage) is **not saved** to the backend. When you reload the data:
- ✅ `costUnitar` is correctly preserved
- ✅ `cantitate` (final quantity) is preserved
- ✅ `valoare` is correctly calculated
- ❌ `marjaConsum` resets to 0%
- ❌ `consumNormat` becomes equal to `cantitate`

**Why?** The backend schema only stores `quantity` and `price`. It doesn't have fields for `consumNormat` and `marjaConsum`.

### Workaround
Users need to remember their margin settings if they want to re-edit. The final calculated values are still correct.

### Future Enhancement
To persist margins, you would need to:
1. Add `consumNormat` and `marjaConsum` columns to `OperationSheetItem` table
2. Update API to accept these fields
3. Save and load them alongside `quantity` and `price`

## 🎯 Testing Checklist

- [x] ✅ Select material → cost unitar calculated from pack price
- [x] ✅ Edit "Consum Normat" → no crash, values update
- [x] ✅ Edit "Marjă %" → no crash, cantitate and valoare update
- [x] ✅ Positive margin (+15%) → shown in green
- [x] ✅ Negative margin (-10%) → shown in red
- [x] ✅ Save operation sheet → saves correctly
- [x] ✅ Reload after save → cost unitar and valoare preserved
- [x] ✅ Pack info displayed under cost unitar (e.g., "62.25/25KG")
- [x] ✅ Calculation shown in cantitate when margin applied

## 🔧 Files Modified

1. **frontend/src/modules/projects/FisaOperatieModal.tsx**
   - Lines 1104-1120: Changed "Consum Normat" from editable cell to TextField
   - Lines 1150-1175: Changed "Marjă %" from editable cell to TextField
   - Lines 1785-1805: Removed `enableEditing={true}` from table props
   - Lines 500-520: Fixed packPrice reconstruction in project sheet loading
   - Lines 620-640: Fixed packPrice reconstruction in template loading

## 🎉 Result

The material cost system now works smoothly:
- ✏️ **Editable fields** work without crashes
- 💰 **Costs calculated correctly** from pack prices  
- 💾 **Data persists** across save/reload
- 📊 **Visual feedback** shows all calculations clearly

