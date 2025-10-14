# Necesar Aprovizionare Feature

## Overview
Added functionality to generate a "Necesar Aprovizionare" (Supply Requirements) document from the materials list in the DevizeModal component, with advanced packaging calculations and supplier tracking.

## Implementation Date
October 10, 2025

## Latest Update
Enhanced with supplier information and automatic package quantity calculations.

## Changes Made

### 1. **Enhanced MaterialItem Type**
Added three new optional fields:
- `supplier?: string` - Supplier/vendor name
- `packageSize?: number | null` - Package size (e.g., 25 for a 25kg bag)
- `packageUnit?: string` - Package unit of measurement (e.g., "kg", "buc")

### 2. **New Table Columns**
Added to the materials table:
- **Furnizor** (Supplier) - Text field for vendor name
- **Mărime Pachet** (Package Size) - Number field with unit display
- **UM Pachet** (Package Unit) - Text field for package measurement unit

### 3. **Smart Package Calculation**
The system automatically calculates required packages:
- **Example**: If you need 1760 kg and each bag contains 25 kg
- **Calculation**: 1760 ÷ 25 = 70.40 bags needed
- **Display**: Shows precisely how many packages to order

### 4. **Enhanced Excel Document**
The generated document now includes:

#### Header Section:
- Document title: "NECESAR APROVIZIONARE"
- Project information
- Operation details
- Generation date

#### Detailed Columns:
1. **Nr. Crt.** - Item number
2. **Cod Material** - Material code
3. **Descriere Material** - Material description
4. **Furnizor** - Supplier name
5. **UM** - Unit of measure
6. **Cantitate Necesară** - Required quantity
7. **Mărime Pachet** - Package size (e.g., "25.00 kg")
8. **Nr. Pachete Necesare** - Calculated packages needed
9. **Preț Unitar (LEI)** - Unit price
10. **Valoare Totală (LEI)** - Total value

#### Financial Summary:
- Total materials
- Markup percentage and amount
- Discount percentage and amount
- Final total

### 5. **UI Enhancements**
- Package size displays with unit (e.g., "25.00 kg")
- All new fields are editable in the table
- Romanian number formatting (comma as decimal separator)
- Professional column widths optimized for readability

## How to Use

### Basic Usage:
1. Open any project's Devize modal
2. Navigate to "Lista Necesar Materiale Proiect" tab
3. Add materials using "Adaugă Material"
4. Fill in material details

### Enhanced Package Tracking:
1. Enter the **Furnizor** (supplier name)
2. Enter **Mărime Pachet** (e.g., 25 for a 25kg bag)
3. Enter **UM Pachet** (e.g., "kg" for kilograms)
4. The document will automatically calculate packages needed

### Example:
```
Material: ADEZ. BAUMACOL FLEX MARMOR/25KG
Supplier: Baumit Romania
Quantity Needed: 1760 kg
Package Size: 25 kg
→ Automatic calculation: 70.40 bags needed
```

### Generate Document:
5. Click "Necesar Aprovizionare" button
6. Excel file downloads automatically

## Document Example

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ NECESAR APROVIZIONARE                                                         │
│ Proiect: Casa Popescu                                                         │
│ Operație: 01.01 - Zidărie exterioară                                         │
│ Data: 10.10.2025                                                              │
├────────────────────────────────────────────────────────────────────────────────┤
│Nr│Cod    │Descriere        │Furnizor  │UM │Cant.│Pachet │Pachete│Preț│Valoare│
├────────────────────────────────────────────────────────────────────────────────┤
│1 │30125  │BAUMACOL FLEX    │Baumit    │kg │1760 │25.00kg│70.40  │2.37│4171.20│
│2 │19338  │NIPLU            │Dedeman   │buc│176  │—      │—      │10.92│1921.92│
├────────────────────────────────────────────────────────────────────────────────┤
│                                              TOTAL MATERIALE:      6093.12     │
│                                              Adaos (20%):          1218.62     │
│                                              Discount (10%):       -731.17     │
│                                              TOTAL FINAL:          6580.57     │
└────────────────────────────────────────────────────────────────────────────────┘
```

## Benefits

### Original Features:
1. **Professional Documentation**: Standard procurement documents
2. **Time Saving**: Automatic compilation
3. **Accuracy**: Real-time data
4. **Traceability**: Complete project details
5. **Financial Transparency**: All cost components

### New Enhanced Features:
6. **Supplier Tracking**: Know exactly where to order each material
7. **Smart Package Calculation**: Automatic conversion from quantity to packages
8. **Precise Ordering**: Eliminates manual calculations
9. **Flexible Units**: Supports different package sizes and units
10. **No Guesswork**: Clear display of exact packages needed

## Real-World Example

### Scenario:
You need to order adhesive for a construction project:

**Material**: ADEZ. BAUMACOL FLEX MARMOR/25KG
- **Quantity Needed**: 1760 kg
- **Supplier**: Baumit Romania
- **Package Size**: 25 kg per bag
- **Unit Price**: 2.37 LEI per kg

**What the System Does**:
1. Calculates: 1760 kg ÷ 25 kg/bag = **70.40 bags**
2. Shows you need to order **71 bags** (rounding up for complete packages)
3. Displays total cost: 1760 × 2.37 = **4,171.20 LEI**
4. Includes supplier name for easy ordering

**Result**: You know exactly:
- ✓ How many bags to order (71)
- ✓ From which supplier (Baumit Romania)
- ✓ Total cost (4,171.20 LEI)
- ✓ No manual calculations needed!

## Technical Details

- **Library Used**: `xlsx` (already in project dependencies)
- **File Format**: Excel (.xlsx)
- **Encoding**: UTF-8 with Romanian characters support
- **Number Format**: Romanian locale with 2 decimal places
- **Column Count**: Expanded from 7 to 10 columns
- **Auto-sizing**: Yes, optimized for new columns
- **Package Calculation**: quantity ÷ packageSize with 2 decimals

## Future Enhancements (Optional)

1. **Auto-rounding**: Option to round up package quantities
2. **Multi-supplier comparison**: Track prices from different suppliers
3. **Inventory integration**: Link to current stock levels
4. **Order templates**: Generate purchase orders directly
5. **Supplier contacts**: Include phone/email in document
6. **Delivery tracking**: Add expected delivery dates
7. **Minimum order quantities**: Alert for MOQ requirements
8. **Bulk discounts**: Calculate savings for larger orders

## Testing Checklist

- [x] Button appears in materials tab
- [x] Button disabled when no materials exist
- [x] Excel file downloads correctly
- [x] All material data included
- [x] Supplier field editable
- [x] Package size field editable
- [x] Package unit field editable
- [x] Package calculation accurate
- [x] Romanian number formatting correct
- [x] Column widths appropriate
- [x] Package size displays with unit
- [x] Financial calculations accurate
- [x] File naming correct

## Migration Notes

**Existing Data**: 
- The new fields are optional
- Existing materials will work without supplier/package info
- Documents will show "—" for empty package calculations
- No data migration required

**Backward Compatibility**:
- ✓ Fully compatible with existing materials
- ✓ No breaking changes
- ✓ Optional feature enhancement

## Related Files

- `frontend/src/modules/projects/DevizeModal.tsx` - Main implementation
- `frontend/package.json` - xlsx dependency

## Support for Different Package Types

The system supports various packaging scenarios:

1. **Bags/Sacks** (e.g., cement, adhesive)
   - Package Size: 25, Unit: kg
   - Calculates bags from kg needed

2. **Boxes** (e.g., screws, nails)
   - Package Size: 100, Unit: buc (pieces)
   - Calculates boxes from pieces needed

3. **Pallets** (e.g., bricks, blocks)
   - Package Size: 500, Unit: buc
   - Calculates pallets from pieces needed

4. **Rolls** (e.g., insulation, membrane)
   - Package Size: 50, Unit: m²
   - Calculates rolls from m² needed

5. **No Packaging** (sold individually)
   - Leave package size empty
   - Shows "—" in document
