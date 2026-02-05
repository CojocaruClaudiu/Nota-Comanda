const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ADMIN_EMAILS = [
  'claudiu@topazconstruct.ro',
  'simona@topazconstruct.ro',
  'razvan@topazconstruct.ro',
];

(async () => {
  const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  const staffRole = await prisma.role.findUnique({ where: { name: 'STAFF' } });

  if (!adminRole) throw new Error('ADMIN role not found');

  for (const email of ADMIN_EMAILS) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.warn(`User not found: ${email}`);
      continue;
    }

    // Ensure ADMIN role
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
      update: {},
      create: { userId: user.id, roleId: adminRole.id },
    });

    // Remove STAFF role if present
    if (staffRole) {
      await prisma.userRole.deleteMany({
        where: { userId: user.id, roleId: staffRole.id },
      });
    }
  }

  console.log(JSON.stringify({ updated: ADMIN_EMAILS }, null, 2));
})()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
