-- CreateTable
CREATE TABLE "ProjectDevizLine" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "orderNum" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'mp',
    "quantity" DOUBLE PRECISION,
    "unitPrice" DOUBLE PRECISION,
    "totalPrice" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDevizLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectDevizLine_projectId_idx" ON "ProjectDevizLine"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectDevizLine" ADD CONSTRAINT "ProjectDevizLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
