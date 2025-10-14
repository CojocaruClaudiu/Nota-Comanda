-- Backfill supplier, packageSize, and packageUnit for existing ProjectDevizMaterial records
-- by looking up data from the Material table

-- Update existing ProjectDevizMaterial records with supplier and package info from Material table
UPDATE "ProjectDevizMaterial" pdm
SET 
  supplier = m."supplierName",
  "packageSize" = CASE 
    WHEN m."packQuantity" IS NOT NULL 
      AND m."packQuantity"::TEXT != '' 
      AND m."packQuantity"::TEXT ~ '^[0-9]+\.?[0-9]*$'
    THEN m."packQuantity"::DOUBLE PRECISION 
    ELSE NULL 
  END,
  "packageUnit" = CASE 
    WHEN m."packUnit" IS NOT NULL AND TRIM(m."packUnit") != ''
    THEN m."packUnit"
    ELSE NULL
  END
FROM "Material" m
WHERE 
  pdm."materialCode" = m.code
  AND (
    pdm.supplier IS NULL 
    OR pdm."packageSize" IS NULL 
    OR pdm."packageUnit" IS NULL
  );

-- Show how many records were updated
SELECT 
  COUNT(*) as updated_records,
  COUNT(CASE WHEN supplier IS NOT NULL THEN 1 END) as with_supplier,
  COUNT(CASE WHEN "packageSize" IS NOT NULL THEN 1 END) as with_package_size,
  COUNT(CASE WHEN "packageUnit" IS NOT NULL THEN 1 END) as with_package_unit
FROM "ProjectDevizMaterial";
