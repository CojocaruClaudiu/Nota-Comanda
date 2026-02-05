import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Attempting to add 'manualCarryOverDays' column to 'Employee' table...");
    
    // Check if column exists first to avoid errors on re-run
    // Only safe way in Prisma raw query is to catch the error or inspect catalog, 
    // but simplified "ADD COLUMN IF NOT EXISTS" logic works great in Postgres.
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Employee" 
      ADD COLUMN IF NOT EXISTS "manualCarryOverDays" INTEGER DEFAULT 0;
    `);

    console.log("✅ Successfully added 'manualCarryOverDays' column.");
  } catch (error) {
    console.error("❌ Failed to add column:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
