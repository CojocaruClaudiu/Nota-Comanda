-- Extend the OrderStatus enum with the additional values used by the UI.
-- This script is idempotent and safe to run multiple times.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'SUPPLIER_OUT_OF_STOCK'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'SUPPLIER_OUT_OF_STOCK';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'UNPAID_ORDER'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'UNPAID_ORDER';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'PAID_FULL_ORDER'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'PAID_FULL_ORDER';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'PAID_PARTIAL_ORDER'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'PAID_PARTIAL_ORDER';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'IN_DELIVERY'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'IN_DELIVERY';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'OrderStatus' AND e.enumlabel = 'RETURNED_REFUSED'
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'RETURNED_REFUSED';
  END IF;
END $$;

