import { NextResponse } from "next/server";

export const unauthorized = () => NextResponse.json({ error: "Not signed in" }, { status: 401 });
export const badRequest = () => NextResponse.json({ error: "Invalid request" }, { status: 400 });
export const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
export const tooMany = () => NextResponse.json({ error: "Too many requests" }, { status: 429 });

// ponytail: in-memory per-IP limiter, fine for one process; move to a shared store behind a load balancer.
// x-forwarded-for is only trustworthy behind a proxy that sets it; the map is capped so a spoofer cannot grow memory.
const hits = new Map<string, number[]>();
const MAX_KEYS = 10_000;
const WINDOW_MS = 60_000;
const LIMIT = 60;

export function rateLimited(req: Request): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  if (!hits.has(ip) && hits.size >= MAX_KEYS) hits.clear();
  hits.set(ip, arr);
  return arr.length > LIMIT;
}

/** Reject cross-site form posts: JSON only, same-origin only. */
export function badOrigin(req: Request): boolean {
  if (!(req.headers.get("content-type") || "").includes("application/json")) return true;
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return true; // browsers always send Origin on POST; anything else is refused
  try { return new URL(origin).host !== host; } catch { return true; }
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
