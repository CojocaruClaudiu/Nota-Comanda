import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const run = async () => {
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`;
  console.log(tables);
};

run().catch((err) => {
  console.error(err);
}).finally(async () => {
  await prisma.$disconnect();
});
