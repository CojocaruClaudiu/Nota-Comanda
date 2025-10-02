-- AlterTable
ALTER TABLE "public"."ProjectDevizLine" ALTER COLUMN "description" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."ProjectSheet" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "devizLineId" TEXT NOT NULL,
    "initiationDate" TIMESTAMP(3),
    "estimatedStartDate" TIMESTAMP(3),
    "estimatedEndDate" TIMESTAMP(3),
    "standardMarkupPercent" DOUBLE PRECISION,
    "standardDiscountPercent" DOUBLE PRECISION,
    "indirectCostsPercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectSheetOperation" (
    "id" TEXT NOT NULL,
    "projectSheetId" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "operationName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectSheetOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectDevizMaterial" (
    "id" TEXT NOT NULL,
    "devizLineId" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "operationCode" TEXT NOT NULL,
    "operationDescription" TEXT NOT NULL,
    "materialCode" TEXT NOT NULL,
    "materialDescription" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "baseValue" DOUBLE PRECISION NOT NULL,
    "markupPercent" DOUBLE PRECISION,
    "valueWithMarkup" DOUBLE PRECISION NOT NULL,
    "discountPercent" DOUBLE PRECISION,
    "finalValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDevizMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProjectDevizLabor" (
    "id" TEXT NOT NULL,
    "devizLineId" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "operationCode" TEXT NOT NULL,
    "operationDescription" TEXT NOT NULL,
    "laborDescription" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "baseValue" DOUBLE PRECISION NOT NULL,
    "markupPercent" DOUBLE PRECISION,
    "valueWithMarkup" DOUBLE PRECISION NOT NULL,
    "discountPercent" DOUBLE PRECISION,
    "finalValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDevizLabor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectSheet_devizLineId_key" ON "public"."ProjectSheet"("devizLineId");

-- CreateIndex
CREATE INDEX "ProjectSheet_projectId_idx" ON "public"."ProjectSheet"("projectId");

-- CreateIndex
CREATE INDEX "ProjectSheet_devizLineId_idx" ON "public"."ProjectSheet"("devizLineId");

-- CreateIndex
CREATE INDEX "ProjectSheetOperation_projectSheetId_idx" ON "public"."ProjectSheetOperation"("projectSheetId");

-- CreateIndex
CREATE INDEX "ProjectDevizMaterial_devizLineId_idx" ON "public"."ProjectDevizMaterial"("devizLineId");

-- CreateIndex
CREATE INDEX "ProjectDevizLabor_devizLineId_idx" ON "public"."ProjectDevizLabor"("devizLineId");

-- AddForeignKey
ALTER TABLE "public"."ProjectSheet" ADD CONSTRAINT "ProjectSheet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectSheet" ADD CONSTRAINT "ProjectSheet_devizLineId_fkey" FOREIGN KEY ("devizLineId") REFERENCES "public"."ProjectDevizLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectSheetOperation" ADD CONSTRAINT "ProjectSheetOperation_projectSheetId_fkey" FOREIGN KEY ("projectSheetId") REFERENCES "public"."ProjectSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectDevizMaterial" ADD CONSTRAINT "ProjectDevizMaterial_devizLineId_fkey" FOREIGN KEY ("devizLineId") REFERENCES "public"."ProjectDevizLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProjectDevizLabor" ADD CONSTRAINT "ProjectDevizLabor_devizLineId_fkey" FOREIGN KEY ("devizLineId") REFERENCES "public"."ProjectDevizLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
