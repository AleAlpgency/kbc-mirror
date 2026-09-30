import { NextResponse } from "next/server";
import { buildLedger } from "@/lib/ledger";
import { badOrigin, badRequest, rateLimited, readJson, tooMany, unauthorized } from "@/lib/http";
import { currentUser } from "@/lib/session";
import { getState, type Budget } from "@/lib/store";

const WINDOWS: Budget["window"][] = ["mornings", "evenings", "weekends"];

export async function POST(req: Request) {
  if (rateLimited(req)) return tooMany();
  const user = await currentUser();
  if (!user) return unauthorized();
  if (badOrigin(req)) return badRequest();
  const body = await readJson(req);
  if (!body) return badRequest();
  const { perWeek, window } = body;
  if (!Number.isInteger(perWeek) || (perWeek as number) < 0 || (perWeek as number) > 7) return badRequest();
  if (typeof window !== "string" || !WINDOWS.includes(window as Budget["window"])) return badRequest();
  getState(user).budget = { perWeek: perWeek as number, window: window as Budget["window"] };
  return NextResponse.json(buildLedger(user));
}
