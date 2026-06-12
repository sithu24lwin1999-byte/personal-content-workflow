"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Database,
  KeyRound,
  type LucideIcon,
  Plus,
  RefreshCcw,
  Save,
  Settings,
  SlidersHorizontal,
  Trash2,
  Users
} from "lucide-react";
import {
  FEATURE_LABELS,
  FEATURE_PERMISSIONS,
  type Brand,
  type FeaturePermission,
  type GeminiSettings,
  type Profile,
  type UsageLog,
  type UserPermission
} from "@/lib/types";

type Overview = {
  users: Profile[];
  permissions: UserPermission[];
  brands: Brand[];
  settings: GeminiSettings | null;
  usageLogs: (UsageLog & {
    profiles?: { email?: string; full_name?: string | null };
    brands?: { brand_name?: string };
  })[];
};

const emptyBrand = {
  brand_name: "",
  brand_voice: "",
  target_audience: "",
  products_services: "",
  do_words: "",
  dont_words: "",
  writing_style: "",
  offers_promotions: "",
  contact_info: "",
  reference_document_link: "",
  sample_content: "",
  qc_rules: ""
};

export function OwnerPanel() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user",
    daily_usage_limit: 25
  });
  const [settingsForm, setSettingsForm] = useState<GeminiSettings & { api_key: string }>({
    api_key: "",
    model_name: "gemini-2.5-flash",
    temperature: 0.4,
    max_output_tokens: 2048,
    content_system_prompt:
      "You are a careful content strategist. Follow the selected brand data and user brief.",
    qc_system_prompt: "You are a meticulous brand QA editor. Return valid JSON only.",
    daily_usage_limit_default: 25
  });
  const [brandForm, setBrandForm] = useState(emptyBrand);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);

  async function loadOverview() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/owner/overview");
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error || "Could not load owner data.");
      return;
    }

    setOverview(data);
    if (data.settings) {
      setSettingsForm({ ...data.settings, api_key: "" });
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const permissionsByUser = useMemo(() => {
    const map = new Map<string, Partial<Record<FeaturePermission, boolean>>>();
    overview?.permissions.forEach((row) => {
      map.set(row.user_id, {
        ...(map.get(row.user_id) || {}),
        [row.permission]: row.enabled
      });
    });
    return map;
  }, [overview]);

  async function submitJson(url: string, method: string, body: unknown) {
    setMessage("");
    setError("");
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Request failed.");
      return false;
    }

    setMessage("Saved.");
    await loadOverview();
    return true;
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submitJson("/api/owner/users", "POST", userForm);
    if (ok) {
      setUserForm({
        email: "",
        password: "",
        full_name: "",
        role: "user",
        daily_usage_limit: 25
      });
    }
  }

  async function updateUser(user: Profile, changes: Partial<Profile>) {
    await submitJson(`/api/owner/users/${user.id}`, "PATCH", changes);
  }

  async function updatePermissions(userId: string, permission: FeaturePermission, enabled: boolean) {
    const current = permissionsByUser.get(userId) || {};
    await submitJson("/api/owner/permissions", "PUT", {
      user_id: userId,
      permissions: { ...current, [permission]: enabled }
    });
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitJson("/api/owner/settings", "PATCH", settingsForm);
  }

  async function saveBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = editingBrandId
      ? `/api/owner/brands/${editingBrandId}`
      : "/api/owner/brands";
    const method = editingBrandId ? "PATCH" : "POST";
    const ok = await submitJson(url, method, brandForm);
    if (ok) {
      setBrandForm(emptyBrand);
      setEditingBrandId(null);
    }
  }

  async function deleteBrand(brandId: string) {
    await submitJson(`/api/owner/brands/${brandId}`, "DELETE", {});
  }

  function editBrand(brand: Brand) {
    setEditingBrandId(brand.id);
    setBrandForm({
      brand_name: brand.brand_name || "",
      brand_voice: brand.brand_voice || "",
      target_audience: brand.target_audience || "",
      products_services: brand.products_services || "",
      do_words: brand.do_words || "",
      dont_words: brand.dont_words || "",
      writing_style: brand.writing_style || "",
      offers_promotions: brand.offers_promotions || "",
      contact_info: brand.contact_info || "",
      reference_document_link: brand.reference_document_link || "",
      sample_content: brand.sample_content || "",
      qc_rules: brand.qc_rules || ""
    });
  }

  const stats: { label: string; value: string | number; Icon: LucideIcon }[] = [
    { label: "Users", value: overview?.users.length || 0, Icon: Users },
    { label: "Brands", value: overview?.brands.length || 0, Icon: Database },
    {
      label: "Usage Logs",
      value: overview?.usageLogs.length || 0,
      Icon: SlidersHorizontal
    },
    {
      label: "Gemini Key",
      value: overview?.settings?.has_api_key ? "Set" : "Missing",
      Icon: KeyRound
    }
  ];

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase text-teal-700">Owner Panel</p>
          <h1 className="text-4xl font-black text-slate-950">Operations control</h1>
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
      {loading ? <div className="rounded-lg bg-white p-5 text-sm font-bold text-slate-600">Loading owner data...</div> : null}

      <section className="grid gap-4 md:grid-cols-4">
        {stats.map(({ label, value, Icon }) => (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={label}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">{label}</span>
              <Icon className="text-teal-700" size={18} />
            </div>
            <div className="mt-3 text-3xl font-black text-slate-950">{String(value)}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
            <Users size={20} />
            Users and permissions
          </h2>
          <form className="mb-5 grid gap-3 md:grid-cols-5" onSubmit={createUser}>
            <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Email" type="email" value={userForm.email} onChange={(event) => setUserForm({ ...userForm, email: event.target.value })} required />
            <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Temp password" type="password" minLength={8} value={userForm.password} onChange={(event) => setUserForm({ ...userForm, password: event.target.value })} required />
            <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Name" value={userForm.full_name} onChange={(event) => setUserForm({ ...userForm, full_name: event.target.value })} />
            <select className="rounded-lg border border-slate-300 px-3 py-2" value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}>
              <option value="user">user</option>
              <option value="owner">owner</option>
            </select>
            <button className="flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-black text-white" type="submit">
              <Plus size={16} />
              Create
            </button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">User</th>
                  <th>Role</th>
                  <th>Limit</th>
                  <th>Active</th>
                  <th>Permissions</th>
                </tr>
              </thead>
              <tbody>
                {overview?.users.map((user) => (
                  <tr className="border-b border-slate-100 align-top" key={user.id}>
                    <td className="py-3">
                      <div className="font-bold text-slate-950">{user.email}</div>
                      <div className="text-xs text-slate-500">{user.full_name || "No name"}</div>
                    </td>
                    <td>
                      <select className="rounded border border-slate-300 px-2 py-1" value={user.role} onChange={(event) => updateUser(user, { role: event.target.value as Profile["role"] })}>
                        <option value="user">user</option>
                        <option value="owner">owner</option>
                      </select>
                    </td>
                    <td>
                      <input className="w-20 rounded border border-slate-300 px-2 py-1" type="number" value={user.daily_usage_limit} onChange={(event) => updateUser(user, { daily_usage_limit: Number(event.target.value) })} />
                    </td>
                    <td>
                      <input type="checkbox" checked={user.is_active} onChange={(event) => updateUser(user, { is_active: event.target.checked })} />
                    </td>
                    <td>
                      <div className="grid grid-cols-2 gap-2">
                        {FEATURE_PERMISSIONS.map((permission) => (
                          <label className="flex items-center gap-2 text-xs font-bold text-slate-600" key={permission}>
                            <input
                              checked={Boolean(permissionsByUser.get(user.id)?.[permission]) || user.role === "owner"}
                              disabled={user.role === "owner"}
                              type="checkbox"
                              onChange={(event) => updatePermissions(user.id, permission, event.target.checked)}
                            />
                            {FEATURE_LABELS[permission]}
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={saveSettings}>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
            <Settings size={20} />
            Gemini settings
          </h2>
          <div className="grid gap-3">
            <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder={overview?.settings?.has_api_key ? "Replace API key" : "Gemini API key"} value={settingsForm.api_key} onChange={(event) => setSettingsForm({ ...settingsForm, api_key: event.target.value })} />
            <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Model" value={settingsForm.model_name} onChange={(event) => setSettingsForm({ ...settingsForm, model_name: event.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <label className="grid gap-1 text-xs font-bold text-slate-600">Temperature<input className="rounded-lg border border-slate-300 px-3 py-2" type="number" step="0.1" value={settingsForm.temperature} onChange={(event) => setSettingsForm({ ...settingsForm, temperature: Number(event.target.value) })} /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">Max tokens<input className="rounded-lg border border-slate-300 px-3 py-2" type="number" value={settingsForm.max_output_tokens} onChange={(event) => setSettingsForm({ ...settingsForm, max_output_tokens: Number(event.target.value) })} /></label>
              <label className="grid gap-1 text-xs font-bold text-slate-600">Daily default<input className="rounded-lg border border-slate-300 px-3 py-2" type="number" value={settingsForm.daily_usage_limit_default} onChange={(event) => setSettingsForm({ ...settingsForm, daily_usage_limit_default: Number(event.target.value) })} /></label>
            </div>
            <textarea className="min-h-28 rounded-lg border border-slate-300 px-3 py-2" value={settingsForm.content_system_prompt} onChange={(event) => setSettingsForm({ ...settingsForm, content_system_prompt: event.target.value })} />
            <textarea className="min-h-28 rounded-lg border border-slate-300 px-3 py-2" value={settingsForm.qc_system_prompt} onChange={(event) => setSettingsForm({ ...settingsForm, qc_system_prompt: event.target.value })} />
            <button className="flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-black text-white" type="submit">
              <Save size={16} />
              Save settings
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <form className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={saveBrand}>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
            <Database size={20} />
            {editingBrandId ? "Edit brand" : "Create brand"}
          </h2>
          <div className="grid gap-3">
            {Object.entries(brandForm).map(([key, value]) =>
              key === "sample_content" || key === "qc_rules" ? (
                <textarea
                  className="min-h-24 rounded-lg border border-slate-300 px-3 py-2"
                  key={key}
                  placeholder={key.replaceAll("_", " ")}
                  value={value}
                  onChange={(event) => setBrandForm({ ...brandForm, [key]: event.target.value })}
                />
              ) : (
                <input
                  className="rounded-lg border border-slate-300 px-3 py-2"
                  key={key}
                  placeholder={key.replaceAll("_", " ")}
                  value={value}
                  onChange={(event) => setBrandForm({ ...brandForm, [key]: event.target.value })}
                  required={key === "brand_name"}
                />
              )
            )}
            <div className="flex gap-2">
              <button className="flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-black text-white" type="submit">
                <Save size={16} />
                {editingBrandId ? "Update brand" : "Create brand"}
              </button>
              {editingBrandId ? (
                <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold" type="button" onClick={() => { setEditingBrandId(null); setBrandForm(emptyBrand); }}>
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </form>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-black">Brand database</h2>
          <div className="grid gap-3">
            {overview?.brands.map((brand) => (
              <div className="rounded-lg border border-slate-200 p-4" key={brand.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-slate-950">{brand.brand_name}</div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{brand.brand_voice || "No brand voice yet."}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold" onClick={() => editBrand(brand)} type="button">Edit</button>
                    <button className="rounded-lg border border-rose-200 px-3 py-2 text-rose-700" onClick={() => deleteBrand(brand.id)} type="button" aria-label={`Delete ${brand.brand_name}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-black">Recent usage logs</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Time</th>
                <th>User</th>
                <th>Feature</th>
                <th>Brand</th>
                <th>Input</th>
                <th>Output</th>
              </tr>
            </thead>
            <tbody>
              {overview?.usageLogs.map((log) => (
                <tr className="border-b border-slate-100" key={log.id}>
                  <td className="py-2">{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.profiles?.email || log.user_id}</td>
                  <td>{FEATURE_LABELS[log.feature]}</td>
                  <td>{log.brands?.brand_name || "None"}</td>
                  <td>{log.input_chars}</td>
                  <td>{log.output_chars}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
