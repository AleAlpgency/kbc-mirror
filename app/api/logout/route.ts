import { NextResponse } from "next/server";
import { badOrigin, badRequest, rateLimited, tooMany } from "@/lib/http";
import { clearSession } from "@/lib/session";

export async function POST(req: Request) {
  if (rateLimited(req)) return tooMany();
  if (badOrigin(req)) return badRequest();
  await clearSession();
  return NextResponse.json({ ok: true });
}
