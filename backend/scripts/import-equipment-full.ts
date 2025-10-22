import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

// __dirname replacement for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// --- helpers ---
function norm(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function parseDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const t = String(s).trim();
  if (!t || t === '-' || t === '\u2013') return null;
  const m = t.match(/(\d{1,2})[-\.\/](\d{1,2})[-\.\/](\d{4})/);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const y = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo, d));
    return dt;
  }
  const parsed = new Date(t);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseCurrency(s: string | undefined | null): number | null {
  if (!s) return null;
  let t = String(s).trim();
  if (!t || t === '-') return null;
  t = t.replace(/[A-Za-z\s]/g, '');
  if (t.indexOf(',') !== -1) {
    t = t.replace(/\./g, '');
    t = t.replace(/,/g, '.');
  } else {
    t = t.replace(/,/g, '');
  }
  const n = Number(t);
  return isNaN(n) ? null : n;
}

function parseIntSafe(s: string | undefined | null): number | null {
  if (!s) return null;
  const t = String(s).trim();
  if (!t || t === '-') return null;
  const n = parseInt(t, 10);
  return isNaN(n) ? null : n;
}

const CATEGORY_ALIASES: Record<string, string[]> = {
  acumulator: ['acumulator', 'acumulatori', 'b22', 'b 22', 'b12', 'b 12', 'b 22/8.0', 'b 22/5.2', 'b22/8.0', 'b22/5.2', 'b 22-'],
  incarcator: ['incarcator', 'incarcatoare', 'incarcatori', 'c4/36', 'c 4/36', 'c4-36', 'c4/36-90', 'c4/36-350'],
  polizor: ['polizor', 'polizoar', 'flex', 'ag 4s', 'ag 5d', 'ag 125'],
  rotopercutor: ['rotopercutor', 'rotopercutoare', 'perforator', 'te 3', 'te 6', 'te 30'],
  bormasina: ['bormasina', 'bormasini', 'masina de gaurit'],
  laser: ['laser', 'lasere', 'telemetru', 'telemetre', 'pm 30', 'pm 2', 'pr 30', 'pd-e'],
  pistol: ['pistol', 'pistoale'],
  surubelnita: ['surubelnita', 'surubelnite', 'sf 6', 'sf 10w', 'siw 6'],
  ciocan: ['ciocan', 'ciocane', 'demolator', 'te 2000'],
  generator: ['generator'],
  malaxor: ['malaxor'],
};

function categoryFromTip(tip?: string): string | null {
  const t = norm(tip || '').replace(/\s+/g, ' ');
  if (!t) return null;
  for (const [cat, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some(a => t.includes(a))) return cat;
  }
  if (t === 'acumulator' || t === 'acumulatori') return 'acumulator';
  if (t === 'incarcator' || t === 'incarcatoare' || t === 'incarcatori') return 'incarcator';
  if (t === 'polizor' || t === 'polizoare') return 'polizor';
  if (t === 'rotopercutor' || t === 'rotopercutoare') return 'rotopercutor';
  if (t === 'bormasina' || t === 'bormasini') return 'bormasina';
  if (t === 'laser' || t === 'lasere' || t === 'telemetru' || t === 'telemetre') return 'laser';
  if (t === 'pistol' || t === 'pistoale') return 'pistol';
  if (t === 'surubelnita' || t === 'surubelnite') return 'surubelnita';
  if (t.startsWith('ciocan')) return 'ciocan';
  return null;
}

function detectSimpleCategory(description: string, tip?: string): string {
  const tipCat = categoryFromTip(tip);
  if (tipCat) return tipCat;
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
  return 'altele';
}

function sanitizeStatus(s: string | undefined | null): string {
  const t = norm(s || '');
  if (!t) return 'Activ';
  if (t.includes('achiz')) return 'Activ';
  if (t.includes('activ')) return 'Activ';
  if (t.includes('inactiv')) return 'Inactiv';
  return 'Activ';
}

async function main() {
  const argv = process.argv.slice(2);
  const fileArg = argv[0] || path.join(__dirname, 'equipment_import.tsv');
  if (!fs.existsSync(fileArg)) {
    console.error('File not found:', fileArg);
    console.error('Expected header example (TSV/CSV):');
    console.error('Descriere\tCod Produs\tTip\tStatus Unealta\tSerie\tNumar referinta\tUltima Reparatie\tCost Reparatie\tNumar Reparatii\tGarantie\tNumar Echipament\tGeneratie');
    process.exit(1);
  }

  let txt = fs.readFileSync(fileArg, 'utf8');
  if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);
  const lines = txt.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length <= 1) {
    console.error('No data rows found in file');
    process.exit(1);
  }

  const header = lines[0];
  let delim = '\t';
  if (header.indexOf('\t') === -1) {
    if (header.indexOf(';') !== -1) delim = ';';
    else if (header.indexOf(',') !== -1) delim = ',';
  }
  const cols = header.split(delim).map(c => c.trim());
  const normCols = cols.map((c) => norm(c).replace(/\s+/g, ' '));

  // map normalized header -> original index
  const colIndex = (names: string[]): number => {
    const want = names.map(n => norm(n).replace(/\s+/g, ' '));
    for (let i = 0; i < normCols.length; i++) {
      for (const w of want) {
        if (normCols[i] === w || normCols[i].includes(w)) return i;
      }
    }
    return -1;
  };

  const idxDescriere = colIndex(['Descriere', 'Denumire', 'Descriere echipament', 'Descriere_ech', 'Description']);
  const idxCod = colIndex(['Cod Produs', 'Cod', 'Code', 'Product Code']);
  const idxTip = colIndex(['Tip', 'tip']);
  const idxStatus = colIndex(['Status Unealta', 'Status Unealtă', 'Status', 'status']);
  const idxSerie = colIndex(['Serie', 'Serial']);
  const idxRef = colIndex(['Numar referinta', 'Număr referință', 'Reference']);
  const idxUltimaRep = colIndex(['Ultima Reparatie', 'Ultima Reparație', 'Ultima Repara\u021bie']);
  const idxCostRep = colIndex(['Cost Reparatie', 'Cost Reparație', 'Cost Repara\u021bie']);
  const idxCntRep = colIndex(['Numar Reparatii', 'Număr Reparații', 'Numar Repara\u021bii']);
  const idxGarantie = colIndex(['Garantie', 'Garanție']);
  const idxNrEq = colIndex(['Numar Echipament', 'Număr Echipament']);
  const idxGen = colIndex(['Generatie', 'Generație']);

  let created = 0, updated = 0, skipped = 0, failed = 0;
  const seenCounts: Record<string, number> = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    try {
      const parts = line.split(delim).map(p => p.trim());
      const description = idxDescriere >= 0 ? (parts[idxDescriere] || '').trim() : '';
      if (!description) { skipped++; continue; }
      const originalCode = idxCod >= 0 ? (parts[idxCod] || '').trim() : '';
      if (!originalCode) { skipped++; continue; }
      const tip = idxTip >= 0 ? (parts[idxTip] || '').trim() : '';
      const rawStatus = idxStatus >= 0 ? (parts[idxStatus] || '').trim() : '';
      const status = sanitizeStatus(rawStatus);
      const serialNumber = idxSerie >= 0 ? (parts[idxSerie] || '').trim() : '';
      const referenceNumber = idxRef >= 0 ? (parts[idxRef] || '').trim() : '';
      const lastRepairDate = parseDate(idxUltimaRep >= 0 ? (parts[idxUltimaRep] || '') : '');
      const repairCost = parseCurrency(idxCostRep >= 0 ? (parts[idxCostRep] || '') : '');
      const repairCount = parseIntSafe(idxCntRep >= 0 ? (parts[idxCntRep] || '') : '');
      const warranty = idxGarantie >= 0 ? (parts[idxGarantie] || '').trim() : '';
      const equipmentNumber = idxNrEq >= 0 ? (parts[idxNrEq] || '').trim() : '';
      const generation = idxGen >= 0 ? (parts[idxGen] || '').trim() : '';
      const category = detectSimpleCategory(description, tip);

      // unitCode logic for duplicates
      let unitCode = originalCode;
      const eqNumClean = equipmentNumber && equipmentNumber !== '-' ? equipmentNumber : '';
      const snClean = serialNumber && serialNumber !== '-' ? serialNumber : '';
      if (eqNumClean) unitCode = `${originalCode}::EQ:${eqNumClean}`;
      else if (snClean) unitCode = `${originalCode}::SN:${snClean}`;
      else {
        const c = (seenCounts[originalCode] || 0) + 1;
        seenCounts[originalCode] = c;
        if (c > 1) unitCode = `${originalCode}::#${c}`;
      }

      const data = {
        category,
        code: unitCode,
        description,
        status,
        serialNumber: serialNumber || null,
        referenceNumber: referenceNumber || null,
        lastRepairDate: lastRepairDate,
        repairCost: repairCost,
        repairCount: repairCount,
        warranty: warranty || null,
        equipmentNumber: equipmentNumber || null,
        generation: generation || null,
        hourlyCost: 0,
      } as any;

      const existing = await (prisma as any).equipment.findUnique({ where: { code: unitCode } });
      if (existing) {
        await (prisma as any).equipment.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await (prisma as any).equipment.create({ data });
        created++;
      }
    } catch (e: any) {
      failed++;
      // eslint-disable-next-line no-console
      console.error('Failed row', i, e?.message || e);
    }
  }

  console.log(`\nDone. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });

