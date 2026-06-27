import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/lib/s3-client";
import { createClient } from "@/lib/supabase/server";

// Simple in-memory rate limiter (MVP)
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxReq = 20;

  const userLimit = rateLimitMap.get(ip);
  if (!userLimit || userLimit.expiresAt < now) {
    rateLimitMap.set(ip, { count: 1, expiresAt: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxReq) {
    return false;
  }

  userLimit.count += 1;
  return true;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check Authentication
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check Rate Limit (IP based or User ID based)
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { filename, contentType, folder = "products" } = body;

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });
    }

    // Sanitize filename and create safe key
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(7)}-${sanitizedFilename}`;
    const objectKey = `${folder}/${uniqueFilename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: objectKey,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return NextResponse.json({
      url: signedUrl,
      key: objectKey,
    });
  } catch (error: any) {
    console.error("Presign error:", error);
    return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 });
  }
}
