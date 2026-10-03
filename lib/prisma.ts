import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { getEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  // Pool pequeno por instância: em serverless cada função abre o seu, e o
  // dispatcher + cron em paralelo esgotavam as conexões do Postgres.
  const adapter = new PrismaPg({
    connectionString: getEnv().DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

// Sempre em cache: o proxy abaixo chama getClient() a cada acesso, então sem
// isso cada query abriria um PrismaClient (e um pool pg) novo em produção.
function getClient(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

// Lazy proxy: the real client (and env parsing) is created on first property
// access — i.e. the first query at request time — not at module import. This
// keeps `next build` config collection from instantiating Prisma in an env
// without runtime secrets.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
}) as PrismaClient;
