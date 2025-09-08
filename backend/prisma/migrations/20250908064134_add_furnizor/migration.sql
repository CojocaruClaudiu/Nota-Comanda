-- CreateTable
CREATE TABLE "Furnizor" (
    "id" TEXT NOT NULL,
    "denumire" TEXT NOT NULL,
    "cui_cif" TEXT NOT NULL,
    "nrRegCom" TEXT,
    "tip" TEXT NOT NULL,
    "tva" BOOLEAN NOT NULL,
    "tvaData" TIMESTAMP(3),
    "adresa" TEXT NOT NULL,
    "oras" TEXT NOT NULL,
    "judet" TEXT NOT NULL,
    "tara" TEXT NOT NULL,
    "contactNume" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "site" TEXT,
    "metodaPlata" TEXT NOT NULL,
    "termenPlata" INTEGER NOT NULL,
    "contBancar" TEXT NOT NULL,
    "banca" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notite" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Furnizor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Furnizor_denumire_key" ON "Furnizor"("denumire");

-- CreateIndex
CREATE UNIQUE INDEX "Furnizor_cui_cif_key" ON "Furnizor"("cui_cif");
