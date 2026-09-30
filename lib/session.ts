import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { isPersonaId } from "./data.ts";

const COOKIE = "mirror_session";
// One secret per process. Kept on globalThis so every route bundle signs and verifies with the same key.
const g = globalThis as unknown as { __mirrorSecret?: string };
const SECRET: string =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : (g.__mirrorSecret ??= randomBytes(32).toString("hex"));
const MAX_AGE_S = 60 * 60 * 4;

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export async function setSession(customerId: string): Promise<void> {
  const payload = `${customerId}.${Date.now() + MAX_AGE_S * 1000}`;
  const value = `${payload}.${sign(payload)}`;
  const jar = await cookies();
  jar.set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** Returns the authenticated customer id or null. Every data route must call this first. */
export async function currentUser(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  const expected = sign(`${id}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now()) return null;
  if (!isPersonaId(id)) return null;
  return id;
}
