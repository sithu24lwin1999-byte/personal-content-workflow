"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Could not update password.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
          <h1 className="text-3xl font-black text-slate-950">New password</h1>
        </div>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Password
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-100"
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
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
          {loading ? "Saving" : "Update password"}
        </button>
      </form>
    </main>
  );
}
