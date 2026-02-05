-- Ensure numeric precision for monetary fields matches Prisma schema expectations.

ALTER TABLE "Material"
  ALTER COLUMN "price" TYPE NUMERIC(65, 30)
  USING "price"::NUMERIC(65, 30);

ALTER TABLE "OperationSheetItem"
  ALTER COLUMN "quantity" TYPE NUMERIC(10, 2)
    USING "quantity"::NUMERIC(10, 2),
  ALTER COLUMN "unitPrice" TYPE NUMERIC(10, 2)
    USING "unitPrice"::NUMERIC(10, 2);

