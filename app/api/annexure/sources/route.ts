import { NextResponse } from "next/server";
import { getMeta, getSources } from "@/lib/repositories";

export async function GET() {
  return NextResponse.json({ meta: await getMeta(), sources: await getSources() });
}
