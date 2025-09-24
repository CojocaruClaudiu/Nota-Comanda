-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('RON', 'EUR');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'RON';
