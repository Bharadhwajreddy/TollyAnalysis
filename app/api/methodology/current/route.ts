import { NextResponse } from "next/server";
import { LEGACY_SCORE, PLATFORM_BAND_SCORE, TRADE_VERDICT_SCORE } from "@/lib/constants/methodology";
import { getMethodology } from "@/lib/repositories";

export async function GET() {
  return NextResponse.json({
    methodology: await getMethodology(),
    mappings: { tradeVerdict: TRADE_VERDICT_SCORE, platformBand: PLATFORM_BAND_SCORE, legacy: LEGACY_SCORE },
    criticReviewsIncluded: false,
  });
}
