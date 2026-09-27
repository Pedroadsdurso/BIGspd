import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash as bcryptHash } from "bcryptjs";
import { PrismaClient } from "../lib/generated/prisma/client";

const required = ["DATABASE_URL", "OWNER_EMAIL"] as const;
for (const key of required) if (!process.env[key]) throw new Error(`${key} é obrigatório para executar o seed.`);
if (!process.env.OWNER_PASSWORD_HASH?.trim() && !process.env.OWNER_PASSWORD?.trim()) {
  throw new Error("Defina OWNER_PASSWORD_HASH ou OWNER_PASSWORD para executar o seed.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const passwordHash = process.env.OWNER_PASSWORD_HASH?.trim() ?? (await bcryptHash(process.env.OWNER_PASSWORD!, 12));
  const email = process.env.OWNER_EMAIL!.trim().toLowerCase();
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: "Proprietário", passwordHash },
    update: { passwordHash },
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
