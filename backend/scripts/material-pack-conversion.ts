import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const UNIT_MAP: Record<string, string> = {
  KG: 'KG',
  KGS: 'KG',
  G: 'G',
  L: 'L',
  ML: 'ML',
  M2: 'M2',
  M3: 'M3',
  BUC: 'BUC',
  SAC: 'SAC',
  BAG: 'SAC',
  PCS: 'BUC',
};

const PATTERN = /(\d+[\d.,]*)\s*(KG|KGS|G|L|ML|M2|M3|BUC|SAC|BAG|PCS)/i;

const normaliseQuantity = (raw: string): number => {
  const cleaned = raw.replace(/\./g, '').replace(',', '.');
  return Number(cleaned);
};

async function main() {
  const materials = await prisma.material.findMany();
  let updated = 0;

  for (const material of materials) {
    if (material.packQuantity || material.packUnit) {
      continue;
    }

    const source = `${material.description ?? ''}`;
    const match = PATTERN.exec(source.toUpperCase());
    if (!match) continue;

    const [, qtyRaw, unitRaw] = match;
    const quantity = normaliseQuantity(qtyRaw);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    const mappedUnit = UNIT_MAP[unitRaw.toUpperCase()] ?? unitRaw.toUpperCase();

    await prisma.material.update({
      where: { id: material.id },
      data: {
        packQuantity: quantity,
        packUnit: mappedUnit,
      },
    });

    updated += 1;
  }

  console.log(`Processed ${materials.length} materials. Updated ${updated}.`);
}

main()
  .catch((err) => {
    console.error('Failed to backfill material pack info:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
