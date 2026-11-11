"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);

  async function signInWithProvider(provider: "google" | "apple" | "facebook") {
    setOauthBusy(provider);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to sign in with ${provider}. Please try again.`);
      setOauthBusy(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() } }
        });
        if (error) throw error;
        if (!data.session) {
          setMessage("Account created. Check your email to confirm your address, then sign in.");
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand auth-brand" href="/"><span className="brand-mark">X</span> XVideo</Link>
        <span className="eyebrow">YOUR VIDEO COMMUNITY</span>
        <h1>{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="auth-description">Sign in to your XVideo account to join the community.</p>
        <div className="auth-tabs">
          <button type="button" className={mode === "signin" ? "auth-tab selected" : "auth-tab"} onClick={() => { setMode("signin"); setMessage(""); }}>Sign in</button>
          <button type="button" className={mode === "signup" ? "auth-tab selected" : "auth-tab"} onClick={() => { setMode("signup"); setMessage(""); }}>Create account</button>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && <label>Name<input value={name} onChange={event => setName(event.target.value)} required maxLength={60} autoComplete="name" placeholder="Your name" /></label>}
          <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" placeholder="you@example.com" /></label>
          <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="At least 8 characters" /></label>
          <button className="upload-button auth-submit" type="submit" disabled={busy}>{busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        <div className="auth-divider"><span>or continue with</span></div>
        <div className="social-auth" aria-label="Continue with a social account">
          <button type="button" className="social-auth-button" onClick={() => signInWithProvider("google")} disabled={busy || oauthBusy !== null}>
            <span className="social-symbol google-symbol" aria-hidden="true">G</span>
            {oauthBusy === "google" ? "Connecting..." : "Continue with Google"}
          </button>
          <button type="button" className="social-auth-button" onClick={() => signInWithProvider("apple")} disabled={busy || oauthBusy !== null}>
            <span className="social-symbol apple-symbol" aria-hidden="true">●</span>
            {oauthBusy === "apple" ? "Connecting..." : "Continue with Apple"}
          </button>
          <button type="button" className="social-auth-button" onClick={() => signInWithProvider("facebook")} disabled={busy || oauthBusy !== null}>
            <span className="social-symbol facebook-symbol" aria-hidden="true">f</span>
            {oauthBusy === "facebook" ? "Connecting..." : "Continue with Facebook"}
          </button>
        </div>
        <div className="auth-divider"><span>or continue with email</span></div>
        {message && <p className="auth-message" role="status">{message}</p>}
        <Link className="auth-back" href="/">← Back to videos</Link>
      </section>
    </main>
  );
}
