import fs from 'fs';
import path from 'path';
import xlsxImport from 'xlsx';
const XLSX: any = (xlsxImport && (xlsxImport as any).readFile) ? xlsxImport : (xlsxImport as any).default || xlsxImport;
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper functions
const norm = (v: any): string => {
  if (v == null) return '';
  const s = String(v).trim();
  return s === '-' || s === '—' || s === 'N/A' || s.toLowerCase() === 'n/a' ? '' : s;
};

// Map material descriptions to groups
const materialGroupMapping: Record<string, string> = {
  // Adhesives
  'ADEZIV': 'Adezivi',
  'CLEI': 'Adezivi',
  
  // Paints & Coatings
  'VOPSEA': 'Vopsele',
  'VOPSELE': 'Vopsele',
  'GRUND': 'Vopsele',
  'AMORSA': 'Vopsele',
  'LAC': 'Vopsele',
  
  // Cement & Concrete
  'CIMENT': 'Cimenturi și Betoane',
  'BETON': 'Cimenturi și Betoane',
  'MORTAR': 'Cimenturi și Betoane',
  
  // Plaster & Gypsum
  'GIPS': 'Gipsuri și Tencuieli',
  'TENCUIALA': 'Gipsuri și Tencuieli',
  'IPSOS': 'Gipsuri și Tencuieli',
  
  // Wood materials
  'CHERESTEA': 'Lemn',
  'SCANDURA': 'Lemn',
  'OSB': 'Plăci',
  'PAL': 'Plăci',
  'MDF': 'Plăci',
  'PLACAJ': 'Plăci',
  
  // Insulation
  'VATA': 'Izolații',
  'POLISTIREN': 'Izolații',
  'POLIURETAN': 'Izolații',
  'IZOLATIE': 'Izolații',
  
  // Waterproofing
  'HIDROIZOLATIE': 'Hidroizolații',
  'MEMBRANA': 'Hidroizolații',
  
  // Tiles & Ceramics
  'GRESIE': 'Gresie și Faianță',
  'FAIANTA': 'Gresie și Faianță',
  'PLACAJ CERAMIC': 'Gresie și Faianță',
  
  // Metal profiles
  'PROFIL METALIC': 'Profile Metalice',
  'SINA': 'Profile Metalice',
  'RIGIPS': 'Profile Metalice',
  'TABLA': 'Tablă',
  
  // Hardware
  'SURUB': 'Elemente de fixare',
  'DIBLU': 'Elemente de fixare',
  'CUIE': 'Elemente de fixare',
  'PIULITA': 'Elemente de fixare',
  
  // Pipes & Fittings
  'TEAVA': 'Conducte',
  'TUB': 'Conducte',
  'FITINGURI': 'Fitinguri',
  'RACORD': 'Fitinguri',
  
  // Electrical
  'CABLU': 'Electrice',
  'FIR': 'Electrice',
  'PRIZA': 'Electrice',
  'INTRERUPATOR': 'Electrice',
  
  // Other
  'CARAMIDA': 'Cărămizi și BCA',
  'BCA': 'Cărămizi și BCA',
};

function inferMaterialGroup(description: string): string {
  const upper = description.toUpperCase();
  
  for (const [keyword, group] of Object.entries(materialGroupMapping)) {
    if (upper.includes(keyword)) {
      return group;
    }
  }
  
  return 'Diverse'; // Default group for unmatched materials
}

// Extract unit from description (common patterns)
function extractUnit(description: string): string {
  const upper = description.toUpperCase();
  
  // Common unit patterns
  const unitPatterns = [
    { pattern: /\b(KG|KILOGRAM)\b/i, unit: 'kg' },
    { pattern: /\b(BUC|BUCATA|BUCATI)\b/i, unit: 'buc' },
    { pattern: /\b(M2|MP|METRI PATRATI)\b/i, unit: 'm2' },
    { pattern: /\b(M3|MC|METRI CUBI)\b/i, unit: 'm3' },
    { pattern: /\b(ML|M|METRU|METRI LINIARI)\b/i, unit: 'ml' },
    { pattern: /\b(L|LITRU|LITRI)\b/i, unit: 'l' },
    { pattern: /\b(SET)\b/i, unit: 'set' },
    { pattern: /\b(CUTIE)\b/i, unit: 'cutie' },
    { pattern: /\b(ROLA)\b/i, unit: 'rola' },
    { pattern: /\b(PACHET)\b/i, unit: 'pachet' },
  ];
  
  for (const { pattern, unit } of unitPatterns) {
    if (pattern.test(upper)) {
      return unit;
    }
  }
  
  return 'buc'; // Default unit
}

async function main() {
  const args = process.argv.slice(2);
  const FILE = args[0] && !args[0].startsWith('--') ? args[0] : 'scripts/suppliers/temp.xls';
  const full = path.resolve(FILE);
  
  if (!fs.existsSync(full)) {
    console.error('File not found:', full);
    process.exit(1);
  }
  
  console.log('Reading Excel file:', full);
  const workbook = XLSX.readFile(full);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`Total rows in Excel: ${rows.length}`);
  
  // Debug: Show column names from first row
  if (rows.length > 0) {
    console.log('\n=== Excel Columns (first row) ===');
    const firstRow: any = rows[0];
    Object.keys(firstRow).forEach(key => {
      console.log(`  - ${key}: ${String(firstRow[key]).substring(0, 50)}`);
    });
    console.log('');
  }
  
  // Filter rows where den_catart is MATERIALE
  const materialRows = rows.filter((r: any) => {
    const category = norm(r.den_catart);
    return category.toUpperCase() === 'MATERIALE';
  });
  
  console.log(`Found ${materialRows.length} materials (den_catart = MATERIALE)`);
  
  if (materialRows.length === 0) {
    console.log('No materials found. Exiting.');
    process.exit(0);
  }
  
  // Deduplicate materials by: code + supplier + price + date
  // This removes exact duplicate purchases while preserving price history
  const uniqueMaterials = new Map<string, any>();
  
  for (const r of materialRows) {
    const idProd = norm(r.id_prod);
    const supplierName = norm(r.den_tert);
    const supplierId = norm(r.id_tert);
    
    // Extract price - round to 2 decimals for consistent comparison
    let priceStr = norm(r.pret_in || r.pret || r.pret_unitar || r.price);
    priceStr = priceStr.replace(',', '.').replace(/[^\d.]/g, '');
    const price = (parseFloat(priceStr) || 0).toFixed(2);
    
    // Get purchase date - use date-only string (YYYY-MM-DD) to avoid time differences
    const excelDate = r.data;
    let dateKey = 'none';
    if (excelDate) {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      dateKey = date.toISOString().split('T')[0]; // Just the date part: YYYY-MM-DD
    }
    
    // Create unique key: product + supplier + price + date
    const key = `${idProd}|${supplierName}|${supplierId}|${price}|${dateKey}`;
    
    if (!uniqueMaterials.has(key)) {
      uniqueMaterials.set(key, r);
    }
  }
  
  console.log(`Found ${materialRows.length} total records`);
  console.log(`After deduplication: ${uniqueMaterials.size} unique purchases`);
  console.log(`Removed ${materialRows.length - uniqueMaterials.size} exact duplicates`);
  
  // Process materials - import unique purchase records
  console.log('\n=== Starting import ===\n');
  
  let totalCreated = 0;
  let totalSkipped = 0;
  let rowNumber = 0;
  
  for (const r of uniqueMaterials.values()) {
    rowNumber++;
    
    // Use denumire_produs for the material description
    const description = norm(r.denumire_produs || r.denumire_prod || r.den_prod);
    const supplierName = norm(r.den_tert);
    const supplierId = norm(r.id_tert);
    // Use id_prod as the primary code (product ID from your system)
    const code = norm(r.id_prod) || norm(r.cod_produs || r.cod_prod) || `MAT${rowNumber}`;
    
    if (!description) {
      console.log(`  ⊘ Row ${rowNumber}: Skipped - no product description`);
      totalSkipped++;
      continue;
    }
    
    const unit = extractUnit(description);
    
    // Extract price - use pret_in (purchase price)
    let priceStr = norm(r.pret_in || r.pret || r.pret_unitar || r.price);
    // Replace comma with dot for parsing
    priceStr = priceStr.replace(',', '.');
    // Remove any non-numeric characters except dot
    priceStr = priceStr.replace(/[^\d.]/g, '');
    const price = parseFloat(priceStr) || 0;
    
    // Extract purchase date from Excel date number
    // Excel stores dates as numbers (days since 1899-12-30)
    let purchaseDate: Date | null = null;
    const dateValue = r.data || r.data_livrare;
    if (dateValue && typeof dateValue === 'number') {
      // Convert Excel date number to JavaScript Date
      // Excel epoch: December 30, 1899
      const excelEpoch = new Date(1899, 11, 30);
      purchaseDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    } else if (dateValue) {
      // Try parsing as string date
      const parsed = new Date(dateValue);
      if (!isNaN(parsed.getTime())) {
        purchaseDate = parsed;
      }
    }
    
    // Create the material (allow all entries, even duplicates)
    try {
      await (prisma as any).material.create({
        data: {
          code: code,
          description: description,
          supplierName: supplierName || null,
          supplierId: supplierId || null,
          unit: unit,
          price: price,
          currency: 'RON',
          purchaseDate: purchaseDate,
          active: true,
        },
      });
      totalCreated++;
      
      if (totalCreated % 100 === 0) {
        console.log(`  ✓ Imported ${totalCreated} materials...`);
      }
    } catch (error: any) {
      console.error(`  ✗ Row ${rowNumber}: Failed to create material "${description}": ${error.message}`);
      totalSkipped++;
    }
  }
  
  console.log('\n=== Import Summary ===');
  console.log(`Materials Created: ${totalCreated}`);
  console.log(`Materials Skipped: ${totalSkipped}`);
  console.log(`Total Processed: ${uniqueMaterials.size}`);
  console.log('NOTE: Exact duplicates removed. Different purchases (dates/suppliers/prices) preserved.');
  
  // Show sample of imported data
  console.log('\n=== Sample of Imported Materials ===');
  const sample = await (prisma as any).material.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
  });
  
  console.log('\nLast 10 materials imported:');
  sample.forEach((m: any, i: number) => {
    console.log(`${i + 1}. ${m.code} - ${m.description.substring(0, 50)}${m.description.length > 50 ? '...' : ''}`);
    console.log(`   Supplier: ${m.supplierName || 'N/A'} | Unit: ${m.unit} | Price: ${m.price} ${m.currency}`);
  });
  
  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('Error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
