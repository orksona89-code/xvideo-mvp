"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type CommentRow = { id: string; body: string; created_at: string; user_id: string };

export default function VideoCommunity({ videoId, isDemo }: { videoId: string | number; isDemo?: boolean }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [draft, setDraft] = useState("");
  const [reason, setReason] = useState("Inappropriate content");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isDemo) return;
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const [{ data: auth }, { count }, { data: rows }] = await Promise.all([
          supabase.auth.getUser(),
          supabase.from("video_likes").select("*", { count: "exact", head: true }).eq("video_id", String(videoId)),
          supabase.from("video_comments").select("id, body, created_at, user_id").eq("video_id", String(videoId)).order("created_at", { ascending: false }).limit(50)
        ]);
        if (!active) return;
        const id = auth.user?.id ?? null;
        setUserId(id);
        setLikes(count ?? 0);
        setComments((rows ?? []) as CommentRow[]);
        if (id) {
          const { data } = await supabase.from("video_likes").select("video_id").eq("video_id", String(videoId)).eq("user_id", id).maybeSingle();
          if (active) setLiked(Boolean(data));
        }
      } catch { if (active) setMessage("Unable to load community activity."); }
    }
    void load();
    return () => { active = false; };
  }, [videoId, isDemo]);

  async function toggleLike() {
    if (!userId) { setMessage("Please sign in to like this video."); return; }
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      if (liked) {
        const { error } = await supabase.from("video_likes").delete().eq("video_id", String(videoId)).eq("user_id", userId);
        if (error) throw error;
        setLiked(false); setLikes(n => Math.max(0, n - 1));
      } else {
        const { error } = await supabase.from("video_likes").insert({ video_id: String(videoId), user_id: userId });
        if (error) throw error;
        setLiked(true); setLikes(n => n + 1);
      }
    } catch { setMessage("Could not update like. Please try again."); }
    finally { setBusy(false); }
  }

  async function postComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) { setMessage("Please sign in to comment."); return; }
    const body = draft.trim();
    if (!body || body.length > 1000) return;
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("video_comments").insert({ video_id: String(videoId), user_id: userId, body }).select("id, body, created_at, user_id").single();
      if (error) throw error;
      setComments(rows => [data as CommentRow, ...rows]); setDraft("");
    } catch { setMessage("Could not post comment. Please try again."); }
    finally { setBusy(false); }
  }

  async function reportVideo() {
    if (!userId) { setMessage("Please sign in to report this video."); return; }
    setBusy(true); setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("video_reports").insert({ video_id: String(videoId), reporter_id: userId, reason });
      if (error) throw error;
      setMessage("Thank you. Your report was submitted for review.");
    } catch { setMessage("Could not submit report. Please try again."); }
    finally { setBusy(false); }
  }

  if (isDemo) return <p className="share-message">Sign in and view a published video to use likes, comments and reports.</p>;

  return <section className="video-community">
    <div className="community-actions">
      <button type="button" className={liked ? "secondary-action liked" : "secondary-action"} onClick={toggleLike} disabled={busy}>{liked ? "♥ Liked" : "♡ Like"} · {likes}</button>
      <select aria-label="Report reason" value={reason} onChange={e => setReason(e.target.value)}><option>Inappropriate content</option><option>Spam or misleading</option><option>Harassment or abuse</option><option>Copyright concern</option><option>Other</option></select>
      <button type="button" className="secondary-action" onClick={reportVideo} disabled={busy}>Report</button>
    </div>
    {!userId && <p className="share-message">Sign in to like, comment or report this video.</p>}
    <h3>Comments ({comments.length})</h3>
    <form className="comment-form" onSubmit={postComment}>
      <input aria-label="Write a comment" placeholder="Write a comment..." value={draft} onChange={e => setDraft(e.target.value)} maxLength={1000} disabled={!userId || busy}/>
      <button className="upload-button" type="submit" disabled={!userId || busy || !draft.trim()}>Post</button>
    </form>
    <div className="comment-list">{comments.map(comment => <article className="comment-item" key={comment.id}><p>{comment.body}</p><time>{new Date(comment.created_at).toLocaleString()}</time></article>)}{comments.length === 0 && <p className="share-message">No comments yet.</p>}</div>
    {message && <p className="share-message" role="status">{message}</p>}
  </section>;
};
