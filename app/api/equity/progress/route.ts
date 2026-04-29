import { NextResponse } from "next/server";
import { getEquityProgress } from "@/lib/db/equity";

export async function GET() {
  return NextResponse.json(await getEquityProgress());
}
