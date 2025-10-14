-- Check the backfilled data
SELECT 
  "materialCode", 
  "materialDescription", 
  supplier, 
  "packageSize", 
  "packageUnit", 
  unit 
FROM "ProjectDevizMaterial" 
LIMIT 5;
