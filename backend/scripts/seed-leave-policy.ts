// scripts/seed-leave-policy.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding default leave policy...\n');

  // Check if default policy already exists
  const existing = await prisma.leavePolicy.findFirst({
    where: { isCompanyDefault: true }
  });

  if (existing) {
    console.log('✅ Default policy already exists:');
    console.log(`   Name: ${existing.name}`);
    console.log(`   Base days: ${existing.baseAnnualDays}`);
    console.log(`   Seniority bonus: +${existing.bonusPerStep} every ${existing.seniorityStepYears} years`);
    console.log(`   Carryover: ${existing.allowCarryover ? `Max ${existing.maxCarryoverDays} days` : 'Not allowed'}`);
    console.log(`   Max negative balance: ${existing.maxNegativeBalance} days\n`);
    return existing;
  }

  // Create default policy
  const policy = await prisma.leavePolicy.create({
    data: {
      name: 'Default Company Policy',
      isCompanyDefault: true,
      
      // Base entitlement
      baseAnnualDays: 21,
      seniorityStepYears: 5,
      bonusPerStep: 1,
      
      // Accrual settings
      accrualMethod: 'PRO_RATA',
      roundingMethod: 'FLOOR',
      
      // Carryover rules
      allowCarryover: true,
      maxCarryoverDays: 5,
      carryoverExpiryMonth: 3,  // March
      carryoverExpiryDay: 31,   // 31st
      
      // Negative balance (borrowing)
      maxNegativeBalance: 0,  // No borrowing by default
      
      // Constraints
      maxConsecutiveDays: 10,
      minNoticeDays: 14,
      
      active: true,
    },
  });

  console.log('✅ Created default leave policy:');
  console.log(`   ID: ${policy.id}`);
  console.log(`   Name: ${policy.name}`);
  console.log(`   Base days: ${policy.baseAnnualDays}`);
  console.log(`   Seniority bonus: +${policy.bonusPerStep} every ${policy.seniorityStepYears} years`);
  console.log(`   Accrual method: ${policy.accrualMethod}`);
  console.log(`   Rounding: ${policy.roundingMethod}`);
  console.log(`   Carryover: Max ${policy.maxCarryoverDays} days (expires ${policy.carryoverExpiryDay} Mar)`);
  console.log(`   Max negative balance: ${policy.maxNegativeBalance} days`);
  console.log(`   Max consecutive days: ${policy.maxConsecutiveDays}`);
  console.log(`   Min notice days: ${policy.minNoticeDays}\n`);

  // Optional: Create example December shutdown for 2025
  const shutdown2025 = await prisma.companyShutdown.create({
    data: {
      policyId: policy.id,
      startDate: new Date('2025-12-23'),
      endDate: new Date('2025-12-27'),
      days: 5,
      reason: 'Sărbători Crăciun 2025',
      deductFromAllowance: true,
    },
  });

  console.log('✅ Created example company shutdown:');
  console.log(`   Period: ${shutdown2025.startDate.toLocaleDateString('ro-RO')} - ${shutdown2025.endDate.toLocaleDateString('ro-RO')}`);
  console.log(`   Days: ${shutdown2025.days}`);
  console.log(`   Reason: ${shutdown2025.reason}`);
  console.log(`   Deducts from allowance: ${shutdown2025.deductFromAllowance ? 'Yes' : 'No'}\n`);

  console.log('🎉 Leave policy system seeded successfully!\n');
  
  return policy;
}

main()
  .catch((e) => {
    console.error('❌ Error seeding leave policy:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
