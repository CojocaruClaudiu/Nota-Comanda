# Project Sheet Unit Price from Recipe - IMPLEMENTED ✅

**Date:** October 8, 2025  
**Feature:** Auto-calculate unit price from Fișa Operație recipe

---

## 🎯 Problem

User workflow was incorrect:
- ❌ User manually entered **both** quantity AND unitPrice in Project Sheet
- ❌ Unit price should come from the **recipe** (Fișa Operație), not manual entry
- ❌ No connection between recipe costs and project sheet pricing

## ✅ Solution

**Correct workflow:**
1. User enters **quantity** in Project Sheet (e.g., "5 m² of Aplicat piatra")
2. User clicks **Edit** (✏️) to open Fișa Operație
3. Fișa Operație shows the **recipe** (materials, labor, equipment, consumables)
4. User saves the recipe
5. **Unit price is auto-calculated** from recipe total and set in Project Sheet
6. **Total price** = quantity × unitPrice (auto-calculated)

---

## 📊 Implementation Details

### 1. **Recipe Total Calculation** (FisaOperatieModal.tsx)

Added a `useMemo` to calculate the total cost of all recipe items:

```typescript
// Calculate total recipe cost (sum of all items)
const totalRecipeCost = useMemo(() => {
  const materialTotal = materiale.reduce((sum, item) => sum + item.valoare, 0);
  const consumableTotal = consumabile.reduce((sum, item) => sum + item.valoare, 0);
  const equipmentTotal = echipamente.reduce((sum, item) => sum + item.valoare, 0);
  const laborTotal = manopera.reduce((sum, item) => sum + item.valoare, 0);
  return materialTotal + consumableTotal + equipmentTotal + laborTotal;
}, [materiale, consumabile, echipamente, manopera]);
```

**This calculates:**
```
Total Recipe Cost = Materials + Consumables + Equipment + Labor
```

### 2. **Callback Mechanism** (FisaOperatieModal.tsx)

Added optional callback prop to pass calculated price back to parent:

```typescript
interface FisaOperatieModalProps {
  open: boolean;
  onClose: () => void;
  operationName: string;
  operationId?: string;
  projectId?: string;
  onRecipeCalculated?: (unitPrice: number) => void; // ⭐ NEW
}
```

After saving recipe, calls the callback:

```typescript
// Call callback with calculated unit price if provided
if (onRecipeCalculated && totalRecipeCost > 0) {
  onRecipeCalculated(totalRecipeCost);
}

onClose();
```

### 3. **Auto-Update Unit Price** (ProjectSheetModal.tsx)

When Fișa Operație is saved, automatically updates the unit price:

```typescript
<FisaOperatieModal
  open={showFisaOperatie}
  onClose={() => {
    setShowFisaOperatie(false);
    setSelectedOperationForFisa(null);
  }}
  operationId={selectedOperationForFisa.operationItemId}
  operationName={selectedOperationForFisa.operationName}
  projectId={devizLine?.projectId}
  onRecipeCalculated={(unitPrice) => {
    // ⭐ Update the operation's unit price with calculated recipe cost
    if (selectedOperationForFisa) {
      handleUpdateOperation(selectedOperationForFisa.id, { unitPrice });
    }
  }}
/>
```

### 4. **Read-Only Unit Price Column**

Made unit price **non-editable** with visual indicator:

```typescript
{
  accessorKey: 'unitPrice',
  header: 'Preț unitar (din rețetă)',
  size: 150,
  enableEditing: false, // ⭐ Read-only
  Cell: ({ cell, row }) => {
    const val = cell.getValue<number | null>();
    const hasRecipe = row.original.operationItemId; // Has recipe if operationItemId exists
    return (
      <Tooltip title={hasRecipe ? "Calculat din Fișa Operație" : "Fără rețetă definită"}>
        <Typography 
          variant="body2" 
          sx={{ 
            color: hasRecipe ? 'success.main' : 'text.secondary', // Green if has recipe
            fontStyle: hasRecipe ? 'normal' : 'italic' // Italic if no recipe
          }}
        >
          {val != null ? val.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) : '—'}
        </Typography>
      </Tooltip>
    );
  },
}
```

**Visual indicators:**
- ✅ **Green color** - Has recipe (operationItemId exists)
- ⚠️ **Gray italic** - No recipe defined
- 💬 **Tooltip** - Explains where price comes from

---

## 🔄 Complete User Flow

### **Scenario: Apply stone for 5 square meters**

**Step 1: Add Operation**
```
Project Sheet → Click "Adaugă operație"
              → Select "Aplicat piatra" (operationItemId: abc-123)
              → Operation added to table
```

**Step 2: Enter Quantity**
```
Cantitate: [5] m²
Preț unitar: [—] (not set yet - gray italic)
Total: [—]
```

**Step 3: Define Recipe**
```
Click ✏️ Edit → Fișa Operație opens
Add materials:
  - Adeziv: 0.5 kg × 10 RON = 5 RON
  - Piatra: 5 buc × 15 RON = 75 RON
Add labor:
  - Muncitor: 2 ore × 25 RON = 50 RON
Add equipment:
  - Mistrie: 0.5 ore × 5 RON = 2.5 RON

Total Recipe Cost = 5 + 75 + 50 + 2.5 = 132.5 RON
```

**Step 4: Save Recipe**
```
Click "Salvează Template" → Recipe saved
                         → Callback triggered: onRecipeCalculated(132.5)
                         → Unit price auto-updated ✅
```

**Step 5: See Final Calculation**
```
Cantitate: 5 m²
Preț unitar: 132.5 RON (green - "Calculat din Fișa Operație")
Total: 662.5 RON (auto-calculated: 5 × 132.5)
```

---

## 📝 Files Modified

### **Frontend:**

**`frontend/src/modules/projects/FisaOperatieModal.tsx`:**
- ✅ Added `onRecipeCalculated?: (unitPrice: number) => void` prop
- ✅ Added `totalRecipeCost` useMemo calculation
- ✅ Call callback with `totalRecipeCost` after saving
- ✅ Import `useMemo` from React

**`frontend/src/modules/projects/ProjectSheetModal.tsx`:**
- ✅ Pass `onRecipeCalculated` callback to FisaOperatieModal
- ✅ Auto-update `unitPrice` when recipe is saved
- ✅ Made `unitPrice` column read-only (`enableEditing: false`)
- ✅ Added visual indicators (green for recipe, gray for manual)
- ✅ Added Tooltip import and tooltips to explain pricing
- ✅ Updated column header to "Preț unitar (din rețetă)"

---

## 🎨 UX Improvements

### **Before:**
- ❌ User confused about what to enter in unit price
- ❌ No connection between recipe and pricing
- ❌ Manual calculation errors
- ❌ No indication of where price comes from

### **After:**
- ✅ **Clear workflow:** Quantity → Recipe → Auto-calculated price
- ✅ **Visual feedback:** Green = from recipe, Gray = not set
- ✅ **Tooltips:** Explains "Calculat din Fișa Operație"
- ✅ **Read-only:** Prevents accidental manual edits
- ✅ **Auto-update:** Price updates immediately after recipe save

---

## 💡 Recipe Calculation Formula

```
Unit Price = Materials + Consumables + Equipment + Labor

Where each category total is:
  Materials Total = Σ (quantity × unitPrice) for all materials
  Consumables Total = Σ (quantity × unitPrice) for all consumables
  Equipment Total = Σ (quantity × unitPrice) for all equipment
  Labor Total = Σ (quantity × unitPrice) for all labor

Then:
  Total Project Cost = Quantity × Unit Price
```

**Example:**
```
Recipe for "Aplicat piatra" (per 1 m²):
  Materials: 80 RON
  Consumables: 5 RON
  Equipment: 2.5 RON
  Labor: 45 RON
  ─────────────────
  Unit Price = 132.5 RON/m²

Project needs 5 m²:
  Total = 5 × 132.5 = 662.5 RON
```

---

## 🧪 Testing Checklist

- [ ] **Add operation with recipe:**
  - [ ] Unit price shows "—" (gray, italic)
  - [ ] Click edit → Fișa Operație opens
  - [ ] Add materials/labor/equipment
  - [ ] Save recipe
  - [ ] Unit price updates automatically ✅
  - [ ] Unit price shows in green
  - [ ] Tooltip shows "Calculat din Fișa Operație"

- [ ] **Auto-calculation:**
  - [ ] Enter quantity (e.g., 5)
  - [ ] Total = quantity × unitPrice ✅
  - [ ] Updates when quantity changes

- [ ] **Visual indicators:**
  - [ ] Operation with recipe: green text
  - [ ] Operation without recipe: gray italic
  - [ ] Tooltip explains price source

- [ ] **Price refresh:**
  - [ ] Edit recipe → change material prices
  - [ ] Save recipe
  - [ ] Unit price updates in project sheet ✅

- [ ] **Read-only enforcement:**
  - [ ] Try to edit unit price column
  - [ ] Should be disabled/read-only ✅

---

## 🔮 Future Enhancements

### **Markup & Discounts:**
Currently, unit price = raw recipe cost. Could add:
```typescript
Unit Price = (Recipe Cost × (1 + Markup%)) × (1 - Discount%)
```

Example:
```
Recipe Cost: 100 RON
Markup: 20%
Discount: 5%

Unit Price = 100 × 1.20 × 0.95 = 114 RON
```

### **Quantity-Based Pricing:**
For bulk discounts:
```
if (quantity > 100) unitPrice *= 0.9; // 10% discount
```

### **Template Selection:**
Allow selecting different recipe templates:
```
"Rețeta Standard" → 132.5 RON/m²
"Rețeta Premium" → 180 RON/m²
"Rețeta Economy" → 95 RON/m²
```

### **Price History:**
Track price changes over time:
```
2025-10-01: 125 RON (Material price increase)
2025-09-15: 120 RON (Labor rate update)
2025-09-01: 115 RON (Initial)
```

---

## 🎉 Status

**COMPLETE AND READY FOR TESTING** ✅

### **Key Benefits:**
1. ✅ **Automated pricing** from recipes
2. ✅ **Eliminates manual errors**
3. ✅ **Clear visual feedback**
4. ✅ **Maintains price accuracy** (auto-updates with recipe)
5. ✅ **Prevents accidental changes** (read-only)

### **User Impact:**
- **Before:** Manual calculation, error-prone, unclear origin
- **After:** Automatic, accurate, transparent, recipe-driven

---

**Next Steps:**
1. User testing with real projects
2. Verify calculations match expectations
3. Gather feedback on workflow
4. Consider adding markup/discount support

