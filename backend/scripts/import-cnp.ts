import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Employee data with CNP
const employeesCNP = [
  { name: 'BRAGAU FLORIN', cnp: '1730421290911' },
  { name: 'BUTARU DAN', cnp: '1680602290120' },
  { name: 'CALINESCU BOGDAN', cnp: '1870830295907' },
  { name: 'CHELARESCU CONSTANTIN-LUCIAN', cnp: '1810702295938' },
  { name: 'CIMPOERU ION', cnp: '1770510290071' },
  { name: 'CIOVLICA PETRU VASILE', cnp: '1870103296622' },
  { name: 'CIUREA VASILICA', cnp: '2730903090018' },
  { name: 'COJOCARU CLAUDIU-MIHAIL', cnp: '5010913297263' },
  { name: 'COJOCARU DRAGOS-MARIAN', cnp: '1740815290088' },
  { name: 'COJOCARU GEORGETA-SIMONA', cnp: '2821031296613' },
  { name: 'COJOCARU RAZVAN GABRIEL', cnp: '1760608290098' },
  { name: 'DRAGOMIR CONSTANTIN', cnp: '1730126290082' },
  { name: 'IRIMESCU CATALIN-CONSTANTIN', cnp: '1790202290913' },
  { name: 'MANOLE CONSTANTIN', cnp: '1661222290922' },
  { name: 'MICLIUC SORIN', cnp: '1710513470014' },
  { name: 'MOSOR FLORIN-IONUT', cnp: '1880808295898' },
  { name: 'NICHIFOR IONEL', cnp: '1701022290076' },
  { name: 'OPREA MIHAI', cnp: '1741102290928' },
  { name: 'OPREA STEFAN', cnp: '1691006295881' },
  { name: 'PAVEL DANIEL', cnp: '1880527295916' },
  { name: 'SAVU NICOLAE', cnp: '1890225296610' },
  { name: 'SERCAIANU GHEORGHE', cnp: '1750206297316' },
  { name: 'SOGODEL DOINA', cnp: '2711024297349' },
  { name: 'STAN MIHAIL', cnp: '1680919290943' },
  { name: 'SUDITU IONUT-ALEXANDRU', cnp: '1970621297253' },
  { name: 'TALANGA NICOLETA', cnp: '2880329296619' },
  { name: 'TUTICA ROMEO-FLORENTIN', cnp: '1800823294732' },
];

async function importCNP() {
  console.log('Starting CNP import...\n');

  let updatedCount = 0;
  let notFoundCount = 0;
  let alreadyHadCNP = 0;
  let errors = 0;

  for (const emp of employeesCNP) {
    try {
      // Try to find employee by exact name match
      const employee = await prisma.employee.findFirst({
        where: {
          name: {
            equals: emp.name,
            mode: 'insensitive', // Case-insensitive search
          },
        },
      });

      if (!employee) {
        console.log(`❌ Employee not found: ${emp.name}`);
        notFoundCount++;
        continue;
      }

      // Check if CNP already exists
      if (employee.cnp) {
        if (employee.cnp === emp.cnp) {
          console.log(`✓ ${emp.name} - CNP already correct`);
          alreadyHadCNP++;
        } else {
          console.log(`⚠️  ${emp.name} - CNP mismatch! DB: ${employee.cnp}, New: ${emp.cnp}`);
          // Update anyway with new CNP
          await prisma.employee.update({
            where: { id: employee.id },
            data: { cnp: emp.cnp },
          });
          updatedCount++;
        }
        continue;
      }

      // Update employee with CNP
      await prisma.employee.update({
        where: { id: employee.id },
        data: { cnp: emp.cnp },
      });

      console.log(`✅ Updated ${emp.name} with CNP: ${emp.cnp}`);
      updatedCount++;
    } catch (error) {
      console.error(`❌ Error updating ${emp.name}:`, error);
      errors++;
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`✅ Updated: ${updatedCount}`);
  console.log(`✓ Already had CNP: ${alreadyHadCNP}`);
  console.log(`❌ Not found: ${notFoundCount}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`Total processed: ${employeesCNP.length}`);

  // List employees that were not found
  if (notFoundCount > 0) {
    console.log('\n=== Employees not found in database ===');
    for (const emp of employeesCNP) {
      const employee = await prisma.employee.findFirst({
        where: {
          name: {
            equals: emp.name,
            mode: 'insensitive',
          },
        },
      });
      if (!employee) {
        console.log(`- ${emp.name}`);
      }
    }
  }
}

importCNP()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('Fatal error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
