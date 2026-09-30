import { NextResponse } from "next/server";
import { rateLimited, tooMany, unauthorized } from "@/lib/http";
import { runScale } from "@/lib/scale";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

// Aggregate only. Returns counts over a synthetic population, never another customer's data.
export async function GET(req: Request) {
  if (rateLimited(req)) return tooMany();
  if (!(await currentUser())) return unauthorized();
  return NextResponse.json(runScale(2000));
}
