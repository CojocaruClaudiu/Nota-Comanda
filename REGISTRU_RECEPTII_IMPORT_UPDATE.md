# Registru Recepții - Import Enhancement

## Overview
Updated the materials import script to include invoice number and received quantity fields from the Excel `.temp` file.

## Changes Made

### 1. Backend - Import Script (`backend/scripts/import-materials.ts`)

Added extraction and import of two new fields:

#### Invoice Number (nr_fact)
```typescript
const invoiceNumber = norm(r.nr_fact || r.nr_factura || r.factura || r.invoice);
```
- Tries multiple column names: `nr_fact`, `nr_factura`, `factura`, `invoice`
- Stores in `invoiceNumber` field in database

#### Received Quantity (cant)
```typescript
let receivedQuantity: number | null = null;
const cantStr = norm(r.cant || r.cantitate || r.quantity);
if (cantStr) {
  const cantValue = parseFloat(cantStr.replace(',', '.').replace(/[^\d.]/g, ''));
  if (!isNaN(cantValue) && cantValue > 0) {
    receivedQuantity = cantValue;
  }
}
```
- Tries multiple column names: `cant`, `cantitate`, `quantity`
- Normalizes decimal separator (comma to dot)
- Validates positive number
- Stores in `receivedQuantity` field in database

### 2. Database Schema

The Material model already has these fields defined:
```prisma
model Material {
  // ... other fields
  invoiceNumber    String?                        // Nr. Factură
  receivedQuantity Decimal?  @db.Decimal(12, 4)  // Cantitate recepționată
  // ... other fields
}
```

### 3. Frontend - API Types (`frontend/src/api/materials.ts`)

Updated interface to match field name:
```typescript
export interface Material {
  // ... other fields
  invoiceNumber?: string | null;
  receivedQuantity?: number | null;  // Changed from receptionQuantity
  receptionType?: 'SANTIER' | 'MAGAZIE' | null;
  manufacturer?: string | null;
  // ... other fields
}
```

### 4. Frontend - Registru Recepții Page

Updated column accessor:
```typescript
{
  accessorKey: 'receivedQuantity',  // Changed from receptionQuantity
  header: 'Cantitate',
  size: 120,
  Cell: ({ cell }) => {
    const val = cell.getValue<number>();
    return val != null ? val.toLocaleString('ro-RO', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 4 
    }) : '—';
  },
}
```

## Excel Column Mapping

The import script now looks for these columns in the `.temp` file:

| Excel Column | Database Field | Alternative Names |
|-------------|----------------|-------------------|
| `nr_fact` | `invoiceNumber` | `nr_factura`, `factura`, `invoice` |
| `cant` | `receivedQuantity` | `cantitate`, `quantity` |
| `data` | `purchaseDate` | `data_livrare` |
| `id_prod` | `code` | `cod_produs`, `cod_prod` |
| `denumire_produs` | `description` | `denumire_prod`, `den_prod` |
| `den_tert` | `supplierName` | - |
| `id_tert` | `supplierId` | - |
| `pret_in` | `price` | `pret`, `pret_unitar`, `price` |

## How to Import

Run the import script with your Excel file:

```bash
cd backend
npm run import:materials scripts/suppliers/temp.xls
```

Or specify a custom file path:

```bash
npm run import:materials path/to/your/file.xls
```

## Display in Registru Recepții

The Registru Recepții page now displays:
- ✅ **Data** - Purchase date from `purchaseDate`
- ✅ **Factură** - Invoice number from `invoiceNumber`
- ✅ **Furnizor** - Supplier name from `supplierName`
- ✅ **Producător** - Manufacturer from `manufacturer`
- ✅ **Cod** - Material code from `code`
- ✅ **Material** - Description from `description`
- ✅ **U.M.** - Unit of measure from `unit`
- ✅ **Cantitate** - Received quantity from `receivedQuantity`
- ✅ **Preț Unitar** - Unit price from `price` + `currency`
- ✅ **Tip Recepție** - Reception type (Șantier/Magazie) from `receptionType`

## Notes

- The import creates separate records for different purchase dates, suppliers, or prices
- Exact duplicates (same product, supplier, price, and date) are removed
- Materials are automatically categorized into groups based on keywords
- Unit of measure is auto-detected from the description
- All materials default to active status
- No manual addition of receptions is needed - all data comes from materials table
