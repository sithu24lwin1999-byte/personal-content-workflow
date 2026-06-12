"use client";

import { Suspense } from "react";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") || "");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError || !data.user) {
      setLoading(false);
      setError(signInError?.message || "Login failed.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(profileError?.message || "Profile not found.");
      return;
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This account is inactive.");
      return;
    }

    const nextPath = searchParams.get("next");
    const redirectTo =
      nextPath && nextPath.startsWith("/")
        ? nextPath
        : profile.role === "owner"
          ? "/owner"
          : "/dashboard";

    router.refresh();
    router.replace(redirectTo);
    setLoading(false);
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-100 px-4 py-10">
      <form
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={submit}
      >
        <div className="mb-7">
          <div className="mb-3 grid h-11 w-11 place-items-center rounded-lg bg-slate-950 text-white">
            <LogIn size={20} />
          </div>
          <h1 className="text-3xl font-black text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Access the owner or user dashboard.
          </p>
        </div>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Email
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-100"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="mt-4 grid gap-2 text-sm font-bold text-slate-700">
          Password
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-100"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
            {error === "inactive"
              ? "This account is inactive."
              : error === "missing_supabase_env"
                ? "Supabase environment variables are not configured yet."
                : error}
          </div>
        ) : null}

        <button
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white hover:bg-teal-800 disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          <LogIn size={17} />
          {loading ? "Signing in" : "Sign in"}
        </button>

        <Link
          className="mt-4 block text-center text-sm font-bold text-slate-600 hover:text-slate-950"
          href="/reset-password"
        >
          Reset password
        </Link>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-dvh place-items-center bg-slate-100 px-4 py-10">
          <div className="rounded-lg bg-white p-6 text-sm font-bold text-slate-600">
            Loading sign in...
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
