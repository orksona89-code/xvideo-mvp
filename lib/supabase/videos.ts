import { createClient } from "@/lib/supabase/server";
import { createR2ReadUrl, getR2Configuration } from "@/lib/storage/r2";

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
  storage_key: string | null;
};

/**
 * Returns only moderator-approved videos. R2 objects remain private and are
 * delivered using short-lived signed GET URLs only after the DB status is approved.
 */
export async function getApprovedVideos() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("videos")
    .select(
      "id, title, description, category, video_url, thumbnail_url, duration_seconds, views, created_at, user_id, storage_key"
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    throw new Error(`Unable to load approved videos: ${error.message}`);
  }

  const rows = data ?? [];
  const r2 = getR2Configuration();

  return Promise.all(rows.map(async (video) => {
    if (!video.storage_key) return video as ApprovedVideo;
    if (!r2.configured) {
      throw new Error("R2 is not configured for approved private videos.");
    }

    const signedVideoUrl = await createR2ReadUrl(r2.config, video.storage_key, 3600);
    return { ...video, video_url: signedVideoUrl } as ApprovedVideo;
  }));
}
