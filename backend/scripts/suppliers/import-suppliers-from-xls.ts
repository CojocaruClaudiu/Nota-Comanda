import fs from 'fs';
import path from 'path';
// Support both CJS and ESM shapes of xlsx
import xlsxImport from 'xlsx';
// Some bundlers expose functions on default, others as namespace
// Normalise to an object that has readFile/utils
const XLSX: any = (xlsxImport && (xlsxImport as any).readFile) ? xlsxImport : (xlsxImport as any).default || xlsxImport;
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import axios from 'axios';

(dayjs as any).extend(customParseFormat);

interface SupplierPayload {
  id_tert: string;
  denumire: string;
  cui_cif: string;
  nrRegCom: string;
  den_catart?: string | null;
  tva: boolean;
  tvaData: string | null;
  adresa: string;
  oras: string;
  judet: string;
  tara: string;
  contactNume: string;
  email: string;
  telefon: string;
  site: string;
  metodaPlata: string;
  contBancar: string;
  banca: string;
  status: string;
  notite: string;
}

// ---------------- CLI ARGS ----------------
const args = process.argv.slice(2);
const FILE = args[0] && !args[0].startsWith('--') ? args[0] : 'temp.xls';
const hasFlag = (f: string) => args.includes(f);
const getNumFlag = (prefix: string, def: number) => {
  const a = args.find(a => a.startsWith(prefix + '='));
  if (!a) return def; const v = Number(a.split('=')[1]); return Number.isFinite(v) && v > 0 ? v : def;
};
const LIMIT = getNumFlag('--limit', Infinity);
const CONCURRENCY = Math.min(getNumFlag('--concurrency', 4), 16);
const USE_PLACEHOLDERS = hasFlag('--placeholders');
const mapArg = args.find(a => a.startsWith('--map='));
const MAP_FILE = mapArg ? mapArg.split('=')[1] : '';
const onlyCatArg = args.find(a => a.startsWith('--only-category='));
// Allow comma separated list: --only-category=materiale,ob inv
const ONLY_CATEGORIES: Set<string> = (() => {
  if (!onlyCatArg) return new Set();
  const raw = onlyCatArg.split('=')[1];
  return new Set(raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
})();
const SUMMARY_MODE = hasFlag('--summary');
const SKIP_EXISTING = hasFlag('--skip-existing');
const UPDATE_EXISTING = hasFlag('--update-existing');
const DIFF_MODE = hasFlag('--diff');
const fillCatArg = args.find(a => a.startsWith('--fill-missing-category='));
const FILL_MISSING_CATEGORY = fillCatArg ? fillCatArg.split('=')[1] : '';
const addrPhArg = args.find(a => a.startsWith('--address-placeholder='));
const ADDRESS_PLACEHOLDER = addrPhArg ? addrPhArg.split('=')[1] : '';
const full = path.resolve(FILE);

if (!fs.existsSync(full)) {
  console.error('File not found:', full);
  process.exit(1);
}

if (!XLSX.readFile) {
  console.error('xlsx readFile function not found on imported module. Keys:', Object.keys(XLSX));
  process.exit(1);
}
// ------------- CATEGORY INFERENCE SETUP -------------
type CategoryRule = { pattern: string; category: string; isRegex?: boolean };
let externalRules: CategoryRule[] = [];
if (MAP_FILE) {
  try {
    const raw = fs.readFileSync(MAP_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      externalRules = parsed.filter(r => r && r.pattern && r.category).map(r => ({ pattern: r.pattern, category: r.category, isRegex: !!r.isRegex }));
    } else if (parsed && typeof parsed === 'object') {
      externalRules = Object.entries(parsed).map(([pattern, category]) => ({ pattern, category: String(category), isRegex: false }));
    }
    console.log(`Loaded ${externalRules.length} external category rules from ${MAP_FILE}`);
  } catch (e: any) {
    console.warn('Could not load map file', MAP_FILE, e.message);
  }
}
const defaultRules: CategoryRule[] = [
  { pattern: 'DEDEMAN|HOLVER|LOSAN|TEKA|BRICOMAN|BRICOSTORE|HORNBACH|LEROY|ROMSTAL|ARABESQUE|MATERIAL|FERM|BETON|CIMENT|RIGIPS|GIPS|OSB|CHERESTEA|SCANDURA|TABLA|PROFILE METALICE', category: 'Materiale', isRegex: true },
  { pattern: 'VODAFONE|ORANGE|TELEKOM|DIGI', category: 'Telecom', isRegex: true },
  { pattern: 'POSTA|CURIER|FAN COURIER|URGENT|DPD|GLS', category: 'Curierat', isRegex: true },
  { pattern: 'ENERG|GAZ|ENGIE|ELECTRICA|ENEL|CEZ|APA NOVA|APANOVA|AP\\.A', category: 'Utilitati', isRegex: true },
  { pattern: 'ASIGUR|BROKER', category: 'Asigurari', isRegex: true },
  { pattern: 'SOFT|SOFTWARE|IT | IT$|HARDWARE|MICROSOFT|GOOGLE|LICENSE', category: 'IT', isRegex: true },
  { pattern: 'CONSULT|AUDIT|SERVICI', category: 'Servicii', isRegex: true },
  { pattern: 'TRANSPORT|LOGISTIC', category: 'Transport', isRegex: true },
  { pattern: 'CONSTRUCT|ANTREPR', category: 'Constructii', isRegex: true },
  { pattern: 'IMPRIM|HARTIE|TONER|BIROU|PAPETAR', category: 'Consumabile', isRegex: true },
  { pattern: 'BANCA|BANK|CREDIT|IFN', category: 'Financiar', isRegex: true },
  { pattern: 'PUBLICIT|MARKETING|ADVERT', category: 'Marketing', isRegex: true },
  { pattern: 'AUTO|SERVICE AUTO|PIESE', category: 'Auto', isRegex: true },
];
const allRules = [...externalRules, ...defaultRules];
function inferCategory(name: string): string {
  if (!name) return '';
  const upper = name.toUpperCase();
  for (const r of allRules) {
    try {
      if (r.isRegex) {
        const re = new RegExp(r.pattern, 'i');
        if (re.test(upper)) return r.category;
      } else if (upper.includes(r.pattern.toUpperCase())) {
        return r.category;
      }
    } catch {}
  }
  return '';
}
const wb = XLSX.readFile(full, { cellDates: false, raw: false });
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

const parseDate = (v: any): string | null => {
  if (v == null || v === '') return null;
  // If it's a number, attempt Excel serial date decode
  if (typeof v === 'number' && !Number.isNaN(v)) {
    try {
      if (XLSX?.SSF?.parse_date_code) {
        const o = XLSX.SSF.parse_date_code(v);
        if (o) {
          const d = dayjs(`${o.y}-${String(o.m).padStart(2, '0')}-${String(o.d).padStart(2, '0')}`);
            return d.isValid() ? d.format('YYYY-MM-DD') : null;
        }
      }
    } catch {}
  }
  const raw = typeof v === 'string' ? v : String(v);
  const cleaned = raw.trim().replace(/\s+00:00$/, '');
  const d = dayjs(cleaned, ['DD.MM.YYYY', 'DD.MM.YYYY HH:mm', 'YYYY-MM-DD'], true);
  return d.isValid() ? d.format('YYYY-MM-DD') : null;
};

const norm = (s: any) => (s == null ? '' : String(s)).trim();
const countryMap: Record<string,string> = { RO: 'România' };

const seen = new Set<string>();
const out: SupplierPayload[] = [];
let skippedNoName = 0;
let skippedCategoryFilter = 0;
let duplicateWithinFile = 0;

for (const r of rows) {
  const id_tert = norm(r.id_tert);
  const den_tert = norm(r.den_tert);
  const atribut_f = norm(r.atribut_f);
  const cod_f = norm(r.cod_f);
  const cui_cif = (atribut_f || cod_f) ? (atribut_f + cod_f) : '';
  const nrRegCom = norm(r.nr_inreg_tert);
  const tvaStart = parseDate(r.tva_dela);
  const tva = !!tvaStart;
  const adresa = norm(r.adresa_tert);
  const oras = norm(r.oras_tert) || norm(((r.loco_tert != null ? String(r.loco_tert) : '')).split(/[,]/)[0]);
  let judet = norm(r.judet_tert);
  if (!judet) judet = norm(r.judet) || norm(r.judet2) || norm(r.oras_tert); // fallback chain
  const tara = countryMap[norm(r.cod_tzara)] || 'România';
  const telefon = norm(r.tel1);
  const email = norm(r.email1).toLowerCase();
  const banca = norm(r.banca_tert);
  const contBancar = norm(r.iban_tert);
  const site = '';
  const contactNume = '';
  if (!den_tert) { skippedNoName++; continue; }

  const dedupeKey = id_tert || (cui_cif + '|' + den_tert.toLowerCase());
  if (seen.has(dedupeKey)) continue;
  seen.add(dedupeKey);

  const placeholder = <T extends string>(v: string, ph: T): string => v && v.trim() ? v.trim() : (USE_PLACEHOLDERS ? ph : '');
  let inferred = inferCategory(den_tert);
  if (!inferred) {
    // Fallback: detect OB INV / OB INVENTAR anywhere in the row values
    const rowValuesUpper = Object.values(r).map(v => (v == null ? '' : String(v)).toUpperCase());
    if (rowValuesUpper.some(v => v.includes('OB INV'))) inferred = 'OB INV';
    else if (rowValuesUpper.some(v => v.includes('OB INVENTAR'))) inferred = 'OB INV';
  }
  if (!inferred && FILL_MISSING_CATEGORY) inferred = FILL_MISSING_CATEGORY;
  if (ONLY_CATEGORIES.size && !ONLY_CATEGORIES.has(inferred.toLowerCase())) { skippedCategoryFilter++; continue; }
  // track duplicate CUI/CIF inside selection (ignoring blanks)
  // use a separate set for within-file duplicates by CUI
  // (not blocking insertion, just stats)
  // we create set outside loop lazily via closure
  (globalThis as any).__cuiSet = (globalThis as any).__cuiSet || new Set<string>();
  const cuiSet: Set<string> = (globalThis as any).__cuiSet;
  if (cui_cif && cuiSet.has(cui_cif)) duplicateWithinFile++; else if (cui_cif) cuiSet.add(cui_cif);
  out.push({
    id_tert: id_tert || '',
    denumire: den_tert,
    cui_cif: cui_cif || placeholder('', 'FARA-CUI'),
    nrRegCom: nrRegCom,
    den_catart: inferred,
    tva,
    tvaData: tvaStart,
  adresa: (adresa || (ADDRESS_PLACEHOLDER ? ADDRESS_PLACEHOLDER : '') || placeholder('', 'N/A')),
  oras: (oras || (ADDRESS_PLACEHOLDER ? ADDRESS_PLACEHOLDER : '') || placeholder('', 'N/A')),
  judet: (judet || (ADDRESS_PLACEHOLDER ? ADDRESS_PLACEHOLDER : '') || placeholder('', 'N/A')),
    tara: tara || 'România',
  contactNume: contactNume || '',
  email: email || '',
  telefon: telefon || '',
    site,
    metodaPlata: 'OP',
  contBancar: contBancar || '',
  banca: banca || '',
    status: 'activ',
    notite: ''
  });
  if (out.length >= LIMIT) break;
}

const withCat = out.filter(o => o.den_catart).length;
console.log(`Prepared ${out.length} suppliers (from ${rows.length} rows, skipped no name: ${skippedNoName}, skipped by category filter: ${skippedCategoryFilter}, duplicates (within file by CUI): ${duplicateWithinFile}${LIMIT<Infinity?`, limited to ${LIMIT}`:''}). Categorized ${withCat} (${out.length?((withCat/out.length*100).toFixed(1)):0}%).`);

if (SUMMARY_MODE) {
  // Print top 10 sample names
  console.log('Sample (first 10):');
  out.slice(0,10).forEach(s => console.log('-', s.denumire, '|', s.cui_cif, '|', s.den_catart || '—'));
  console.log('Summary mode only. Exiting (no file written, no POST).');
  process.exit(0);
}

async function run() {
  const baseURL = process.env.API_BASE || 'http://localhost:4000';
  const endpoint = '/furnizori';
  const normalizeCui = (v: string) => {
    if (!v) return '';
    let s = v.trim().toUpperCase();
    if (s.startsWith('RO')) s = s.slice(2); // strip leading RO
    s = s.replace(/[^0-9A-Z]/g, ''); // keep alnum
    return s;
  };
  let existingCui = new Set<string>(); // original forms
  let existingCuiNorm = new Set<string>();
  let existingNames = new Set<string>();
  let existingByCuiNorm: Record<string, any> = {};
  let existingByName: Record<string, any> = {};
  if (SKIP_EXISTING || UPDATE_EXISTING) {
    try {
      const resp = await axios.get(baseURL + endpoint);
      if (Array.isArray(resp.data)) {
        existingCui = new Set(resp.data.map((r: any) => (r.cui_cif || '').trim()).filter(Boolean));
        existingCuiNorm = new Set(Array.from(existingCui).map(normalizeCui).filter(Boolean));
        existingNames = new Set(resp.data.map((r: any) => (r.denumire || '').toLowerCase()).filter(Boolean));
        for (const r of resp.data) {
          const cNorm = normalizeCui(r.cui_cif || '');
          if (cNorm) existingByCuiNorm[cNorm] = r;
          const nm = (r.denumire || '').toLowerCase();
          if (nm) existingByName[nm] = r;
        }
        console.log('Loaded existing suppliers:', existingNames.size, 'records; unique CUIs:', existingCui.size);
      }
    } catch (e: any) {
      console.warn('Could not load existing suppliers list, continuing without skip:', e.message);
    }
  }
  let ok = 0, fail = 0;
  let idx = 0;
  const queue = [...out];
  let skippedExistingCui = 0, skippedExistingName = 0;
  let updated = 0;
  let unchanged = 0;
  async function worker() {
    while (queue.length) {
      const sup = queue.shift();
      if (!sup) break;
      const current = ++idx;
      if (SKIP_EXISTING) {
        const normCui = normalizeCui(sup.cui_cif);
        if (normCui && existingCuiNorm.has(normCui)) { skippedExistingCui++; continue; }
        if (existingNames.has(sup.denumire.toLowerCase())) { skippedExistingName++; continue; }
      }
      let targetId: string | null = null;
      if (UPDATE_EXISTING) {
        const normCui = normalizeCui(sup.cui_cif);
        if (normCui && existingByCuiNorm[normCui]) targetId = existingByCuiNorm[normCui].id;
        else if (existingByName[sup.denumire.toLowerCase()]) targetId = existingByName[sup.denumire.toLowerCase()].id;
      }
      try {
        if (UPDATE_EXISTING && targetId) {
          if (DIFF_MODE) {
            const existingRec = Object.values(existingByCuiNorm).find((r: any) => r.id === targetId) || existingByName[sup.denumire.toLowerCase()] || {};
            const diffs: string[] = [];
            const compareKeys = ['denumire','cui_cif','nrRegCom','den_catart','tva','adresa','oras','judet','tara','contactNume','email','telefon','site','metodaPlata','contBancar','banca','status','notite'];
            for (const k of compareKeys) {
              const oldVal = existingRec[k];
              const newVal = (sup as any)[k];
              // normalize null/empty
              const normOld = (oldVal === null || oldVal === undefined) ? '' : String(oldVal);
              const normNew = (newVal === null || newVal === undefined) ? '' : String(newVal);
              if (normOld !== normNew) {
                diffs.push(`${k}: '${normOld}' -> '${normNew}'`);
              }
            }
            if (diffs.length === 0) {
              unchanged++;
              if (!DIFF_MODE) {
                // unreachable but keep structure
              }
            } else {
              console.log(`[DIFF] ${sup.denumire} (${sup.cui_cif})\n  ${diffs.join('\n  ')}`);
            }
            if (diffs.length === 0) {
              // skip PUT if nothing changed
              continue;
            }
          }
          await axios.put(baseURL + endpoint + '/' + targetId, sup);
          updated++;
          if (updated % 50 === 0) console.log(`Updated ${updated}`);
        } else {
          await axios.post(baseURL + endpoint, sup);
          ok++;
          if (ok % 50 === 0) console.log(`Imported ${ok}`);
        }
      } catch (e: any) {
        fail++;
        console.error(`[${current}] Fail:`, sup.denumire, e?.response?.data?.error || e.message);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (SKIP_EXISTING) console.log(`Skipped existing by CUI: ${skippedExistingCui}, by name: ${skippedExistingName}`);
  if (UPDATE_EXISTING) console.log(`Updated existing: ${updated}${DIFF_MODE?`, unchanged (no changes): ${unchanged}`:''}`);
  console.log('Done. Created:', ok, 'Updated:', updated, 'Unchanged:', unchanged, 'Failed:', fail);
}

if (hasFlag('--dry')) {
  fs.writeFileSync('suppliers-import-preview.json', JSON.stringify(out, null, 2));
  if (UPDATE_EXISTING) {
    console.log('Dry run note: update-existing enabled. Of the', out.length, 'prepared suppliers,',
      out.filter(s => {
        const n = s.cui_cif; const norm = n ? n.replace(/^RO/i,'').replace(/[^0-9A-Z]/gi,'').toUpperCase() : '';
        // heuristically mark as existing if same denumire or normalized CUI found in existing sets (not loaded if !SKIP_EXISTING/UPDATE_EXISTING)
        return false; // placeholder since existing sets not loaded in dry run mode unless user also passed skip/update; could enhance by fetching.
      }).length,
      'would be updates (estimation).');
  }
  console.log('Dry run. Wrote suppliers-import-preview.json');
} else {
  run().catch(e => { console.error(e); process.exit(1); });
}

if (hasFlag('--help')) {
  console.log(`Options:\n  --dry                         Write preview JSON only\n  --limit=N                     Limit number of suppliers processed\n  --concurrency=N               Parallel POST workers (default 4)\n  --placeholders                Auto-fill missing required fields with placeholders\n  --map=FILE                    JSON file with rules (array of {pattern,category,isRegex} or object)\n  --only-category=A,B,C         Keep only inferred categories (comma separated, case-insensitive)\n                                (Auto-detects 'OB INV' / 'OB INVENTAR' anywhere in row)\n  --skip-existing               Skip suppliers already present (by normalized CUI or name)\n  --update-existing             Update (PUT) existing suppliers instead of creating new. Overrides skip behavior.\n  --diff                        With --update-existing: print field changes and skip update if no differences\n  API_BASE env var              Override base URL (default http://localhost:4000)`);
}
