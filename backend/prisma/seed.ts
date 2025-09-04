import { PrismaClient, RoleName } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Ensure roles
  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  // Admin user
  const email = "admin@topaz.local";
  const pass = "admin123"; // change after first login
  const passwordHash = await bcrypt.hash(pass, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Administrator", passwordHash },
  });

  const adminRole = roles.find((r) => r.name === "ADMIN")!;
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  console.log(`Seeded admin: ${email} / ${pass}`);
}

main().finally(() => prisma.$disconnect());
