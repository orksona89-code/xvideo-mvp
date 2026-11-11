import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { checkR2BucketAccess, getR2Configuration } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

/**
 * Authenticated, read-only diagnostic for the private Cloudflare R2 bucket.
 * This endpoint does not create upload URLs or enable uploads.
 */
export async function GET() {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return json({ error: "Sign in to check storage status." }, 401);
  }

  const r2 = getR2Configuration();
  if (!r2.configured) {
    return json({
      provider: "cloudflare-r2",
      configured: false,
      connected: false,
      uploadsEnabled: false,
      missingVariables: r2.missingVariables
    });
  }

  try {
    await checkR2BucketAccess(r2.config);
    return json({
      provider: "cloudflare-r2",
      configured: true,
      connected: true,
      bucketName: r2.config.bucketName,
      bucketAccess: "verified",
      uploadsEnabled: false
    });
  } catch (error) {
    const statusCode =
      typeof error === "object" &&
      error !== null &&
      "$metadata" in error &&
      typeof error.$metadata === "object" &&
      error.$metadata !== null &&
      "httpStatusCode" in error.$metadata
        ? error.$metadata.httpStatusCode
        : undefined;

    // Log only the HTTP status. SDK errors can contain request details.
    console.error("Cloudflare R2 connectivity check failed", { statusCode });

    return json({
      provider: "cloudflare-r2",
      configured: true,
      connected: false,
      uploadsEnabled: false,
      error: "R2 access could not be verified. Check the bucket name and token permissions.",
      statusCode: typeof statusCode === "number" ? statusCode : null
    }, 503);
  }
}
