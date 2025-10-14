import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  WARNING: This will delete ALL materials from the database!');
  console.log('Starting deletion in 3 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    // Count materials before deletion
    const countBefore = await prisma.material.count();
    console.log(`Found ${countBefore} materials in database`);
    
    // Delete all materials
    const result = await prisma.material.deleteMany({});
    
    console.log(`\n✅ Successfully deleted ${result.count} materials`);
    
    // Verify deletion
    const countAfter = await prisma.material.count();
    console.log(`Remaining materials: ${countAfter}`);
    
  } catch (error) {
    console.error('❌ Error deleting materials:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
