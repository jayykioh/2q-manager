import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/vapid-config.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const publicKey = getVapidPublicKey();
    return NextResponse.json(
      { publicKey },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Invalid VAPID public key configuration", error);
    return NextResponse.json(
      { error: "VAPID public key is unavailable." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
