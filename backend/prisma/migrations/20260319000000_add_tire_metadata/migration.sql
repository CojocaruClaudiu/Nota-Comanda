-- Add tire metadata fields to Car table
ALTER TABLE "public"."Car" ADD COLUMN IF NOT EXISTS "winterTireName" TEXT;
ALTER TABLE "public"."Car" ADD COLUMN IF NOT EXISTS "winterTireDimensions" TEXT;
ALTER TABLE "public"."Car" ADD COLUMN IF NOT EXISTS "summerTireName" TEXT;
ALTER TABLE "public"."Car" ADD COLUMN IF NOT EXISTS "summerTireDimensions" TEXT;

-- Add tire metadata fields to CarTireHistory table
ALTER TABLE "public"."CarTireHistory" ADD COLUMN IF NOT EXISTS "tireName" TEXT;
ALTER TABLE "public"."CarTireHistory" ADD COLUMN IF NOT EXISTS "tireDimensions" TEXT;
ALTER TABLE "public"."CarTireHistory" ADD COLUMN IF NOT EXISTS "note" TEXT;
