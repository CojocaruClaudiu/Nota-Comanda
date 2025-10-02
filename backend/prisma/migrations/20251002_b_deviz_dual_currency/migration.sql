-- AlterTable: Update ProjectDevizLine structure for dual currency
ALTER TABLE "ProjectDevizLine" DROP COLUMN IF EXISTS "name";
ALTER TABLE "ProjectDevizLine" DROP COLUMN IF EXISTS "unit";
ALTER TABLE "ProjectDevizLine" DROP COLUMN IF EXISTS "quantity";
ALTER TABLE "ProjectDevizLine" DROP COLUMN IF EXISTS "unitPrice";
ALTER TABLE "ProjectDevizLine" DROP COLUMN IF EXISTS "totalPrice";

ALTER TABLE "ProjectDevizLine" ADD COLUMN IF NOT EXISTS "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProjectDevizLine" ADD COLUMN IF NOT EXISTS "priceLei" DOUBLE PRECISION;
ALTER TABLE "ProjectDevizLine" ADD COLUMN IF NOT EXISTS "priceEuro" DOUBLE PRECISION;
ALTER TABLE "ProjectDevizLine" ADD COLUMN IF NOT EXISTS "vatPercent" DOUBLE PRECISION;
ALTER TABLE "ProjectDevizLine" ADD COLUMN IF NOT EXISTS "priceWithVatLei" DOUBLE PRECISION;
ALTER TABLE "ProjectDevizLine" ADD COLUMN IF NOT EXISTS "priceWithVatEuro" DOUBLE PRECISION;
