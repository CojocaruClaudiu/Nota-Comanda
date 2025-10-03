-- Add composite index for optimized unique material queries
CREATE INDEX IF NOT EXISTS "Material_code_createdAt_idx" ON "Material"(code, "createdAt" DESC);

-- Analyze table to update query planner statistics
ANALYZE "Material";
