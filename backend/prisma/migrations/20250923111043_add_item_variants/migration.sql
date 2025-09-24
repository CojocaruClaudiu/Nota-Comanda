-- CreateTable
CREATE TABLE "OperationItemVariant" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "attributes" JSONB,
    "recipe" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationItemVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationItemVariant_itemId_idx" ON "OperationItemVariant"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "OperationItemVariant_itemId_label_key" ON "OperationItemVariant"("itemId", "label");

-- AddForeignKey
ALTER TABLE "OperationItemVariant" ADD CONSTRAINT "OperationItemVariant_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "OperationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
