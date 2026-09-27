import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const required = ["DATABASE_URL", "OWNER_EMAIL", "OWNER_PASSWORD_HASH"] as const;
for (const key of required) if (!process.env[key]) throw new Error(`${key} é obrigatório para executar o seed.`);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: process.env.OWNER_EMAIL!.toLowerCase() },
    create: { email: process.env.OWNER_EMAIL!.toLowerCase(), name: "Proprietário", passwordHash: process.env.OWNER_PASSWORD_HASH! },
    update: { passwordHash: process.env.OWNER_PASSWORD_HASH! },
  });
  if (process.env.META_CLIENT_MODE === "mock") {
    const account = await prisma.whatsAppAccount.upsert({
      where: { userId_phoneNumberId: { userId: user.id, phoneNumberId: "mock-phone" } },
      create: { userId: user.id, wabaId: "mock-waba", phoneNumberId: "mock-phone", displayPhoneNumber: "+55 11 99999-0000", businessName: "Ambiente Mock", status: "CONNECTED", apiVersion: process.env.META_API_VERSION || "v25.0" },
      update: {},
    });
    await prisma.template.upsert({
      where: { accountId_name_language: { accountId: account.id, name: "ola_cliente", language: "pt_BR" } },
      create: { accountId: account.id, providerId: "mock-template-1", name: "ola_cliente", language: "pt_BR", category: "MARKETING", status: "APPROVED", components: [{ type: "BODY", text: "Olá {{1}}, temos uma novidade para você." }], variables: ["1"] },
      update: {},
    });
  }
}

main().finally(() => prisma.$disconnect());
