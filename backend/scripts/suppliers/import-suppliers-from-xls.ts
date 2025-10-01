import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import axios from 'axios';

(dayjs as any).extend(customParseFormat);

interface SupplierPayload {
  id_tert: string;
  denumire: string;
  cui_cif: string;
  nrRegCom: string;
  tip: string;
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
  termenPlata: number;
  contBancar: string;
  banca: string;
  status: string;
  notite: string;
}

const FILE = process.argv[2] || 'temp.xls';
const full = path.resolve(FILE);

if (!fs.existsSync(full)) {
  console.error('File not found:', full);
  process.exit(1);
}

const wb = XLSX.readFile(full, { cellDates: false, raw: false });
const sheetName = wb.SheetNames[0];
const sheet = wb.Sheets[sheetName];
const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

const parseDate = (v: string): string | null => {
  if (!v) return null;
  const cleaned = v.trim().replace(/\s+00:00$/, '');
  const d = dayjs(cleaned, ['DD.MM.YYYY', 'DD.MM.YYYY HH:mm'], true);
  return d.isValid() ? d.format('YYYY-MM-DD') : null;
};

const norm = (s: any) => (s == null ? '' : String(s)).trim();
const countryMap: Record<string,string> = { RO: 'România' };

const seen = new Set<string>();
const out: SupplierPayload[] = [];

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
  const oras = norm(r.oras_tert) || norm((r.loco_tert || '').split(/[,]/)[0]);
  const judet = norm(r.judet_tert);
  const tara = countryMap[norm(r.cod_tzara)] || 'România';
  const telefon = norm(r.tel1);
  const email = norm(r.email1).toLowerCase();
  const banca = norm(r.banca_tert);
  const contBancar = norm(r.iban_tert);
  const site = '';
  const contactNume = '';
  const tip = 'SRL';
  if (!den_tert) continue;

  const dedupeKey = id_tert || (cui_cif + '|' + den_tert.toLowerCase());
  if (seen.has(dedupeKey)) continue;
  seen.add(dedupeKey);

  out.push({
    id_tert: id_tert || '',
    denumire: den_tert,
    cui_cif: cui_cif,
    nrRegCom,
    tip,
    tva,
    tvaData: tvaStart,
    adresa,
    oras,
    judet,
    tara,
    contactNume,
    email,
    telefon,
    site,
    metodaPlata: 'OP',
    termenPlata: 30,
    contBancar,
    banca,
    status: 'activ',
    notite: ''
  });
}

console.log(`Prepared ${out.length} suppliers (from ${rows.length} rows).`);

async function run() {
  const baseURL = process.env.API_BASE || 'http://localhost:3000';
  let ok = 0, fail = 0;
  for (const sup of out) {
    try {
      await axios.post(baseURL + '/api/suppliers', sup);
      ok++;
    } catch (e: any) {
      fail++;
      console.error('Fail:', sup.denumire, e?.response?.data?.error || e.message);
    }
  }
  console.log('Done. OK:', ok, 'Failed:', fail);
}

if (process.argv.includes('--dry')) {
  fs.writeFileSync('suppliers-import-preview.json', JSON.stringify(out, null, 2));
  console.log('Dry run. Wrote suppliers-import-preview.json');
} else {
  run().catch(e => { console.error(e); process.exit(1); });
}
