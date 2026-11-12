import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteR2Object,
  getR2Configuration,
  inspectR2Object
} from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

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
    return json({ error: "Please sign in before completing an upload." }, 401);
  }

  if (
    process.env.R2_DEMO_UPLOADS_ENABLED !== "true" ||
    process.env.R2_UPLOADS_MODE !== "demo"
  ) {
    return json({ error: "Demo uploads are not enabled on this deployment." }, 503);
  }

  const r2 = getR2Configuration();
  if (!r2.configured) {
    return json({ error: "Video storage is not configured yet." }, 503);
  }

  let body: { uploadId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid upload completion request." }, 400);
  }

  const uploadId = typeof body.uploadId === "string" ? body.uploadId : "";
  if (!/^[0-9a-f-]{36}$/i.test(uploadId)) {
    return json({ error: "Invalid upload session." }, 400);
  }

  const { data: session, error: sessionError } = await supabase
    .from("video_upload_sessions")
    .select("id, user_id, storage_key, title, description, category, mime_type, expected_size_bytes, expires_at, completed_at")
    .eq("id", uploadId)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (sessionError || !session) {
    return json({ error: "Upload session was not found." }, 404);
  }

  // Make retries safe: a completed request returns the already-created video.
  if (session.completed_at) {
    const { data: existingVideo } = await supabase
      .from("videos")
      .select("id, status")
      .eq("storage_key", session.storage_key)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (existingVideo) {
      return json({
        success: true,
        videoId: existingVideo.id,
        status: existingVideo.status,
        message: "This video has already been submitted for review."
      });
    }

    return json({
      error: "This upload session is already closed. Please start a new upload."
    }, 409);
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    return json({ error: "Upload session expired. Please start again." }, 410);
  }
  if (!session.storage_key.startsWith(`quarantine/${auth.user.id}/`)) {
    return json({ error: "Upload session is not valid for this account." }, 403);
  }

  let object: { contentLength: number; contentType: string | undefined };
  try {
    object = await inspectR2Object(r2.config, session.storage_key);
  } catch {
    return json({ error: "The uploaded file was not found in private storage." }, 400);
  }

  if (
    object.contentLength !== Number(session.expected_size_bytes) ||
    object.contentLength < 1 ||
    object.contentLength > MAX_VIDEO_BYTES ||
    object.contentType !== session.mime_type
  ) {
    try {
      await deleteR2Object(r2.config, session.storage_key);
    } catch (deleteError) {
      console.error("Invalid uploaded object cleanup failed:", deleteError);
    }
    await supabase
      .from("video_upload_sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", uploadId)
      .eq("user_id", auth.user.id);
    return json({ error: "The uploaded file did not match the declared type or size." }, 400);
  }

  const { data: video, error: videoError } = await supabase
    .from("videos")
    .insert({
      title: session.title,
      description: session.description,
      category: session.category,
      video_url: "",
      storage_key: session.storage_key,
      mime_type: session.mime_type,
      object_size_bytes: object.contentLength,
      duration_seconds: null,
      thumbnail_url: null,
      views: 0,
      status: "pending",
      user_id: auth.user.id,
      demo_content_confirmed: true,
      rights_confirmed: true,
      participants_adult_and_consented: true
    })
    .select("id")
    .single();

  if (videoError || !video) {
    // A concurrent retry may have inserted the same storage key first.
    // Reuse that row instead of creating a duplicate or deleting its object.
    const { data: existingVideo, error: lookupError } = await supabase
      .from("videos")
      .select("id, status")
      .eq("storage_key", session.storage_key)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (lookupError || !existingVideo) {
      // Keep the private quarantine object: an ambiguous database failure must
      // never delete an object that a concurrent request may already reference.
      console.error("Pending video row creation failed:", videoError?.message);
      return json({ error: "The upload could not be submitted for review." }, 500);
    }

    const { error: finalizeError } = await supabase
      .from("video_upload_sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", uploadId)
      .eq("user_id", auth.user.id);

    if (finalizeError) {
      console.error("Upload session finalization failed:", finalizeError.message);
    }

    return json({
      success: true,
      videoId: existingVideo.id,
      status: existingVideo.status,
      message: "This video has already been submitted for review."
    }, 201);
  }

  const { error: updateError } = await supabase
    .from("video_upload_sessions")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", uploadId)
    .eq("user_id", auth.user.id);

  if (updateError) {
    // The pending video remains safe and private. A stale session can be cleaned up later.
    console.error("Upload session finalization failed:", updateError.message);
  }

  return json({
    success: true,
    videoId: video.id,
    status: "pending",
    message: "Your demo video was uploaded privately and is waiting for manual review."
  }, 201);
}
