-- Check for duplicate materials with code 46252
SELECT 
    code, 
    "supplierName", 
    price, 
    "purchaseDate", 
    COUNT(*) as duplicate_count
FROM "Material" 
WHERE code = '46252' 
GROUP BY code, "supplierName", price, "purchaseDate"
ORDER BY "purchaseDate" DESC;

-- Get total count for this code
SELECT COUNT(*) as total_records FROM "Material" WHERE code = '46252';

-- Check overall duplicates (same code + supplier + price + date)
SELECT 
    code,
    "supplierName",
    price,
    "purchaseDate",
    COUNT(*) as duplicate_count
FROM "Material"
GROUP BY code, "supplierName", price, "purchaseDate"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;
