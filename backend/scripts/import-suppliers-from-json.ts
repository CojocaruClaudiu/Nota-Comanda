import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonFilePath = path.join(__dirname, 'suppliers/suppliers-import-preview.json');

async function main() {
  const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
  const suppliers = JSON.parse(fileContent);

  let imported = 0;
  let failed = 0;

  for (const supplier of suppliers) {
    try {
      await prisma.furnizor.upsert({
        where: { denumire: supplier.denumire },
        update: {
          cui_cif: supplier.cui_cif || '',
          id_tert: supplier.id_tert || '',
          nrRegCom: supplier.nrRegCom || null,
          den_catart: supplier.den_catart || null,
          tva: supplier.tva || false,
          tvaData: supplier.tvaData ? new Date(supplier.tvaData) : null,
          adresa: supplier.adresa || '',
          oras: supplier.oras || '',
          judet: supplier.judet || '',
          tara: supplier.tara || '',
          contactNume: supplier.contactNume || '',
          email: supplier.email || null,
          telefon: supplier.telefon || null,
          site: supplier.site || null,
          metodaPlata: supplier.metodaPlata || '',
          contBancar: supplier.contBancar || '',
          banca: supplier.banca || '',
          status: supplier.status || 'activ',
          notite: supplier.notite || null,
        },
        create: {
          denumire: supplier.denumire,
          cui_cif: supplier.cui_cif || '',
          id_tert: supplier.id_tert || '',
          nrRegCom: supplier.nrRegCom || null,
          den_catart: supplier.den_catart || null,
          tva: supplier.tva || false,
          tvaData: supplier.tvaData ? new Date(supplier.tvaData) : null,
          adresa: supplier.adresa || '',
          oras: supplier.oras || '',
          judet: supplier.judet || '',
          tara: supplier.tara || '',
          contactNume: supplier.contactNume || '',
          email: supplier.email || null,
          telefon: supplier.telefon || null,
          site: supplier.site || null,
          metodaPlata: supplier.metodaPlata || '',
          contBancar: supplier.contBancar || '',
          banca: supplier.banca || '',
          status: supplier.status || 'activ',
          notite: supplier.notite || null,
        },
      });
      imported++;
      console.log(`✓ Imported: ${supplier.denumire}`);
    } catch (err: any) {
      failed++;
      console.error(`✗ Error importing ${supplier.denumire}:`, err.message);
    }
  }
  
  console.log(`\nDone. Imported: ${imported}, Failed: ${failed}`);
  await prisma.$disconnect();
}

main();
