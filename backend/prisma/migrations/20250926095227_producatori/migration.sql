-- CreateTable
CREATE TABLE "Producator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'activ',
    "adresa" TEXT,
    "contBancar" TEXT,
    "banca" TEXT,
    "email" TEXT,
    "telefon" TEXT,
    "site" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Producator_name_key" ON "Producator"("name");

-- CreateIndex
CREATE INDEX "Producator_status_idx" ON "Producator"("status");
