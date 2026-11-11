import { createClient } from "@/lib/supabase/server";

export type ApprovedVideo = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  views: number;
  created_at: string;
  user_id: string | null;
};

/**
 * Returns only moderator-approved videos. The database RLS policy remains
 * the security boundary; this status filter is an additional application guard.
 */
export async function getApprovedVideos() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("videos")
    .select(
      "id, title, description, category, video_url, thumbnail_url, duration_seconds, views, created_at, user_id"
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load approved videos: ${error.message}`);
  }

  return (data ?? []) as ApprovedVideo[];
}
