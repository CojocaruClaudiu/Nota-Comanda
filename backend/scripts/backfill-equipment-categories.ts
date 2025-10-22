import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CATEGORY = 'altele';

function norm(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function detectSimpleCategory(description: string): string {
  const d = norm(description);
  if (/(\bb ?(12|22)\b|\bb22|\bb12|acumulator)/.test(d)) return 'acumulator';
  if (/(incarcator|c ?4\/ ?36|c4-36|c4\/36-90|c4\/36-350)/.test(d)) return 'incarcator';
  if (/(polizor|polizoar|\bflex\b|ag\s?\d)/.test(d)) return 'polizor';
  if (/(rotopercutor|perforator|te\s?\d)/.test(d)) return 'rotopercutor';
  if (/(bormasina|masina de gaurit)/.test(d)) return 'bormasina';
  if (/(laser|telemetru|pm\s?\d|pr\s?\d|pd-?e)/.test(d)) return 'laser';
  if (/(surubelnita|sf\s?\d|siw\s?\d)/.test(d)) return 'surubelnita';
  if (/(\bpistol\b)/.test(d)) return 'pistol';
  if (/(ciocan|demolator|te\s?2000)/.test(d)) return 'ciocan';
  if (/(generator)/.test(d)) return 'generator';
  if (/(malaxor)/.test(d)) return 'malaxor';
  return DEFAULT_CATEGORY;
}

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
    const newCat = detectSimpleCategory(it.description || '');
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
