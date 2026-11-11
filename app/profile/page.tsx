"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) { router.replace("/auth"); return; }
        const { data, error } = await supabase.from("profiles").select("username, display_name, avatar_url").eq("id", user.id).maybeSingle();
        if (error) throw error;
        if (!active) return;
        setEmail(user.email ?? "");
        setDisplayName(data?.display_name ?? String(user.user_metadata?.display_name ?? ""));
        setUsername(data?.username ?? "");
        setAvatarUrl(data?.avatar_url ?? "");
      } catch {
        if (active) setMessage("Could not load your profile. Please refresh and try again.");
      } finally {
        if (active) setBusy(false);
      }
    }
    void loadProfile();
    return () => { active = false; };
  }, [router]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = displayName.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanAvatar = avatarUrl.trim();
    if (cleanName.length < 2 || cleanName.length > 60) { setMessage("Display name must be 2–60 characters."); return; }
    if (cleanUsername && !/^[a-z0-9_]{3,24}$/.test(cleanUsername)) { setMessage("Username must be 3–24 characters using letters, numbers or underscores."); return; }
    if (cleanAvatar && !/^https:\/\//i.test(cleanAvatar)) { setMessage("Avatar URL must start with https://."); return; }
    setSaving(true); setMessage("");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth"); return; }
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        display_name: cleanName,
        username: cleanUsername || null,
        avatar_url: cleanAvatar || null
      }, { onConflict: "id" });
      if (error) throw error;
      await supabase.auth.updateUser({ data: { display_name: cleanName } });
      setMessage("Profile saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your profile. Please try again.");
    } finally { setSaving(false); }
  }

  return <main className="auth-page">
    <section className="auth-card profile-card">
      <Link className="brand auth-brand" href="/"><span className="brand-mark">X</span> XVideo</Link>
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h1>Edit profile</h1>
      <p className="auth-description">Manage the public details shown with your XVideo account.</p>
      {busy ? <p>Loading profile...</p> : <form className="auth-form" onSubmit={saveProfile}>
        <label>Email<input type="email" value={email} readOnly disabled /></label>
        <label>Display name<input value={displayName} onChange={e => setDisplayName(e.target.value)} required minLength={2} maxLength={60} placeholder="Your display name"/></label>
        <label>Username<input value={username} onChange={e => setUsername(e.target.value)} maxLength={24} placeholder="your_username"/></label>
        <label>Avatar image URL<input type="url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.jpg"/></label>
        <button className="upload-button auth-submit" type="submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
      </form>}
      {message && <p className="auth-message" role="status">{message}</p>}
      <Link className="auth-back" href="/">← Back to videos</Link>
    </section>
  </main>;
}
