# Materials Import - Safety Guide

## Database Backup ✅

**Last Backup:** `nota_backup_2025-10-10_153931.dump` (491.79 KB)

### Backup Features:
- ✅ Automatic backup before import
- ✅ Keeps last 7 backups (weekly rotation)
- ✅ Timestamped files for easy identification
- ✅ PostgreSQL custom format (.dump)

### How to Restore a Backup:
```bash
cd backend
# Restore from specific backup file
pg_restore -h localhost -p 5432 -U postgres -d nota -c backups/nota_backup_2025-10-10_153931.dump
```

## Duplicate Prevention System

The import script has **THREE levels of duplicate prevention**:

### Level 1: Excel File Deduplication
```typescript
// Creates unique key: product + supplier + price + date
const key = `${idProd}|${supplierName}|${supplierId}|${price}|${dateKey}`;
```

**Removes:** Exact duplicate rows in the Excel file
- Same product code
- Same supplier
- Same price
- Same date

### Level 2: Database Check (NEW!)
```typescript
const existing = await prisma.material.findFirst({
  where: {
    code: code,
    description: description,
    supplierName: supplierName || null,
    price: price,
    purchaseDate: purchaseDate,
    invoiceNumber: invoiceNumber || null,
  },
});

if (existing) {
  // Skip this material - already in database
  continue;
}
```

**Prevents:** Re-importing materials that already exist in database
- Checks code, description, supplier, price, date, and invoice number
- Skips creation if exact match found
- Shows message for first 5 skipped items

### Level 3: Database Constraints
The Prisma schema allows multiple entries with:
- Same code (different purchases from different suppliers)
- Same description (different suppliers/prices/dates)
- Different prices (price history tracking)
- Different dates (purchase history)

## Import Process Flow

```
1. Read Excel File
   ↓
2. Filter MATERIALE category
   ↓
3. Deduplicate Excel rows (Level 1)
   ↓
4. For each unique row:
   ├─ Check if already in DB (Level 2)
   ├─ If exists → Skip
   └─ If new → Create
   ↓
5. Show Summary Report
```

## What Gets Imported

From each Excel row:
- ✅ `id_prod` → `code`
- ✅ `denumire_produs` → `description`
- ✅ `den_tert` → `supplierName`
- ✅ `id_tert` → `supplierId`
- ✅ `pret_in` → `price`
- ✅ `data` → `purchaseDate`
- ✅ `nr_fact` → `invoiceNumber` **(NEW!)**
- ✅ `cant` → `receivedQuantity` **(NEW!)**
- ✅ Auto-detected → `unit` (from description)
- ✅ Default → `currency` (RON)
- ✅ Default → `active` (true)

## Import Summary Report

After import completes, you'll see:
```
=== Import Summary ===
Materials Created: XXX
Materials Skipped: XXX
Total Processed: XXX
NOTE: Exact duplicates removed. Different purchases preserved.

=== Sample of Imported Materials ===
Last 10 materials imported:
1. CODE - Description...
   Supplier: Name | Unit: buc | Price: 100.00 RON
   Invoice: NR123 | Quantity: 50.00
```

## Safe Re-Import

You can safely run the import multiple times:
- ✅ Existing materials won't be duplicated
- ✅ Only new purchases will be added
- ✅ Price history is preserved
- ✅ Different suppliers/dates create separate entries

## Before Running Import

1. ✅ Backup created automatically
2. ✅ Duplicate prevention active
3. ✅ Database constraints in place
4. ✅ Ready to import safely!

## Command to Run

```bash
cd backend
npm run seed:materials
```

Or with custom file:
```bash
npm run seed:materials path/to/file.xls
```

## After Import

Check the Registru Recepții page to view:
- All imported materials with reception data
- Filter by type (Șantier/Magazie)
- View invoice numbers and quantities
- Sort by date, supplier, or material

---

**Status:** Safe to proceed with import! 🟢
