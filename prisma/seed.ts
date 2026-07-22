import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() { console.info("MicroManus uses Supabase Auth; users are created on first authenticated request."); }
main().finally(() => prisma.$disconnect());
