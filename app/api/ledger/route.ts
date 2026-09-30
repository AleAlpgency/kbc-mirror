import { NextResponse } from "next/server";
import { buildLedger } from "@/lib/ledger";
import { unauthorized } from "@/lib/http";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return NextResponse.json(buildLedger(user));
}
