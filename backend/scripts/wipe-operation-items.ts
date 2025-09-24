import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Deleting ALL operation items...');
  const beforeRows = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint as count FROM "OperationItem"`;
  const countBefore = Number(beforeRows?.[0]?.count ?? 0n);
  // Use raw for speed if many rows
  await prisma.$executeRawUnsafe(`DELETE FROM "OperationItem"`);
  const afterRows = await prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*)::bigint as count FROM "OperationItem"`;
  const countAfter = Number(afterRows?.[0]?.count ?? 0n);
  console.log(`Done. Before: ${countBefore}, After: ${countAfter}`);
}

main().catch((e) => {
  console.error('Wipe failed:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
