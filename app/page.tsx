"use client";

import { useEffect, useMemo, useState } from "react";
import AccountMenu from "@/components/account-menu";

const demoVideos = [
  { id: 1, title: "Beautiful nature in 4K", creator: "Nature Studio", category: "Nature", duration: "04:32", views: "12K views", src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", thumb: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&q=80" },
  { id: 2, title: "A peaceful day by the ocean", creator: "Travel Moments", category: "Travel", duration: "02:18", views: "8.4K views", src: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80" },
  { id: 3, title: "Creative workspace inspiration", creator: "Daily Create", category: "Lifestyle", duration: "03:06", views: "5.1K views", src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", thumb: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80" },
  { id: 4, title: "Mountain views and fresh air", creator: "Open Road", category: "Nature", duration: "05:41", views: "21K views", src: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80" },
  { id: 5, title: "Simple cooking at home", creator: "Kitchen Notes", category: "Food", duration: "06:12", views: "3.7K views", src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", thumb: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&q=80" },
  { id: 6, title: "City lights after sunset", creator: "Urban Frames", category: "Travel", duration: "01:54", views: "9.2K views", src: "https://www.w3schools.com/html/mov_bbb.mp4", thumb: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800&q=80" }
];

type VideoItem = {
  id: string | number;
  title: string;
  creator: string;
  category: string;
  duration: string;
  views: string;
  src: string;
  thumb: string;
};

type ApprovedVideoRow = {
  id: string;
  title: string;
  category: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  views: number | null;
};

const categories = ["All", "Nature", "Travel", "Lifestyle", "Food", "Other"];

function formatDuration(seconds: number | null) {
  if (seconds == null || !Number.isFinite(seconds)) return "Video";
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function formatViews(views: number | null) {
  return `${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(views ?? 0)} views`;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [feedVideos, setFeedVideos] = useState<VideoItem[]>(demoVideos);
  const [feedNotice, setFeedNotice] = useState("Loading approved videos...");
  const [showUploadNotice, setShowUploadNotice] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadApprovedVideos() {
      try {
        const response = await fetch("/api/videos", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("The approved video feed is temporarily unavailable.");
        }

        const payload: { videos?: ApprovedVideoRow[] } = await response.json();
        const rows = Array.isArray(payload.videos) ? payload.videos : [];
        const liveVideos: VideoItem[] = rows
          .filter((video) => typeof video.video_url === "string" && video.video_url.length > 0)
          .map((video) => ({
            id: video.id,
            title: video.title,
            creator: "XVideo Creator",
            category: video.category || "Other",
            duration: formatDuration(video.duration_seconds),
            views: formatViews(video.views),
            src: video.video_url,
            thumb: video.thumbnail_url || "https://images.unsplash.com/photo-1492684223066-acedb1a3e8f5?w=800&q=80"
          }));

        if (cancelled) return;

        if (liveVideos.length > 0) {
          setFeedVideos(liveVideos);
          setFeedNotice("");
        } else {
          setFeedVideos(demoVideos);
          setFeedNotice("No approved videos yet. Showing demo videos for now.");
        }
      } catch {
        if (!cancelled) {
          setFeedVideos(demoVideos);
          setFeedNotice("Showing demo videos. The Supabase video feed is not available yet.");
        }
      }
    }

    void loadApprovedVideos();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      feedVideos.filter(
        (video) =>
          (category === "All" || video.category === category) &&
          (video.title.toLowerCase().includes(query.toLowerCase()) ||
            video.creator.toLowerCase().includes(query.toLowerCase()))
      ),
    [query, category, feedVideos]
  );

  return (
    <main className="app-shell" id="top">
      <aside className="sidebar">
        <a className="brand" href="#top"><span className="brand-mark">X</span> XVideo</a>
        <nav>
          <a className="nav-item active" href="#top">⌂ <span>Home</span></a>
          <a className="nav-item" href="#videos">▶ <span>Explore</span></a>
          <a className="nav-item" href="#categories">▦ <span>Categories</span></a>
        </nav>
        <div className="sidebar-note"><strong>Your video space</strong><p>Discover useful, creative and inspiring videos.</p></div>
        <div className="sidebar-foot">XVideo MVP · Demo</div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">X</span> XVideo</div>
          <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search videos..." /></label>
          <div className="topbar-actions"><AccountMenu /><button className="upload-button" onClick={() => setShowUploadNotice(true)}>＋ Upload</button></div>
        </header>

        <div className="hero">
          <div>
            <span className="eyebrow">WELCOME TO XVIDEO</span>
            <h1>Find your next<br /><span>favorite video.</span></h1>
            <p>A place for stories, ideas and moments worth sharing.</p>
            <a className="hero-button" href="#videos">Explore videos <span>→</span></a>
          </div>
          <div className="hero-art" aria-hidden="true"><div className="hero-circle">▶</div><span className="art-dot dot-one" /><span className="art-dot dot-two" /></div>
        </div>

        <section id="categories" className="category-row">
          {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={category === item ? "category active-category" : "category"}>{item}</button>)}
        </section>

        <section id="videos" className="video-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">HANDPICKED FOR YOU</span>
              <h2>Explore videos</h2>
              {feedNotice && <p className="feed-notice" role="status">{feedNotice}</p>}
            </div>
            <span className="result-count">{filtered.length} videos</span>
          </div>
          <div className="video-grid">
            {filtered.map((video) => (
              <button className="video-card" key={video.id} onClick={() => setActiveVideo(video)}>
                <div className="thumbnail"><img src={video.thumb} alt="" /><span className="duration">{video.duration}</span><span className="play-overlay">▶</span></div>
                <div className="video-info"><div className="avatar">{video.creator.charAt(0)}</div><div><h3>{video.title}</h3><p>{video.creator}</p><p>{video.views} · {video.category}</p></div></div>
              </button>
            ))}
            {filtered.length === 0 && <p className="empty-state">No videos found. Try another search.</p>}
          </div>
        </section>
        <footer>© 2026 XVideo · Demo videos only · Community guidelines</footer>
      </section>

      {showUploadNotice && (
        <div className="modal-backdrop" onClick={() => setShowUploadNotice(false)}>
          <section className="notice-modal" role="dialog" aria-modal="true" aria-labelledby="upload-notice-title" onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => setShowUploadNotice(false)} aria-label="Close upload notice">×</button>
            <span className="eyebrow">UPLOADS COMING LATER</span>
            <h2 id="upload-notice-title">Video uploads are not available yet</h2>
            <p>We are preparing secure video storage, review, and reporting tools before accepting uploads. You can watch the demo videos while this is being completed.</p>
            <button className="upload-button" type="button" onClick={() => setShowUploadNotice(false)}>Got it</button>
          </section>
        </div>
      )}

      {activeVideo && (
        <div className="modal-backdrop" onClick={() => setActiveVideo(null)}>
          <div className="video-modal" onClick={(event) => event.stopPropagation()}>
            <button className="close-button" onClick={() => setActiveVideo(null)} aria-label="Close video">×</button>
            <video controls autoPlay src={activeVideo.src} />
            <h2>{activeVideo.title}</h2>
            <p>{activeVideo.creator} · {activeVideo.views}</p>
          </div>
        </div>
      )}
    </main>
  );
}
