"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function getSafeNextPath() {
  const requested = new URLSearchParams(window.location.search).get("next");
  return requested && requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/";
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "oauth_callback") {
      setMessage("Social sign-in could not be completed. Check that the provider is enabled and its OAuth credentials and callback URL are configured in Supabase.");
    }
  }, []);

  async function signInWithProvider(provider: "google" | "facebook") {
    setOauthBusy(provider);
    setMessage("");
    try {
      const supabase = createClient();
      const next = getSafeNextPath();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        }
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
      const next = getSafeNextPath();

      if (mode === "signup") {
        if (password !== confirmPassword) {
          throw new Error("The passwords do not match.");
        }
        if (!adultConfirmed) {
          throw new Error("You must confirm that you are 18 or older to create an XVideo account.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            data: {
              display_name: name.trim(),
              declared_adult: true,
              adult_declaration_at: new Date().toISOString()
            }
          }
        });
        if (error) throw error;

        if (!data.session) {
          setMessage("Account created. Check your email and confirm your address. Then return here to sign in.");
        } else {
          router.push(next);
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
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
        <p className="auth-description">
          {mode === "signin"
            ? "Sign in to your XVideo account to continue."
            : "Create an account with your email address. Email confirmation may be required."}
        </p>
        <div className="auth-tabs">
          <button type="button" className={mode === "signin" ? "auth-tab selected" : "auth-tab"} onClick={() => { setMode("signin"); setMessage(""); }}>
            Sign in
          </button>
          <button type="button" className={mode === "signup" ? "auth-tab selected" : "auth-tab"} onClick={() => { setMode("signup"); setMessage(""); }}>
            Create account
          </button>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "signup" && (
            <label>
              Name
              <input value={name} onChange={event => setName(event.target.value)} required maxLength={60} autoComplete="name" placeholder="Your name" disabled={busy} />
            </label>
          )}
          <label>
            Email
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" placeholder="you@example.com" disabled={busy} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="At least 8 characters" disabled={busy} />
          </label>
          {mode === "signup" && (
            <>
              <label>
                Confirm password
                <input type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required minLength={8} autoComplete="new-password" placeholder="Enter your password again" disabled={busy} />
              </label>
              <label className="auth-age-check">
                <input type="checkbox" checked={adultConfirmed} onChange={event => setAdultConfirmed(event.target.checked)} disabled={busy} />
                <span>I confirm that I am 18 years of age or older.</span>
              </label>
              <p className="auth-legal-note">
                This is an age declaration only, not identity verification. Adult features and uploads remain unavailable until the platform's required age and safety checks are in place.
              </p>
            </>
          )}
          <button className="upload-button auth-submit" type="submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        {mode === "signin" && (
          <>
            <div className="auth-divider"><span>or continue with</span></div>
            <div className="social-auth" aria-label="Continue with a social account">
              <button type="button" className="social-auth-button" onClick={() => signInWithProvider("google")} disabled={busy || oauthBusy !== null}>
                <span className="social-symbol google-symbol" aria-hidden="true">G</span>
                {oauthBusy === "google" ? "Connecting..." : "Continue with Google"}
              </button>
              <button type="button" className="social-auth-button" onClick={() => signInWithProvider("facebook")} disabled={busy || oauthBusy !== null}>
                <span className="social-symbol facebook-symbol" aria-hidden="true">f</span>
                {oauthBusy === "facebook" ? "Connecting..." : "Continue with Facebook"}
              </button>
            </div>
          </>
        )}
        {message && <p className="auth-message" role="status">{message}</p>}
        <Link className="auth-back" href="/">← Back to videos</Link>
      </section>
    </main>
  );
}
