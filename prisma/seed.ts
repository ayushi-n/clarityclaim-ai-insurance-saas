import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const org = await db.organization.upsert({
    where: { slug: "meridian-mutual" },
    update: {},
    create: { name: "Meridian Mutual", slug: "meridian-mutual", planTier: "growth" },
  });

  const passwordHash = await bcrypt.hash("clarity-demo-2026", 12);
  await db.user.upsert({
    where: { email: "demo@meridianmutual.com" },
    update: {},
    create: {
      organizationId: org.id,
      name: "Alex Rivera",
      email: "demo@meridianmutual.com",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Seeded demo org + user: demo@meridianmutual.com / clarity-demo-2026");
}

main().finally(() => db.$disconnect());
