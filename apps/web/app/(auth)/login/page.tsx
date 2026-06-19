"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    const params = new URLSearchParams(window.location.search);
    router.push(params.get("next") || "/overview");
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="panel p-8 w-full max-w-md">
        <h1 className="text-2xl font-medium">Sign in to Helio</h1>
        <p className="text-helio-mute text-sm mt-1">Welcome back.</p>

        <label className="block mt-6 text-xs uppercase text-helio-mute">Email</label>
        <input
          value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
          className="mt-1 w-full rounded-lg bg-helio-surface border border-helio-edge px-3 py-2"
        />

        <label className="block mt-4 text-xs uppercase text-helio-mute">Password</label>
        <input
          value={password} onChange={(e) => setPassword(e.target.value)} type="password" required
          className="mt-1 w-full rounded-lg bg-helio-surface border border-helio-edge px-3 py-2"
        />

        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

        <button disabled={loading} className="btn-primary mt-6 w-full">
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <div className="mt-4 text-sm text-helio-mute">
          New here? <Link href="/register" className="text-helio">Create account</Link>
        </div>
      </form>
    </div>
  );
}
