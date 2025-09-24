import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function splitNameAndUnit(original: string): { name: string; unit: string | null } {
  let name = original.trim();
  let unit: string | null = null;
  const lastOpen = name.lastIndexOf('(');
  const lastClose = name.indexOf(')', lastOpen + 1);
  if (lastOpen !== -1 && lastClose !== -1 && lastClose > lastOpen) {
    const inside = name.slice(lastOpen + 1, lastClose).trim();
    const normalized = inside.replace(/\s+/g, '').toLowerCase();
    const looksLikeUnit = /^(mp|ml|mc|m|mm|cm|buc|h|ore|mp\/ml|ml\/mp|mp\/h|buc\/ml|buc\/mp|kg|tone|l|litri|mp2|mp3)$/i.test(normalized)
      || /[a-zăâîșț]+(?:\/[a-zăâîșț]+)+/i.test(normalized);
    if (looksLikeUnit) {
  unit = inside;
    }
  }
  return { name, unit };
}

async function main() {
  console.log('Loading OperationItems without unit...');
  // Use raw query to avoid relying on generated types
  const rows = await prisma.$queryRaw<{ id: string; name: string }[]>`SELECT id, name FROM "OperationItem" WHERE unit IS NULL`;
  let updates = 0;
  for (const r of rows) {
    const { unit } = splitNameAndUnit(r.name);
    if (!unit) continue;
    await prisma.$executeRawUnsafe(`UPDATE "OperationItem" SET unit = $1 WHERE id = $2`, unit, r.id);
    updates++;
  }
  console.log(`Backfill complete. Rows updated with unit: ${updates}`);
}

main().catch((e) => {
  console.error('Backfill failed:', e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
