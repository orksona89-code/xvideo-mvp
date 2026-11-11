import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createR2UploadUrl, getR2Configuration } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_UPLOADS_PER_DAY = 5;
const ALLOWED_TYPES = {
  "video/mp4": "mp4",
  "video/webm": "webm"
} as const;
const ALLOWED_CATEGORIES = ["Nature", "Travel", "Lifestyle", "Food", "Other"];

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError || !auth.user) {
    return json({ error: "Please sign in before uploading a video." }, 401);
  }

  // This first upload release is deliberately limited to non-explicit demo media.
  // Do not enable it for adult content or on a provider whose terms prohibit that use.
  if (
    process.env.R2_DEMO_UPLOADS_ENABLED !== "true" ||
    process.env.R2_UPLOADS_MODE !== "demo"
  ) {
    return json({
      error: "Demo uploads are not enabled on this deployment.",
      uploadsEnabled: false
    }, 503);
  }

  const r2 = getR2Configuration();
  if (!r2.configured) {
    return json({
      error: "Video storage is not configured yet.",
      missingVariables: r2.missingVariables
    }, 503);
  }

  const allowedOrigins = (process.env.R2_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const origin = request.headers.get("origin");
  if (allowedOrigins.length > 0 && (!origin || !allowedOrigins.includes(origin))) {
    return json({ error: "This website origin is not allowed to upload." }, 403);
  }

  let body: {
    title?: unknown;
    description?: unknown;
    category?: unknown;
    fileName?: unknown;
    fileSize?: unknown;
    contentType?: unknown;
    demoContentConfirmed?: unknown;
    rightsConfirmed?: unknown;
    participantsAdultAndConsented?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Please send valid upload details." }, 400);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const category =
    typeof body.category === "string" && ALLOWED_CATEGORIES.includes(body.category)
      ? body.category
      : "Other";
  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const contentType =
    typeof body.contentType === "string" ? body.contentType : "";
  const fileSize = Number(body.fileSize);

  if (!title || title.length > 100) {
    return json({ error: "The video title must be between 1 and 100 characters." }, 400);
  }
  if (description.length > 2000) {
    return json({ error: "The description must be 2,000 characters or fewer." }, 400);
  }
  if (!Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > MAX_VIDEO_BYTES) {
    return json({ error: "Choose a video file no larger than 100 MB." }, 400);
  }
  if (!(contentType in ALLOWED_TYPES)) {
    return json({ error: "Only MP4 and WebM demo videos are supported." }, 400);
  }

  const extension = fileName.toLowerCase().split(".").pop();
  const expectedExtension = ALLOWED_TYPES[contentType as keyof typeof ALLOWED_TYPES];
  if (extension !== expectedExtension) {
    return json({ error: "The file extension must match the selected video type." }, 400);
  }

  if (
    body.demoContentConfirmed !== true ||
    body.rightsConfirmed !== true ||
    body.participantsAdultAndConsented !== true
  ) {
    return json({
      error: "Please confirm the demo-content, ownership, adult-participant and consent declarations."
    }, 400);
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("video_upload_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .gte("created_at", since);

  if (countError) {
    console.error("Upload rate-limit lookup failed:", countError.message);
    return json({ error: "Unable to prepare an upload right now." }, 503);
  }
  if ((count ?? 0) >= MAX_UPLOADS_PER_DAY) {
    return json({ error: "The daily demo upload limit is five videos per account." }, 429);
  }

  const uploadId = crypto.randomUUID();
  const key = `quarantine/${auth.user.id}/${uploadId}.${expectedExtension}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error: sessionError } = await supabase.from("video_upload_sessions").insert({
    id: uploadId,
    user_id: auth.user.id,
    storage_key: key,
    title,
    description: description || null,
    category,
    mime_type: contentType,
    expected_size_bytes: fileSize,
    expires_at: expiresAt
  });

  if (sessionError) {
    console.error("Upload session creation failed:", sessionError.message);
    return json({ error: "Unable to prepare an upload right now." }, 503);
  }

  try {
    const uploadUrl = await createR2UploadUrl(r2.config, key, contentType);
    return json({
      uploadId,
      uploadUrl,
      method: "PUT",
      headers: { "Content-Type": contentType },
      expiresInSeconds: 300,
      maxBytes: MAX_VIDEO_BYTES
    });
  } catch (error) {
    console.error("R2 upload URL generation failed:", error);
    await supabase
      .from("video_upload_sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", uploadId)
      .eq("user_id", auth.user.id);
    return json({ error: "Could not prepare a secure storage upload." }, 503);
  }
}
