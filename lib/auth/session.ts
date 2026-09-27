import "server-only";
import { compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

const COOKIE = "wa_console_session";

function secret() {
  return new TextEncoder().encode(getEnv().AUTH_SECRET);
}

export async function verifyOwnerCredentials(email: string, password: string) {
  const env = getEnv();
  if (email.toLowerCase() !== env.OWNER_EMAIL.toLowerCase()) return null;
  if (!(await compare(password, env.OWNER_PASSWORD_HASH))) return null;
  return prisma.user.upsert({
    where: { email: env.OWNER_EMAIL.toLowerCase() },
    create: { email: env.OWNER_EMAIL.toLowerCase(), passwordHash: env.OWNER_PASSWORD_HASH, name: "Proprietário" },
    update: { passwordHash: env.OWNER_PASSWORD_HASH },
  });
}

export async function createSession(user: { id: string; email: string }) {
  const token = await new SignJWT({ email: user.email, role: "OWNER" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, secret());
    if (!verified.payload.sub || typeof verified.payload.email !== "string") return null;
    return { userId: verified.payload.sub, email: verified.payload.email };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireApiUser() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
