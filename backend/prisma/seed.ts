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

  // Add Razvan
  const razvanEmail = "razvan@topazconstruct.ro";
  const razvanPass = "razvan123";
  const razvanHash = await bcrypt.hash(razvanPass, 10);
  const razvan = await prisma.user.upsert({
    where: { email: razvanEmail },
    update: {},
    create: { email: razvanEmail, name: "Razvan", passwordHash: razvanHash },
  });
  // Use STAFF as the default role for normal users
  const staffRole = roles.find((r) => r.name === "STAFF")!;
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: razvan.id, roleId: staffRole.id } },
    update: {},
    create: { userId: razvan.id, roleId: staffRole.id },
  });

  // Add Claudiu
  const claudiuEmail = "claudiu@topazconstruct.ro";
  const claudiuPass = "claudiu123";
  const claudiuHash = await bcrypt.hash(claudiuPass, 10);
  const claudiu = await prisma.user.upsert({
    where: { email: claudiuEmail },
    update: {},
    create: { email: claudiuEmail, name: "Claudiu", passwordHash: claudiuHash },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: claudiu.id, roleId: staffRole.id } },
    update: {},
    create: { userId: claudiu.id, roleId: staffRole.id },
  });

  console.log(`Seeded admin: ${email} / ${pass}`);
  console.log(`Seeded user: ${razvanEmail} / ${razvanPass}`);
  console.log(`Seeded user: ${claudiuEmail} / ${claudiuPass}`);
}

main().finally(() => prisma.$disconnect());
