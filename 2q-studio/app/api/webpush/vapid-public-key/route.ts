import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    const allKeys = Object.keys(process.env).filter(k => k.includes("VAPID") || k.includes("PUSH"));
    return NextResponse.json(
      { 
        error: "VAPID Public Key is not configured on the server.", 
        foundSimilarKeys: allKeys 
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { publicKey },
    { headers: { "Cache-Control": "no-store" } },
  );
}
