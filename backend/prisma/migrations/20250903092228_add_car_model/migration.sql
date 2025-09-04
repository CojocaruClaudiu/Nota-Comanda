-- CreateEnum
CREATE TYPE "public"."FuelType" AS ENUM ('MOTORINA', 'BENZINA', 'BENZINA_GPL', 'HIBRID_MOTORINA', 'HIBRID_BENZINA', 'ELECTRIC', 'ALT');

-- CreateTable
CREATE TABLE "public"."Car" (
    "id" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "an" INTEGER NOT NULL,
    "culoare" TEXT,
    "placute" TEXT NOT NULL,
    "driverId" TEXT,
    "driverNote" TEXT,
    "combustibil" "public"."FuelType",
    "expItp" TIMESTAMP(3),
    "expRca" TIMESTAMP(3),
    "expRovi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Car_vin_key" ON "public"."Car"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "Car_placute_key" ON "public"."Car"("placute");

-- CreateIndex
CREATE INDEX "Car_expItp_idx" ON "public"."Car"("expItp");

-- CreateIndex
CREATE INDEX "Car_expRca_idx" ON "public"."Car"("expRca");

-- CreateIndex
CREATE INDEX "Car_expRovi_idx" ON "public"."Car"("expRovi");

-- AddForeignKey
ALTER TABLE "public"."Car" ADD CONSTRAINT "Car_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
