import { NextResponse } from "next/server";
import { getApprovedVideos } from "@/lib/supabase/videos";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const videos = await getApprovedVideos();
    return NextResponse.json({ videos });
  } catch (error) {
    // Keep configuration details and database errors out of public responses.
    console.error("Approved video feed failed:", error);
    return NextResponse.json(
      { error: "The video feed is temporarily unavailable." },
      { status: 503 }
    );
  }
}
