-- Add RCA direct settlement flag for cars
ALTER TABLE "public"."Car" ADD COLUMN IF NOT EXISTS "rcaDecontareDirecta" BOOLEAN DEFAULT false;
