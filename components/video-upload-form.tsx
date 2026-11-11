"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_BYTES = 100 * 1024 * 1024;

type UserState = "loading" | "signed-in" | "signed-out";

export default function VideoUploadForm() {
  const [userState, setUserState] = useState<UserState>("loading");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [file, setFile] = useState<File | null>(null);
  const [demoConfirmed, setDemoConfirmed] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setEmail(data.user?.email ?? "");
      setUserState(data.user ? "signed-in" : "signed-out");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setEmail(session?.user.email ?? "");
      setUserState(session?.user ? "signed-in" : "signed-out");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (!file) {
      setMessage("Choose an MP4 or WebM demo video first.");
      setIsError(true);
      return;
    }
    if (file.size < 1 || file.size > MAX_FILE_BYTES) {
      setMessage("The file must be no larger than 100 MB.");
      setIsError(true);
      return;
    }
    if (!demoConfirmed || !rightsConfirmed || !consentConfirmed) {
      setMessage("Please confirm all three declarations before uploading.");
      setIsError(true);
      return;
    }

    setBusy(true);
    try {
      setMessage("Checking your account and preparing secure storage...");
      const signResponse = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          demoContentConfirmed: demoConfirmed,
          rightsConfirmed,
          participantsAdultAndConsented: consentConfirmed
        })
      });

      const signed = await signResponse.json();
      if (!signResponse.ok || !signed.uploadUrl || !signed.uploadId) {
        throw new Error(signed.error || "Could not prepare the video upload.");
      }

      setMessage("Uploading privately to storage...");
      const putResponse = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: signed.headers,
        body: file
      });
      if (!putResponse.ok) {
        throw new Error(
          "The private storage upload failed. Check the R2 bucket CORS settings and try again."
        );
      }

      setMessage("Verifying the uploaded file...");
      const completeResponse = await fetch("/api/uploads/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: signed.uploadId })
      });
      const completed = await completeResponse.json();
      if (!completeResponse.ok || !completed.success) {
        throw new Error(completed.error || "The video could not be submitted for review.");
      }

      setMessage(completed.message || "Video uploaded privately and sent for review.");
      setTitle("");
      setDescription("");
      setCategory("Other");
      setFile(null);
      setDemoConfirmed(false);
      setRightsConfirmed(false);
      setConsentConfirmed(false);

      const fileInput = document.getElementById("demo-video-file") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card upload-card">
        <Link className="brand auth-brand" href="/">
          <span className="brand-mark">X</span> XVideo
        </Link>
        <span className="eyebrow">PRIVATE VIDEO SUBMISSION</span>
        <h1>Upload a demo video</h1>
        <p className="auth-description">
          Uploads are stored privately and remain pending until a moderator reviews them.
        </p>

        <div className="upload-safety-note">
          Adult uploads are not enabled. This test version accepts non-explicit demo videos only.
          Do not upload sexual content, content involving anyone under 18, non-consensual content,
          or material you do not have rights to distribute.
        </div>

        {userState === "loading" && <p className="auth-description">Checking your account...</p>}

        {userState === "signed-out" && (
          <div className="upload-signin">
            <p>Please sign in or create an account before uploading.</p>
            <Link className="upload-button" href="/auth?next=%2Fupload">Sign in / Create account</Link>
          </div>
        )}

        {userState === "signed-in" && (
          <>
            <p className="upload-account">Signed in as {email}</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label>
                Video title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={100}
                  required
                  disabled={busy}
                  placeholder="Give your demo video a title"
                />
              </label>
              <label>
                Description (optional)
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  disabled={busy}
                  placeholder="Describe your video"
                />
              </label>
              <label>
                Category
                <select value={category} onChange={(event) => setCategory(event.target.value)} disabled={busy}>
                  <option>Nature</option>
                  <option>Travel</option>
                  <option>Lifestyle</option>
                  <option>Food</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Video file (MP4 or WebM, maximum 100 MB)
                <input
                  id="demo-video-file"
                  type="file"
                  accept="video/mp4,video/webm,.mp4,.webm"
                  required
                  disabled={busy}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>

              <div className="upload-declarations">
                <label className="upload-check">
                  <input
                    type="checkbox"
                    checked={demoConfirmed}
                    onChange={(event) => setDemoConfirmed(event.target.checked)}
                    disabled={busy}
                  />
                  <span>I confirm this is a non-explicit demo video, not adult or sexual content.</span>
                </label>
                <label className="upload-check">
                  <input
                    type="checkbox"
                    checked={rightsConfirmed}
                    onChange={(event) => setRightsConfirmed(event.target.checked)}
                    disabled={busy}
                  />
                  <span>I own this video or have the required rights and permission to upload it.</span>
                </label>
                <label className="upload-check">
                  <input
                    type="checkbox"
                    checked={consentConfirmed}
                    onChange={(event) => setConsentConfirmed(event.target.checked)}
                    disabled={busy}
                  />
                  <span>Everyone shown is an adult and has agreed to the recording and upload.</span>
                </label>
              </div>

              <button className="upload-button auth-submit" type="submit" disabled={busy}>
                {busy ? "Please wait..." : "Upload privately for review"}
              </button>
            </form>
          </>
        )}

        {message && (
          <p className={isError ? "auth-message" : "upload-success"} role="status">
            {message}
          </p>
        )}
        <Link className="auth-back" href="/">← Back to XVideo</Link>
      </section>
    </main>
  );
}
