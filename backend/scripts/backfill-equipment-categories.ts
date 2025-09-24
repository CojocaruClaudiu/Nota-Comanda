import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORY = 'Descriere_ech';

function detectCategory(description: string): string {
  const d = description.toLowerCase();
  if (/(polizor|polizoare|flex|biax)/.test(d)) return 'Polizoare';
  if (/(bormasina|bormașină|masina de gaurit|mașină de găurit|perforator|rotopercutor|te\s?\d)/.test(d)) return 'Mașini de găurit';
  if (/(ciocan|demolator)/.test(d)) return 'Ciocane/Rotopercutoare';
  if (/(fierastrau|fierăstrău|circular|pânză|pendular|polistiren)/.test(d)) return 'Fierăstraie';
  if (/(laser|telemetru|pm\s?\d|pr\s?\d|pd-?e)/.test(d)) return 'Lasere & Telemetre';
  if (/(generator)/.test(d)) return 'Generatoare';
  if (/(surubelnita|șurubelniță|șurubelniţa|surubelnită)/.test(d)) return 'Șurubelnițe & Pistoale';
  if (/(pistol)/.test(d)) return 'Șurubelnițe & Pistoale';
  if (/(malaxor)/.test(d)) return 'Malaxoare';
  if (/(aspirator)/.test(d)) return 'Aspiratoare';
  if (/(capsator)/.test(d)) return 'Capsatoare';
  if (/(rulet[ăa]|metru|nivela|nivel[ăa])/.test(d)) return 'Măsurare manuală';
  if (/(pensul[ăa]|trafalet|gletier[ăa]|spacl[uul]|drisc[ăa]|mistrie)/.test(d)) return 'Finisaje & Vopsire';
  if (/(sfoar[ăa]|cutter|ciocan cauciuc)/.test(d)) return 'Unelte manuale';
  if (/(burg(hiu|hii)|electrod|baghete|perie flex)/.test(d)) return 'Consumabile';
  if (/(schel[ăa]|scar[ăa])/.test(d)) return 'Acces/Schele';
  if (/(compresor)/.test(d)) return 'Compresoare';
  if (/(sudur[ăa]|invertor)/.test(d)) return 'Sudură';
  if (/(parchet|bar[ăa] de tragere)/.test(d)) return 'Montaj pardoseli';
  return DEFAULT_CATEGORY;
}

async function main() {
  console.log('Backfilling equipment categories...');
  const items = await (prisma as any).equipment.findMany({});
  let updates = 0, unchanged = 0;
  for (const it of items as Array<{ id: string; description: string; category: string }>) {
    const newCat = detectCategory(it.description || '');
    if (!newCat || newCat === it.category) { unchanged++; continue; }
    await (prisma as any).equipment.update({ where: { id: it.id }, data: { category: newCat } });
    updates++;
  console.log(`${it.id}: ${it.category} -> ${newCat}`);
  }
  console.log(`Done. Updated: ${updates}, Unchanged: ${unchanged}`);
}

main().catch((e) => {
  console.error('Backfill failed:', e);
}).finally(async () => {
  await prisma.$disconnect();
});
