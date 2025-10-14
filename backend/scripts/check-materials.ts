import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Count all materials
    const total = await prisma.material.count();
    console.log(`\n📊 Total materials in database: ${total}\n`);
    
    if (total > 0) {
      // Count by reception type
      const santier = await prisma.material.count({ where: { receptionType: 'SANTIER' } });
      const magazie = await prisma.material.count({ where: { receptionType: 'MAGAZIE' } });
      const undefined = await prisma.material.count({ where: { receptionType: null } });
      
      console.log('Breakdown by reception type:');
      console.log(`  - SANTIER: ${santier}`);
      console.log(`  - MAGAZIE: ${magazie}`);
      console.log(`  - Undefined: ${undefined}`);
      
      // Count with specific fields
      const withInvoice = await prisma.material.count({ where: { invoiceNumber: { not: null } } });
      const withQuantity = await prisma.material.count({ where: { receivedQuantity: { not: null } } });
      
      console.log('\nWith reception data:');
      console.log(`  - With invoice: ${withInvoice}`);
      console.log(`  - With quantity: ${withQuantity}`);
      
      // Show sample
      console.log('\n📋 Sample materials (first 5):');
      const sample = await prisma.material.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          code: true,
          description: true,
          supplierName: true,
          invoiceNumber: true,
          receivedQuantity: true,
          purchaseDate: true,
          receptionType: true,
        },
      });
      
      sample.forEach((m, i) => {
        console.log(`\n${i + 1}. ${m.code} - ${m.description.substring(0, 50)}`);
        console.log(`   Supplier: ${m.supplierName || 'N/A'}`);
        console.log(`   Invoice: ${m.invoiceNumber || 'N/A'}`);
        console.log(`   Quantity: ${m.receivedQuantity || 'N/A'}`);
        console.log(`   Type: ${m.receptionType || 'N/A'}`);
        console.log(`   Date: ${m.purchaseDate ? new Date(m.purchaseDate).toLocaleDateString('ro-RO') : 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
