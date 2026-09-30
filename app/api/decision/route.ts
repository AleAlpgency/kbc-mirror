import { NextResponse } from "next/server";
import { buildLedger, ownsInference } from "@/lib/ledger";
import { badOrigin, badRequest, notFound, rateLimited, readJson, tooMany, unauthorized } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { getState, type Decision } from "@/lib/store";

const DECISIONS: Decision[] = ["confirmed", "corrected", "vetoed"];

export async function POST(req: Request) {
  if (rateLimited(req)) return tooMany();
  const user = await currentUser();
  if (!user) return unauthorized();
  if (badOrigin(req)) return badRequest();
  const body = await readJson(req);
  if (!body) return badRequest();
  const { inferenceId, decision, note } = body;
  if (typeof inferenceId !== "string" || inferenceId.length > 64) return badRequest();
  if (typeof decision !== "string" || !DECISIONS.includes(decision as Decision)) return badRequest();
  if (note !== undefined && (typeof note !== "string" || note.length > 200)) return badRequest();
  // Ownership: a customer can only decide on inferences about themselves.
  if (!ownsInference(user, inferenceId)) return notFound();
  const ledger = buildLedger(user);
  if (!ledger.items.some((i) => i.id === inferenceId)) return notFound();
  getState(user).decisions.set(inferenceId, { decision: decision as Decision, note: note?.trim() || undefined, at: Date.now() });
  return NextResponse.json(buildLedger(user));
}
