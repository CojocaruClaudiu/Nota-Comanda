import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const employees = [
  { name: 'BARBU VIOREL-DANIEL', birthDate: '1975-07-01', hiredAt: '2025-05-05' },
  { name: 'BRAGAU FLORIN', birthDate: '1973-04-21', hiredAt: '2020-07-14' },
  { name: 'BUTARU DAN', birthDate: '1968-06-02', hiredAt: '2014-03-12' },
  { name: 'CALINESCU BOGDAN', birthDate: '1987-08-30', hiredAt: '2012-08-03' },
  { name: 'CHELARESCU LUCIAN', birthDate: '1981-07-02', hiredAt: '2019-10-15' },
  { name: 'CIMPOERU ION', birthDate: '1977-05-10', hiredAt: '2016-04-06' },
  { name: 'CIOVLICA PETRU', birthDate: '1987-01-03', hiredAt: '2025-01-09' },
  { name: 'DRAGOMIR CONSTANTIN', birthDate: '1973-01-26', hiredAt: '2020-12-15' },
  { name: 'IONITA FLORIN-DANIEL', birthDate: null, hiredAt: '2025-08-20' },
  { name: 'MANOLE CONSTANTIN', birthDate: null, hiredAt: '2025-03-06' },
  { name: 'MOSOR FLORIN-IONUT', birthDate: null, hiredAt: '2025-03-06' },
  { name: 'MICLIUC SORIN', birthDate: '1971-05-13', hiredAt: '2010-06-28' },
  { name: 'NICHIFOR IONEL', birthDate: '1970-10-22', hiredAt: '2024-03-04' },
  { name: 'NITU ION-VALENTIN', birthDate: null, hiredAt: '2025-07-21' },
  { name: 'OPREA STEFAN', birthDate: '1969-10-06', hiredAt: '2018-03-06' },
  { name: 'OPREA MIHAI', birthDate: '1974-11-02', hiredAt: '2024-01-30' },
  { name: 'PAVEL DANIEL', birthDate: '1988-05-27', hiredAt: '2022-06-21' },
  { name: 'ROTOROAIA GHEORGHE', birthDate: null, hiredAt: '2025-07-15' },
  { name: 'SAVU NICOLAE', birthDate: '1989-02-25', hiredAt: '2019-08-12' },
  { name: 'SERCAIANU GHEORGHE', birthDate: '1975-02-06', hiredAt: '2016-01-06' },
  { name: 'SOGODEL DOINA', birthDate: '1971-10-24', hiredAt: '2024-04-02' },
  { name: 'STAN MIHAIL', birthDate: '1968-09-19', hiredAt: '2018-09-03' },
  { name: 'SUDITU IONUT ALEXANDRU', birthDate: '1997-06-21', hiredAt: '2021-02-02' },
  { name: 'TALANGA NICOLETA', birthDate: '1988-03-29', hiredAt: '2016-05-23' },
  { name: 'TUTICA ROMEO-FLORENTIN', birthDate: '1980-08-23', hiredAt: '2017-12-11' },
  { name: 'CIUREA VASILICA', birthDate: '1973-09-03', hiredAt: '2011-09-21' },
  { name: 'COJOCARU DRAGOS', birthDate: '1974-08-15', hiredAt: '2020-09-01' },
  { name: 'COJOCARU RAZVAN-GABRIEL', birthDate: '1976-06-08', hiredAt: '2008-01-01' },
  { name: 'COJOCARU GEORGETA-SIMONA', birthDate: '1982-10-31', hiredAt: '2015-06-08' },
  { name: 'COJOCARU CLAUDIU-MIHAIL', birthDate: '2001-09-13', hiredAt: '2025-01-28' },
  { name: 'MORARU ION', birthDate: null, hiredAt: new Date().toISOString().split('T')[0] }, // Unknown hire date, using today
];

async function main() {
  let imported = 0;
  let failed = 0;

  for (const employee of employees) {
    try {
      await prisma.employee.create({
        data: {
          name: employee.name,
          birthDate: employee.birthDate ? new Date(employee.birthDate) : null,
          hiredAt: new Date(employee.hiredAt),
        },
      });
      imported++;
      console.log(`✓ Imported: ${employee.name}`);
    } catch (err: any) {
      failed++;
      console.error(`✗ Error importing ${employee.name}:`, err.message);
    }
  }

  console.log(`\nDone. Imported: ${imported}, Failed: ${failed}`);
  await prisma.$disconnect();
}

main();
