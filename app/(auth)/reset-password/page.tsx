"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Could not send reset email.");
      return;
    }

    setMessage("Password reset email sent.");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-100 px-4 py-10">
      <form
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        onSubmit={submit}
      >
        <div className="mb-7">
          <div className="mb-3 grid h-11 w-11 place-items-center rounded-lg bg-slate-950 text-white">
            <KeyRound size={20} />
          </div>
          <h1 className="text-3xl font-black text-slate-950">Reset password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Supabase will email a secure reset link.
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
        {message ? (
          <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm font-semibold text-teal-900">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800">
            {error}
          </div>
        ) : null}
        <button
          className="mt-6 w-full rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white hover:bg-teal-800 disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Sending" : "Send reset email"}
        </button>
        <Link
          className="mt-4 block text-center text-sm font-bold text-slate-600 hover:text-slate-950"
          href="/login"
        >
          Back to login
        </Link>
      </form>
    </main>
  );
}
