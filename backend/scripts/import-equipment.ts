import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default category used when no specific mapping is found
const DEFAULT_CATEGORY = 'Descriere_ech';

// Static list provided by user
const ITEMS = [
  'Polizor unghiular Hilti AG 125-20SE 230V',
  'Rotopercutor Hilti TE 3-C',
  'Polizor unghiular Hilti AG 5D-22+ Acumulator',
  'Rotopercutor Hilti TE 6-22+ Acumulator',
  'Ferastrau circular HILTI SCM 22A +Acumulator',
  'Laser Liniar Hilti PM 30-MG+ Acumulator',
  'Surubelnita Hilti SF 10W-A22 + Acumulator',
  'Pistol pe acumulator Hilti kit CD A22+ Acumulator',
  'Telemetru Hilti PD-E',
  'Surubelnita Hilti SF 6-A22+ Acumulator',
  'Rotopercutor Hilti TE 3-M',
  'Laser liniar  Hilti PM 2-LG',
  'Laser rotativ PR 30-HVS A12',
  'Ciocan demolator TE 2000-AVR 230 V+ dalti',
  'Polizor pe acumulator AG 4S-A22+ acumulator',
  'Generator curent monofazat SQ-C9000E',
  'Malaxor Makita',
  'Capsator tip ciocan fibra de carbon Dewalt',
  'Ruleta 5m Stanley',
  'Pensula 110/40MM',
  'ROLA TRAFALET 10CM',
  'ROLA TRAFALET 18CM',
  'ROLA TRAFALET 25CM',
  'ROLA TRAFALET 2X10',
  'MISTRIE ZIDAR, SERIA 30, 16X11CM, INOX',
  'MISTRIE PATRATA BIMAT 180',
  'MISTRIE TRAPEZ 160MM',
  'MISTRIE TRAPEZ 180MM',
  'MISTRIE ZIDAR, SERIA 30, 16X11CM, INOX',
  'SPACLU INOX 50MM',
  'SPACLU 12CM,COD 0830-680012',
  'PENSULA 20 MM',
  'PENSULA 35 MM',
  'PENSULA 50 MM',
  'PENSULA 60 MM',
  'GLETIERA INCLINATA 360X130MM, 10MM',
  'GLETIERA 2K,28X12CM, COD 0800-312800',
  'GLETIERA 8X8 280X120',
  'GLETIERA 4X4 , 270X12',
  'GLETIERA',
  'TRAFALET PROPLUS 14 MINI 10CM',
  'TRAFALET NYLONPLUS 10CM',
  'TRAFALET EUROFAZA 10CM, FIR 13MM, DIAM 15',
  'TRAFALET 10CM, COD 0121-711510',
  'SPACLU 12CM,COD 0830-680012',
  'SFOARA ZIDARIE, COD 0720-350100',
  'RULETA PROFESIONALA CU BLOCARE AUTOMATA, 5MX19MM, COD 0700-481906',
  'PERIE FLEX',
  'DRISCA INOX',
  'BURGHIU METAL 4',
  'BURGHIU METAL 5.5MM',
  'BURGHIU METAL 5X80',
  'BURGHIU METAL 5X93MM',
  'BURGHIU METAL 6.5MM',
  'ELECTROZI-BAGHETE ALUMINIU ALSI5 1.6MM/PACHET 1KG (55061).',
  'ELECTROZI-BAGHETE ALUMINIU ALSI5 2.0MM/PACHET 1KG (55059)',
  'ELECTROZI-BAGHETE ALUMINIU ALSI5 2.4MM/ PACHET 1KG (55060)',
  'MISTRIE PENTRU ROSTURI KLINKER',
  'Tavă pentru chit KLINKER',
  'Fierastrau pentr polistiren',
  'Nivela cu bula',
  'Cutter hardy',
  'Tavita',
  'ciocan cauciuc',
  'Bara de tragere pentru parchet',
];

// Simple categorization based on keywords in description
function detectCategory(description: string): string {
  const d = description.toLowerCase();
  if (/(polizor|polizoare|flex)/.test(d)) return 'Polizoare';
  if (/(bormasina|bormașină|masina de gaurit|mașină de găurit|perforator|rotopercutor)/.test(d)) return 'Mașini de găurit';
  if (/(ciocan|demolator)/.test(d)) return 'Ciocane/Rotopercutoare';
  if (/(fierastrau|fierăstrău|circular|pânză|pendular)/.test(d)) return 'Fierăstraie';
  if (/(laser)/.test(d)) return 'Lasere & Telemetre';
  if (/(telemetru)/.test(d)) return 'Lasere & Telemetre';
  if (/(generator)/.test(d)) return 'Generatoare';
  if (/(surubelnita|șurubelniță|șurubelniţa|surubelnită|surubelnita)/.test(d)) return 'Șurubelnițe & Pistoale';
  if (/(pistol)/.test(d)) return 'Șurubelnițe & Pistoale';
  if (/(malaxor)/.test(d)) return 'Malaxoare';
  if (/(aspirator)/.test(d)) return 'Aspiratoare';
  if (/(capsator)/.test(d)) return 'Capsatoare';
  if (/(rulet[ăa]|metru)/.test(d)) return 'Măsurare manuală';
  if (/(pensul[ăa]|trafalet|gletier[ăa]|spacl[uul]|drisca|drișcă)/.test(d)) return 'Finisaje & Vopsire';
  if (/(sfoar[ăa]|nivela|nivel[ăa]|cutter)/.test(d)) return 'Unelte manuale';
  if (/(burg(hiu|hii)|electrod|baghete)/.test(d)) return 'Consumabile';
  if (/(schel[ăa]|scar[ăa])/i.test(description)) return 'Acces/Schele';
  if (/(compresor)/.test(d)) return 'Compresoare';
  if (/(sudur[ăa]|invertor)/.test(d)) return 'Sudură';
  if (/(parchet|bar[ăa] de tragere)/.test(d)) return 'Montaj pardoseli';
  return DEFAULT_CATEGORY;
}

// Generate a code from description: upper snake case with short hash
function toCode(description: string): string {
  const base = description
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 30)
    .toUpperCase();
  const hash = Math.abs([...description].reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0)).toString(36).slice(0, 5).toUpperCase();
  return `${base || 'EQ'}_${hash}`;
}

async function main() {
  console.log('Importing equipment items...');
  let created = 0, skipped = 0, updated = 0;

  for (const desc of ITEMS) {
    const description = desc.trim();
    if (!description) continue;
    const code = toCode(description);
    const category = detectCategory(description);

    // Try upsert by unique code
    try {
    const existing = await (prisma as any).equipment.findUnique({ where: { code } });
      if (existing) {
        // Update description & category if changed, keep hourlyCost as-is
        await (prisma as any).equipment.update({
          where: { id: existing.id },
          data: {
      category,
            description,
          },
        });
        updated++;
  console.log(`Updated: ${code} [${category}] -> ${description}`);
      } else {
        await (prisma as any).equipment.create({
          data: {
      category,
            code,
            description,
            hourlyCost: 0,
          },
        });
        created++;
    console.log(`✓ Created: ${code} [${category}] -> ${description}`);
      }
    } catch (e: any) {
      // If unique violation on code, skip
      const msg = e?.message || '';
      if (msg.includes('P2002') || /unique/i.test(msg)) {
        skipped++;
  console.warn(`Skipped (duplicate): ${code}`);
      } else {
  console.error(`Failed for ${code}:`, e);
      }
    }
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
}

main().catch((e) => {
  console.error('Import failed:', e);
}).finally(async () => {
  await prisma.$disconnect();
});
