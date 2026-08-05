import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    console.log("=========================================");
    console.log(" PostgreSQL Connection: SUCCESSFUL! 🎉");
    console.log(` Total Users in Database: ${userCount}`);
    console.log("=========================================");
  } catch (err) {
    console.error("PostgreSQL Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
