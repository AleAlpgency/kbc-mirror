import { NextResponse } from "next/server";

export const unauthorized = () => NextResponse.json({ error: "Not signed in" }, { status: 401 });
export const badRequest = () => NextResponse.json({ error: "Invalid request" }, { status: 400 });
export const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
export const tooMany = () => NextResponse.json({ error: "Too many requests" }, { status: 429 });

// ponytail: in-memory per-IP limiter, fine for one process; move to a shared store behind a load balancer.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const LIMIT = 60;

export function rateLimited(req: Request): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > LIMIT;
}

/** Reject cross-site form posts: JSON only, same-origin only. */
export function badOrigin(req: Request): boolean {
  if (!(req.headers.get("content-type") || "").includes("application/json")) return true;
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false; // same-origin fetch without Origin header (non-browser clients) is not a CSRF vector
  return new URL(origin).host !== host;
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
