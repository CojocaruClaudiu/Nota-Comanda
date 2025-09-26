-- CreateTable
CREATE TABLE "LaborLine" (
    "id" TEXT NOT NULL,
    "qualificationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'ora',
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'RON',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaborLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LaborLine_qualificationId_idx" ON "LaborLine"("qualificationId");

-- CreateIndex
CREATE UNIQUE INDEX "LaborLine_qualificationId_name_key" ON "LaborLine"("qualificationId", "name");

-- AddForeignKey
ALTER TABLE "LaborLine" ADD CONSTRAINT "LaborLine_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "Qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
