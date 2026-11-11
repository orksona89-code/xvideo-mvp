"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AccountMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof createClient> | null = null;

    try {
      supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (active) {
          setEmail(data.user?.email ?? null);
          setReady(true);
        }
      }).catch(() => {
        if (active) setReady(true);
      });

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (active) {
          setEmail(session?.user?.email ?? null);
          setReady(true);
        }
      });

      return () => {
        active = false;
        listener.subscription.unsubscribe();
      };
    } catch {
      setReady(true);
      return () => { active = false; };
    }
  }, []);

  async function signOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setEmail(null);
      window.location.assign("/");
    } catch {
      setEmail(null);
    }
  }

  if (!ready || !email) return <Link className="account-link" href="/auth">Sign in</Link>;

  return (
    <div className="account-menu">
      <span className="account-email" title={email}>{email}</span>
      <Link className="account-link" href="/profile">Profile</Link>
      <button className="account-signout" type="button" onClick={signOut}>Sign out</button>
    </div>
  );
}
