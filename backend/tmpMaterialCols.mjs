import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const run = async () => {
  const cols = await prisma.$queryRaw`SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Material' ORDER BY ordinal_position;`;
  console.log(cols);
};

run().catch((err) => console.error(err)).finally(async () => {
  await prisma.$disconnect();
});
