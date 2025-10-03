// scripts/cleanup-orphaned-leaves.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for orphaned Leave records...\n');

  // Get all employee IDs
  const employees = await prisma.employee.findMany({
    select: { id: true, name: true }
  });
  
  const employeeIds = new Set(employees.map(e => e.id));
  console.log(`✅ Found ${employees.length} employees in database\n`);

  // Get all leaves
  const leaves = await prisma.leave.findMany({
    select: { id: true, employeeId: true, startDate: true, days: true }
  });
  
  console.log(`📋 Found ${leaves.length} leave records\n`);

  // Find orphaned leaves
  const orphaned = leaves.filter(leave => !employeeIds.has(leave.employeeId));

  if (orphaned.length === 0) {
    console.log('✅ No orphaned leave records found! Database is clean.\n');
    return;
  }

  console.log(`⚠️  Found ${orphaned.length} orphaned leave records:\n`);
  
  for (const leave of orphaned) {
    console.log(`  - Leave ID: ${leave.id}`);
    console.log(`    Employee ID: ${leave.employeeId} (NOT FOUND)`);
    console.log(`    Start Date: ${leave.startDate}`);
    console.log(`    Days: ${leave.days}\n`);
  }

  // Ask for confirmation
  console.log('⚠️  These leave records reference employees that no longer exist.');
  console.log('⚠️  They should be deleted to maintain database integrity.\n');

  // Delete orphaned leaves
  const result = await prisma.leave.deleteMany({
    where: {
      id: { in: orphaned.map(l => l.id) }
    }
  });

  console.log(`✅ Deleted ${result.count} orphaned leave records.\n`);
  console.log('✅ Database cleanup complete! You can now run `npx prisma db push`\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
