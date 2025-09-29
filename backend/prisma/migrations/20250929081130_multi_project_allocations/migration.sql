-- AlterTable
ALTER TABLE "PurchaseReceiptItem" ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "POItemAllocation" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION,
    "percent" DOUBLE PRECISION,
    "valueOverride" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "POItemAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceDistribution" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "orderItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "POItemAllocation_projectId_idx" ON "POItemAllocation"("projectId");

-- CreateIndex
CREATE INDEX "POItemAllocation_orderItemId_idx" ON "POItemAllocation"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "POItemAllocation_orderItemId_projectId_key" ON "POItemAllocation"("orderItemId", "projectId");

-- CreateIndex
CREATE INDEX "InvoiceDistribution_invoiceId_projectId_idx" ON "InvoiceDistribution"("invoiceId", "projectId");

-- CreateIndex
CREATE INDEX "InvoiceDistribution_projectId_idx" ON "InvoiceDistribution"("projectId");

-- CreateIndex
CREATE INDEX "InvoiceDistribution_orderItemId_idx" ON "InvoiceDistribution"("orderItemId");

-- AddForeignKey
ALTER TABLE "PurchaseReceiptItem" ADD CONSTRAINT "PurchaseReceiptItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POItemAllocation" ADD CONSTRAINT "POItemAllocation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POItemAllocation" ADD CONSTRAINT "POItemAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDistribution" ADD CONSTRAINT "InvoiceDistribution_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDistribution" ADD CONSTRAINT "InvoiceDistribution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceDistribution" ADD CONSTRAINT "InvoiceDistribution_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "PurchaseOrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
