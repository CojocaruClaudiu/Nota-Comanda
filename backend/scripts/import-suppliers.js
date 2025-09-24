import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { parse as csvParse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvFilePath = path.join(__dirname, '../Furnizori.csv');

async function main() {
  const fileContent = fs.readFileSync(csvFilePath, 'utf8');
  const records = csvParse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: '\t', // tab-delimited
  });

  for (const record of records) {
    try {
      await prisma.furnizor.upsert({
        where: { denumire: record.Denumire_furnizor },
        update: {
          cui_cif: record.Cod_furnizor_contabilitate,
          id_tert: record.ID_tert,
          status: record.Activ === 'TRUE' ? 'activ' : 'inactiv',
        },
        create: {
          denumire: record.Denumire_furnizor,
          cui_cif: record.Cod_furnizor_contabilitate,
          id_tert: record.ID_tert,
          status: record.Activ === 'TRUE' ? 'activ' : 'inactiv',
          tip: '',
          tva: false,
          adresa: '',
          oras: '',
          judet: '',
          tara: '',
          contactNume: '',
          email: '',
          telefon: '',
          metodaPlata: '',
          termenPlata: 0,
          contBancar: '',
          banca: '',
        },
      });
      console.log(`Imported: ${record.Denumire_furnizor}`);
    } catch (err) {
      console.error(`Error importing ${record.Denumire_furnizor}:`, err.message);
    }
  }
  await prisma.$disconnect();
}

main();

// To run this script, use the following command:
// node scripts/import-suppliers.js
