import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { s3Client } from "@/lib/s3-client";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_CONTENT_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_FOLDERS = new Set(["products"]);
const MAX_FILENAME_LENGTH = 120;

// NOTE: This is a simple in-memory rate limiter for MVP purposes.
// On Vercel Serverless, each cold start creates a new process instance,
// meaning this Map resets between invocations. It still limits within a
// single warm container, but is NOT a reliable distributed rate limiter.
// For production-grade rate limiting, replace with Upstash Redis (@upstash/ratelimit).
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

    // Check Rate Limit (User ID based)
    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { filename, contentType, folder = "products" } = body;

    if (typeof filename !== "string" || typeof contentType !== "string") {
      return NextResponse.json({ error: "Missing filename or contentType" }, { status: 400 });
    }

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    if (typeof folder !== "string" || !ALLOWED_FOLDERS.has(folder)) {
      return NextResponse.json({ error: "Unsupported upload folder" }, { status: 400 });
    }

    // Sanitize filename and create safe key
    const sanitizedFilename = filename
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/^\.+/, "")
      .slice(0, MAX_FILENAME_LENGTH);

    if (!sanitizedFilename) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const uniqueFilename = `${Date.now()}-${randomUUID()}-${sanitizedFilename}`;
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
  } catch (error: unknown) {
    console.error("Presign error:", error);
    return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 });
  }
}
