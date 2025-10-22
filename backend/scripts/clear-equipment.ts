import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Counting rows in Equipment before delete...');
  const before = await (prisma as any).equipment.count();
  console.log('Rows before:', before);

  console.log('Deleting all rows from Equipment...');
  const res = await (prisma as any).equipment.deleteMany({});
  console.log('Delete result:', res);

  const after = await (prisma as any).equipment.count();
  console.log('Rows after:', after);
}

main()
  .catch((e) => { console.error('Error clearing equipment:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
