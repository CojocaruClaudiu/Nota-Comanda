-- Check for ProjectOperationSheet records with invalid operationId references
SELECT pos.id, pos."operationId", pos."projectId"
FROM "ProjectOperationSheet" pos
LEFT JOIN "OperationItem" oi ON pos."operationId" = oi.id
WHERE oi.id IS NULL;
