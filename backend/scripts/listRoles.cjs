const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  const roles = await prisma.role.findMany();
  console.log(JSON.stringify(roles, null, 2));
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
