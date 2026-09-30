import { NextResponse } from "next/server";
import { isPersonaId } from "@/lib/data";
import { badOrigin, badRequest, rateLimited, readJson, tooMany } from "@/lib/http";
import { setSession } from "@/lib/session";

// Demo sign-in: pick one of three synthetic personas. A real deployment would sit behind KBC's itsme/Kate authentication.
export async function POST(req: Request) {
  if (rateLimited(req)) return tooMany();
  if (badOrigin(req)) return badRequest();
  const body = await readJson(req);
  if (!body || !isPersonaId(body.persona)) return badRequest();
  await setSession(body.persona);
  return NextResponse.json({ ok: true });
}
