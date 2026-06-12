"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bot, ClipboardCheck, Database, Download, History, RefreshCcw } from "lucide-react";
import {
  FEATURE_LABELS,
  type AiOutput,
  type Brand,
  type FeaturePermission,
  type Profile,
  type QcResult
} from "@/lib/types";

type Overview = {
  profile: Profile;
  permissions: FeaturePermission[];
  brands: Brand[];
  history: (AiOutput & { brands?: { brand_name?: string } })[];
};

export function DashboardPanel() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [brandId, setBrandId] = useState("");
  const [brief, setBrief] = useState("");
  const [content, setContent] = useState("");
  const [generated, setGenerated] = useState("");
  const [qc, setQc] = useState<QcResult | null>(null);
  const [aiLoading, setAiLoading] = useState("");

  async function loadOverview() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/dashboard/overview");
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Could not load dashboard.");
      return;
    }

    setOverview(data);
    setBrandId(data.brands?.[0]?.id || "");
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const allowed = useMemo(() => new Set(overview?.permissions || []), [overview]);

  async function callAi(
    event: FormEvent<HTMLFormElement>,
    mode: "generate" | "qc"
  ) {
    event.preventDefault();
    setError("");
    setMessage("");
    setGenerated("");
    setQc(null);
    setAiLoading(mode);

    const input = mode === "generate" ? brief : content;
    const response = await fetch(`/api/ai/${mode === "generate" ? "generate" : "qc"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand_id: brandId, input })
    });
    const data = await response.json();
    setAiLoading("");

    if (!response.ok) {
      setError(data.error || "AI request failed.");
      return;
    }

    if (mode === "generate") {
      setGenerated(data.output);
    } else {
      setQc(data.qc);
    }

    setMessage("Saved to history.");
    await loadOverview();
  }

  function exportOutput() {
    const text = generated || (qc ? JSON.stringify(qc, null, 2) : "");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "content-output.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase text-teal-700">User Panel</p>
          <h1 className="text-4xl font-black text-slate-950">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            Features here are controlled by owner-assigned permissions.
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          onClick={loadOverview}
          type="button"
        >
          <RefreshCcw size={16} />
          Refresh
        </button>
      </header>

      {message ? <div className="rounded-lg bg-teal-50 p-3 text-sm font-bold text-teal-900">{message}</div> : null}
      {error ? <div className="rounded-lg bg-rose-50 p-3 text-sm font-bold text-rose-800">{error}</div> : null}
      {loading ? <div className="rounded-lg bg-white p-5 text-sm font-bold text-slate-600">Loading dashboard...</div> : null}

      <section className="grid gap-4 md:grid-cols-4">
        {(["content_generate", "qc_check", "brand_database_view", "history_view"] as FeaturePermission[]).map((permission) => (
          <div className={`rounded-lg border p-4 shadow-sm ${allowed.has(permission) ? "border-teal-200 bg-white" : "border-slate-200 bg-slate-100 text-slate-400"}`} key={permission}>
            <div className="text-sm font-bold">{FEATURE_LABELS[permission]}</div>
            <div className="mt-3 text-2xl font-black">{allowed.has(permission) ? "Enabled" : "Off"}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {allowed.has("content_generate") ? (
          <form id="generator" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={(event) => callAi(event, "generate")}>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Bot size={20} />Content Generator</h2>
            <div className="grid gap-3">
              <select className="rounded-lg border border-slate-300 px-3 py-2" value={brandId} onChange={(event) => setBrandId(event.target.value)} required>
                {overview?.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.brand_name}</option>)}
              </select>
              <textarea className="min-h-44 rounded-lg border border-slate-300 px-3 py-2" placeholder="Enter a brief..." value={brief} onChange={(event) => setBrief(event.target.value)} required />
              <button className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-black text-white disabled:opacity-60" disabled={aiLoading === "generate" || !brandId} type="submit">
                {aiLoading === "generate" ? "Generating" : "Generate"}
              </button>
              {generated ? <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-800">{generated}</pre> : null}
            </div>
          </form>
        ) : null}

        {allowed.has("qc_check") ? (
          <form id="qc" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={(event) => callAi(event, "qc")}>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><ClipboardCheck size={20} />QC Checker</h2>
            <div className="grid gap-3">
              <select className="rounded-lg border border-slate-300 px-3 py-2" value={brandId} onChange={(event) => setBrandId(event.target.value)} required>
                {overview?.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.brand_name}</option>)}
              </select>
              <textarea className="min-h-44 rounded-lg border border-slate-300 px-3 py-2" placeholder="Paste content to check..." value={content} onChange={(event) => setContent(event.target.value)} required />
              <button className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-black text-white disabled:opacity-60" disabled={aiLoading === "qc" || !brandId} type="submit">
                {aiLoading === "qc" ? "Checking" : "Run QC"}
              </button>
              {qc ? (
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="text-3xl font-black text-slate-950">{qc.score}</div>
                  <p className="mt-2 text-sm text-slate-700">{qc.summary}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div><div className="font-bold">Issues</div><ul className="list-disc pl-5 text-sm">{qc.issues.map((item) => <li key={item}>{item}</li>)}</ul></div>
                    <div><div className="font-bold">Suggestions</div><ul className="list-disc pl-5 text-sm">{qc.recommendedFixes.map((item) => <li key={item}>{item}</li>)}</ul></div>
                  </div>
                </div>
              ) : null}
            </div>
          </form>
        ) : null}
      </section>

      {allowed.has("export_output") && (generated || qc) ? (
        <button className="flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold" onClick={exportOutput} type="button">
          <Download size={16} />
          Export latest output
        </button>
      ) : null}

      {allowed.has("brand_database_view") ? (
        <section id="brands" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><Database size={20} />Brand Database Viewer</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {overview?.brands.map((brand) => (
              <div className="rounded-lg border border-slate-200 p-4" key={brand.id}>
                <div className="font-black text-slate-950">{brand.brand_name}</div>
                <p className="mt-2 text-sm text-slate-600">{brand.brand_voice || "No brand voice."}</p>
                <p className="mt-2 text-xs text-slate-500">{brand.target_audience}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {allowed.has("history_view") ? (
        <section id="history" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black"><History size={20} />History</h2>
          <div className="grid gap-3">
            {overview?.history.map((item) => (
              <div className="rounded-lg border border-slate-200 p-4" key={item.id}>
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-black text-slate-950">{item.output_type === "qc_check" ? "QC Check" : "Content Generation"}</span>
                  <span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-xs font-bold text-teal-700">{item.brands?.brand_name || "No brand"}</div>
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-slate-700">{item.output}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
