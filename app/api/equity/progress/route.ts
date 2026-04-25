import { NextResponse } from "next/server";
import { GLOBAL_EQUITY_CAP, getTotalSoldEquity } from "@/lib/db/equity";

export async function GET() {
  const soldEquity = await getTotalSoldEquity();

  return NextResponse.json({
    soldEquity,
    cap: GLOBAL_EQUITY_CAP,
    remainingEquity: Math.max(0, GLOBAL_EQUITY_CAP - soldEquity),
  });
}
