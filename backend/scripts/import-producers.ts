/* Script: import-producers.ts
   Imports a curated list of producers with observations.
   Run: npm run tsx scripts/import-producers.ts (or tsx scripts/import-producers.ts)
*/
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Normalize helper: collapse spaces & trim
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

interface Row { name: string; adresa?: string | null; telefon?: string | null; email?: string | null; site?: string | null; observatii?: string | null; }

// Data exactly from latest user-provided table. Transform rules:
//  - Emails or phones starting with '—' become null
//  - Multiple sites separated by ' / ' converted to '; '
//  - Multiple emails separated by whitespace kept with '; '
//  - Observații tabs replaced with single space
const rows: Row[] = [
  { name: 'S.C. HENKEL ROMANIA S.R.L. (brand: Ceresit)', adresa: 'Str. Ioniță Vornicul nr. 1-7, Sector 2, 020325, București', telefon: '+40 21 203 26 00', email: null, site: 'https://www.ceresit.ro; https://www.henkel.ro', observatii: 'Ceresit este marcă Henkel în RO, operată de Henkel Romania SRL' },
  { name: 'S.C. BAUMIT ROMANIA COM S.R.L.', adresa: 'B-dul Iuliu Maniu nr. 600A, Sector 6, 061129, București', telefon: '+40 21 350 01 06', email: 'office@baumit.ro', site: 'https://www.baumit.ro', observatii: null },
  { name: 'S.C. GEWISS ROMANIA S.R.L.', adresa: 'Oregon Park, Bd. Dimitrie Pompeiu 5-7 (fost Sos. Pipera 46D-46E-48), Sector 2, 020334, București', telefon: '+40 21 232 05 30', email: 'gewiss-ro@gewiss.com', site: 'https://www.gewiss.com/RO/ro', observatii: null },
  { name: 'S.C. ARABESQUE S.R.L.', adresa: 'Aleea Teișani nr. 3–25, Intrarea A, Sector 1, 014034, București (sediu central)', telefon: '+40 374 389 039', email: 'office@arabesque.ro', site: 'https://arabesque.ro', observatii: 'Brand retail: MatHaus' },
  { name: 'S.C. KRONOSPAN TRADING S.R.L.', adresa: 'Str. Mihail Kogălniceanu nr. 59, 515800, Sebeș, jud. Alba', telefon: '+40 258 860 300', email: 'sales.sebes@kronospan.ro', site: 'https://ro.kronospan.com', observatii: null },
  { name: 'NORGIPS Sp. z o.o. – Sucursala București', adresa: 'Str. Tudor Vladimirescu 22 (Green Gate), et. 7–10, Sector 5, 050883, București', telefon: '+40 726 502 134 (Country Manager)', email: 'nicolae.alexandrescu@norgips.ro', site: 'https://www.norgips.ro', observatii: 'Sucursala locală a NORGIPS (Polonia)' },
  { name: 'S.C. SAINT‑GOBAIN CONSTRUCTION PRODUCTS ROMANIA S.R.L. – ISOVER', adresa: 'Calea Floreasca nr. 165, One Tower, et. 10, Sector 1, 014459, București', telefon: '+40 21 207 57 50', email: 'info.constructionproducts@saint-gobain.com', site: 'https://www.isover.ro', observatii: 'ISOVER este marcă Saint‑Gobain' },
  { name: 'S.C. KNAUF GIPS S.R.L.', adresa: 'Bd. Tudor Vladimirescu nr. 29, AFI Tech Park 1, et. 1, Sector 5, 050881, București', telefon: '+40 21 650 00 40', email: 'office@knauf.ro', site: 'https://www.knauf.ro', observatii: null },
  { name: 'S.C. CELCO S.A.', adresa: 'Șos. Industrială nr. 5, 900147, Constanța', telefon: '+40 241 582 068', email: 'celco@celco.ro', site: 'https://www.celco.ro', observatii: null },
  { name: 'S.C. ETEX BUILDING PERFORMANCE S.A. – SINIAT', adresa: 'Str. Vulturilor nr. 98, et. 5–6, 030857, Sector 3, București', telefon: '+40 31 224 0100', email: 'siniat.ro@etexgroup.com', site: 'https://www.siniat.ro', observatii: 'Siniat este marcă a Etex' },
  { name: 'PERROT Regnerbau Calw GmbH (DE) – reprezentanță prin dealeri în RO', adresa: 'Industriestraße 19–29, 75382 Althengstett, Germania', telefon: '+49 7051 162-0', email: 'perrot@perrot.de', site: 'https://www.perrot.de', observatii: 'Nu există entitate juridică PERROT Romania; distribuție prin dealeri' },
  { name: 'S.C. SEA ROMANIA S.R.L.', adresa: 'Str. Progresului nr. 110–116, 050695, Sector 5, București', telefon: null, email: 'office@sea.ro', site: 'https://www.sea.ro', observatii: 'Automatizări porți / soluții securizare acces (reprezentanți zonali pe site)' },
  { name: 'S.C. KLINKER‑RO‑IMP S.R.L. (brand: Klinker România)', adresa: 'B-dul Griviței nr. 26G, 500182, Brașov', telefon: '+40 755 744 973', email: 'info@klinker-romania.ro; bucuresti@klinker-romania.ro', site: 'https://www.klinker-romania.ro', observatii: 'KLINKER ROMANIA SRL (CUI 14602073) este radiată; operațional prin KLINKER‑RO‑IMP SRL' },
  { name: 'S.C. ADEPLAST S.R.L. (o companie Sika România)', adresa: 'Str. Adeplast nr. 164A, 107063, Corlătești, jud. Prahova', telefon: '+40 244 338 000', email: 'office@adeplast.ro', site: 'https://www.adeplast.ro; https://rou.sika.com', observatii: 'AdePlast parte din Sika din 2019' },
  { name: 'S.C. MAPEI ROMANIA S.R.L.', adresa: 'Calea 13 Septembrie nr. 90, Sector 5, 050726, București', telefon: '+40 21 335 17 66', email: 'office@mapei.ro', site: 'https://www.mapei.ro', observatii: null },
  { name: 'S.C. SOCERAM S.A.', adresa: 'Str. Câmpulung nr. 805, 135300, Fieni, jud. Dâmbovița', telefon: '+40 245 775 821', email: 'comercial.sediu@soceram.ro', site: 'https://www.soceram.ro', observatii: null },
  { name: 'S.C. METIGLA S.R.L.', adresa: 'Str. Gloriei nr. 11, 117355, Sat Topoloveni, jud. Argeș', telefon: '+40 248 502 500', email: 'info@metigla.ro', site: 'https://www.metigla.ro', observatii: 'Fost Coilprofil' },
  { name: 'S.C. BILKA STEEL S.R.L.', adresa: 'Str. Henri Coandă nr. 17, 500167, Brașov', telefon: '+40 733 30 30 30', email: 'office@bilka.ro', site: 'https://www.bilka.ro', observatii: null },
  { name: 'S.C. TERASTEEL S.A.', adresa: 'Calea Teraplast nr. 1A, Sat Sărățel, Com. Șieu‑Măgheruș, 427301, jud. Bistrița‑Năsăud', telefon: '+40 751 279 628 (DPO)', email: 'gdpr@terasteel.ro (general)', site: 'https://terasteel.ro', observatii: 'Email general disponibil public ca adresă GDPR' },
  { name: 'S.C. WETTERBEST S.A.', adresa: 'Str. Înfrățirii nr. 142, 105200, Băicoi, jud. Prahova', telefon: '+40 735 353 535', email: 'office@wetterbest.ro', site: 'https://www.wetterbest.ro', observatii: null },
  { name: 'S.C. DUCTIL S.A. (Lincoln Electric) – pentru brandul SAF‑FRO / Oerlikon în RO', adresa: 'Aleea Industriilor nr. 1–1 Bis, 120068, Buzău', telefon: '+40 238 722 051', email: 'office.ductil@lincolnelectric.com', site: 'https://le-eu-prd-linux-ductil.azurewebsites.net', observatii: 'SAF‑FRO aparține Lincoln Electric; Ductil este entitatea din RO' },
];

async function main() {
  for (const r of rows) {
    const name = norm(r.name);
    try {
    await prisma.producator.upsert({
        where: { name },
        create: {
          name,
          status: 'activ',
          adresa: r.adresa ? norm(r.adresa) : null,
          contBancar: null,
          banca: null,
      email: r.email && r.email.startsWith('—') ? null : (r.email ? r.email.replace(/\s+;+\s+/g, '; ').replace(/\s{2,}/g,' ').trim() : null),
      telefon: r.telefon && r.telefon.startsWith('—') ? null : (r.telefon || null),
      site: r.site ? r.site.replace(/\s+\/\s+/g, '; ').trim() : null,
          observatii: r.observatii || null,
        },
        update: {
          adresa: r.adresa ? norm(r.adresa) : null,
      email: r.email && r.email.startsWith('—') ? null : (r.email ? r.email.replace(/\s+;+\s+/g, '; ').replace(/\s{2,}/g,' ').trim() : null),
      telefon: r.telefon && r.telefon.startsWith('—') ? null : (r.telefon || null),
      site: r.site ? r.site.replace(/\s+\/\s+/g, '; ').trim() : null,
          observatii: r.observatii || null,
        },
      });
      console.log('Upserted:', name);
    } catch (e) {
      console.error('Failed for', name, e);
    }
  }
}

main().finally(async () => { await prisma.$disconnect(); });
