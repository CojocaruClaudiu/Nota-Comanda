import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to DB and counting Equipment rows...');
  const total = await (prisma as any).equipment.count();
  console.log('Total Equipment rows:', total);

  console.log('\nTop 200 (by createdAt asc) sample rows (id, code, category, createdAt):');
  const sample = await (prisma as any).equipment.findMany({
    take: 200,
    orderBy: [{ createdAt: 'asc' }],
    select: { id: true, code: true, category: true, createdAt: true, updatedAt: true }
  });
  console.log(JSON.stringify(sample, null, 2));

  console.log('\nCategory counts:');
  try {
    const byCategory: Array<{ category: string | null; count: string }> = await prisma.$queryRaw`
      SELECT category, COUNT(*)::text as count FROM "Equipment" GROUP BY category ORDER BY COUNT(*) DESC
    ` as any;
    console.log(JSON.stringify(byCategory, null, 2));
  } catch (e) {
    console.error('Error querying by category (raw):', e);
  }
}

main()
  .catch((e) => { console.error('Error in check script:', e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
