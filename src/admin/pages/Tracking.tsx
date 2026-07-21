import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Code2,
  ExternalLink,
  Loader2,
  Lock,
  Plus,
  Radar,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import { useAdminAuth } from "../auth";

/* Tracking — pixels & analytics without touching code.
 * Tags tab: one-field setup per provider; toggling "on" is live on the next
 * page load of the public site (the runtime injector reads enabled tags).
 * Wizard tab: an AI tracking specialist with the same powers + live research —
 * tell it what you want to measure and it sets everything up. */

type Tag = {
  id: string;
  provider: string;
  label: string;
  config: { id?: string } | null;
  custom_head: string | null;
  custom_body: string | null;
  enabled: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

type Provider = {
  id: string;
  name: string;
  field: string;
  ph: string;
  pattern: RegExp;
  help: string;
  helpUrl: string;
};

const PROVIDERS: Provider[] = [
  { id: "ga4", name: "Google Analytics 4", field: "Measurement ID", ph: "G-XXXXXXXXXX", pattern: /^G-[A-Z0-9]{6,14}$/i, help: "Admin (gear) → Data streams → your web stream → Measurement ID", helpUrl: "https://analytics.google.com" },
  { id: "gtm", name: "Google Tag Manager", field: "Container ID", ph: "GTM-XXXXXXX", pattern: /^GTM-[A-Z0-9]{5,10}$/i, help: "The container ID shown next to the container name", helpUrl: "https://tagmanager.google.com" },
  { id: "google-ads", name: "Google Ads", field: "Conversion ID", ph: "AW-XXXXXXXXX", pattern: /^AW-[0-9]{8,12}$/i, help: "Tools → Data manager → Google tag (AW-…)", helpUrl: "https://ads.google.com" },
  { id: "meta", name: "Meta Pixel", field: "Pixel ID", ph: "1234567890123456", pattern: /^[0-9]{10,20}$/, help: "Events Manager → Data sources → your pixel → Settings", helpUrl: "https://business.facebook.com/events_manager2" },
  { id: "tiktok", name: "TikTok Pixel", field: "Pixel Code", ph: "C0XXXXXXXXXXXX", pattern: /^[A-Z0-9]{8,30}$/i, help: "Assets → Events → Web Events → your pixel's code", helpUrl: "https://ads.tiktok.com" },
  { id: "linkedin", name: "LinkedIn Insight", field: "Partner ID", ph: "1234567", pattern: /^[0-9]{4,10}$/, help: "Campaign Manager → Analyze → Insight Tag → Partner ID", helpUrl: "https://campaign.linkedin.com" },
  { id: "pinterest", name: "Pinterest Tag", field: "Tag ID", ph: "2612345678901", pattern: /^[0-9]{10,16}$/, help: "Ads → Conversions → Tag manager → your tag ID", helpUrl: "https://ads.pinterest.com" },
  { id: "snap", name: "Snap Pixel", field: "Pixel ID", ph: "xxxxxxxx-xxxx-xxxx…", pattern: /^[0-9a-f][0-9a-f-]{18,40}$/i, help: "Events Manager → your pixel's ID", helpUrl: "https://ads.snapchat.com" },
  { id: "clarity", name: "Microsoft Clarity", field: "Project ID", ph: "abcdefghij", pattern: /^[a-z0-9]{6,16}$/i, help: "Your project → Settings → Overview → Project ID", helpUrl: "https://clarity.microsoft.com" },
  { id: "hotjar", name: "Hotjar", field: "Site ID", ph: "1234567", pattern: /^[0-9]{5,9}$/, help: "Site settings → Site ID", helpUrl: "https://insights.hotjar.com" },
  { id: "x", name: "X (Twitter) Pixel", field: "Pixel ID", ph: "odpqa", pattern: /^[a-z0-9]{4,12}$/i, help: "Tools → Conversion tracking → your pixel ID", helpUrl: "https://ads.twitter.com" },
];
const providerOf = (id: string) => PROVIDERS.find((p) => p.id === id);

const SUPER_ADMIN = "nicolas@aireasolutions.com";

type WizardMsg = { role: "user" | "assistant"; content: string; steps?: { type: string; label: string }[] };

const WIZARD_STARTERS = [
  "Set up Google Analytics 4 for this site",
  "Move our GTM container over from the old site so reporting isn't disrupted",
  "What should we track to measure sign-up conversions?",
  "Add the Meta Pixel and turn it on",
];

export function Tracking() {
  const { email } = useAdminAuth();
  const [tab, setTab] = useState<"tags" | "wizard">("tags");
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"owner" | "admin" | "member">("member");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [adding, setAdding] = useState<string | null>(null); // provider id or "custom"
  const [confirming, setConfirming] = useState<Tag | null>(null); // enable confirmation
  const [busyId, setBusyId] = useState("");

  // wizard state
  const [wMsgs, setWMsgs] = useState<WizardMsg[]>([]);
  const [wInput, setWInput] = useState("");
  const [wBusy, setWBusy] = useState(false);
  const wEndRef = useRef<HTMLDivElement>(null);

  const canCustom = role === "owner" || role === "admin";

  const load = async () => {
    if (!supabase) return;
    const { data, error: err } = await supabase.from("tracking_tags").select("*").order("created_at");
    if (err) setError(err.message);
    setTags((data as Tag[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    (async () => {
      if (!supabase || !email) return;
      if (email.toLowerCase() === SUPER_ADMIN) {
        setRole("owner");
        return;
      }
      const { data } = await supabase.from("admin_users").select("role").eq("email", email.toLowerCase()).maybeSingle();
      const r = (data as { role?: string } | null)?.role;
      setRole(r === "owner" ? "owner" : r === "admin" ? "admin" : "member");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  useEffect(() => {
    wEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [wMsgs, wBusy]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3500);
  };

  const saveTag = async (patch: Partial<Tag> & { id: string }) => {
    if (!supabase) return;
    setBusyId(patch.id);
    const { error: err } = await supabase.from("tracking_tags").update(patch).eq("id", patch.id);
    setBusyId("");
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  };

  const toggleTag = (tag: Tag) => {
    if (tag.enabled) {
      saveTag({ id: tag.id, enabled: false } as any);
      flash(`${tag.label} is off — removed from the site on next page load.`);
    } else {
      setConfirming(tag);
    }
  };

  const confirmEnable = async () => {
    if (!confirming) return;
    await saveTag({ id: confirming.id, enabled: true } as any);
    flash(`${confirming.label} is LIVE — collecting from the next page load.`);
    setConfirming(null);
  };

  const removeTag = async (tag: Tag) => {
    if (!supabase) return;
    if (!window.confirm(`Delete "${tag.label}"? ${tag.enabled ? "It is currently LIVE on the site." : ""}`)) return;
    await supabase.from("tracking_tags").delete().eq("id", tag.id);
    await load();
    flash(`${tag.label} deleted.`);
  };

  const addTag = async (provider: string, values: { id?: string; label: string; head?: string; body?: string }, enable: boolean) => {
    if (!supabase) return;
    const { error: err } = await supabase.from("tracking_tags").insert({
      provider,
      label: values.label,
      config: values.id ? { id: values.id.trim() } : {},
      custom_head: values.head || null,
      custom_body: values.body || null,
      enabled: enable,
      created_by: email,
    } as any);
    if (err) {
      setError(err.message.includes("policy") ? "Only owners/admins can add custom HTML tags." : err.message);
      return;
    }
    setAdding(null);
    await load();
    flash(enable ? `${values.label} added and LIVE.` : `${values.label} added (off) — flip it on when ready.`);
  };

  /* ---------- wizard ---------- */

  const askWizard = async (text: string) => {
    const q = text.trim();
    if (!q || wBusy) return;
    setWInput("");
    const next: WizardMsg[] = [...wMsgs, { role: "user", content: q }];
    setWMsgs(next);
    setWBusy(true);
    try {
      const { data: s } = await supabase!.auth.getSession();
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ agent: "tracking", messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error("The Tracking Wizard runs on the deployed site (Vercel), where its serverless functions and keys live. Open the admin on your Vercel URL to use it.");
      }
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || `Wizard error (${res.status})`);
      setWMsgs((m) => [...m, { role: "assistant", content: body.reply || "(no reply)", steps: body.transcript }]);
      if (Array.isArray(body.tagChanges) && body.tagChanges.length) await load();
    } catch (e) {
      setWMsgs((m) => [...m, { role: "assistant", content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setWBusy(false);
    }
  };

  const installed = useMemo(() => tags, [tags]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">Analytics &amp; pixels</p>
          <h1 className="mt-1 font-display text-[clamp(26px,3.4vw,38px)] tracking-tight text-ink">Tracking</h1>
          <p className="mt-1 text-[14px] text-ink-2">
            Add any pixel or analytics tag with one field — no code, no deploy. Toggling a tag is live on the next page load.
          </p>
        </div>
        <div className="flex rounded-full border border-line bg-white p-1">
          {(
            [
              ["tags", "Pixels & tags", Radar],
              ["wizard", "Tracking Wizard", Sparkles],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold transition-colors",
                tab === id ? "bg-blue text-white shadow-soft" : "text-ink-2 hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start justify-between gap-2 rounded-2xl border border-critical/30 bg-critical/5 p-3.5 text-[13px] text-ink">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
            {error}
          </span>
          <button onClick={() => setError("")} className="text-ink-3 hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {tab === "tags" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            {/* installed */}
            <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
              <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-ink-3">On this site</h3>
              {loading ? (
                <div className="grid place-items-center py-10 text-ink-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : installed.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line-2 bg-canvas p-6 text-center text-[13.5px] text-ink-3">
                  No tracking yet. Add a provider on the right — or let the Tracking Wizard set everything up for you.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {installed.map((t) => (
                    <TagCard
                      key={t.id}
                      tag={t}
                      busy={busyId === t.id}
                      onToggle={() => toggleTag(t)}
                      onDelete={() => removeTag(t)}
                      onSaveId={(id) => saveTag({ id: t.id, config: { id } } as any)}
                    />
                  ))}
                </div>
              )}
              <p className="mt-4 text-[12px] text-ink-3">
                Enabled tags load for every visitor of the live site (never in the admin, previews, or local dev). Page-views are reported automatically as visitors navigate.
              </p>
            </div>
          </div>

          {/* add */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
              <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-wider text-ink-3">Add tracking</h3>
              <p className="mb-4 text-[12.5px] text-ink-3">One field per provider — the ID from your account.</p>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map((p) => {
                  const has = tags.some((t) => t.provider === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => setAdding(p.id)}
                      className={cn(
                        "flex items-center justify-between gap-1.5 rounded-xl border px-3 py-2.5 text-left text-[12.5px] font-semibold transition-all",
                        has ? "border-line bg-canvas text-ink-3" : "border-line-2 text-ink hover:border-blue hover:text-blue"
                      )}
                    >
                      <span className="truncate">{p.name}</span>
                      {has ? <Check className="h-3.5 w-3.5 shrink-0 text-blue" /> : <Plus className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
                <button
                  onClick={() => canCustom && setAdding("custom")}
                  title={canCustom ? "Paste any vendor snippet" : "Owners & admins only"}
                  className={cn(
                    "col-span-2 flex items-center justify-between gap-1.5 rounded-xl border px-3 py-2.5 text-left text-[12.5px] font-semibold transition-all",
                    canCustom ? "border-line-2 text-ink hover:border-blue hover:text-blue" : "cursor-not-allowed border-line bg-canvas text-ink-3"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Code2 className="h-3.5 w-3.5" /> Custom HTML / script
                  </span>
                  {canCustom ? <Plus className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setTab("wizard")}
              className="flex w-full items-center gap-3 rounded-2xl border border-blue/30 bg-blue-mist/40 p-4 text-left transition-colors hover:border-blue"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[13.5px] font-semibold text-ink">Not sure what to set up?</span>
                <span className="block text-[12.5px] text-ink-2">The Tracking Wizard researches, configures, and explains it — just describe the goal.</span>
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* ---------- wizard tab ---------- */
        <div className="mt-6 flex h-[calc(100vh-15rem)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {wMsgs.length === 0 && (
              <div className="mx-auto max-w-lg pt-8 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-mist text-blue">
                  <Sparkles className="h-6 w-6" />
                </span>
                <h2 className="mt-4 font-display text-2xl text-ink">Your tracking specialist</h2>
                <p className="mt-2 text-[14px] text-ink-2">
                  Tell it what you want to measure — it checks what's installed, researches anything unfamiliar on the live web, sets up the tags, and asks you for exactly what it needs (with where-to-find-it steps). Nothing goes live without your say-so.
                </p>
                <div className="mt-6 grid gap-2">
                  {WIZARD_STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => askWizard(s)}
                      className="rounded-xl border border-line-2 bg-canvas px-4 py-2.5 text-left text-[13.5px] text-ink transition-colors hover:border-blue hover:text-blue"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {wMsgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[78%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed", m.role === "user" ? "bg-blue text-white" : "border border-line bg-canvas text-ink")}>
                  {m.steps && m.steps.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {m.steps.map((s, j) => (
                        <span key={j} className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-medium text-ink-3 ring-1 ring-line">
                          {s.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {wBusy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-line bg-canvas px-4 py-3 text-[13.5px] text-ink-3">
                  <Loader2 className="h-4 w-4 animate-spin" /> Working — checking tags, researching, configuring…
                </div>
              </div>
            )}
            <div ref={wEndRef} />
          </div>
          <div className="border-t border-line p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={wInput}
                onChange={(e) => setWInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    askWizard(wInput);
                  }
                }}
                rows={2}
                placeholder='e.g. "Install our Meta Pixel 1234567890 and turn it on" or "How do we track people who click Start free?"'
                className="w-full resize-none rounded-xl border border-line-2 bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-blue"
              />
              <button
                onClick={() => askWizard(wInput)}
                disabled={wBusy || !wInput.trim()}
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white transition-colors",
                  wBusy || !wInput.trim() ? "cursor-not-allowed bg-ink-3" : "bg-blue hover:bg-blue-ink"
                )}
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* add-tag modal */}
      {adding && (
        <AddTagModal
          provider={adding === "custom" ? null : providerOf(adding)!}
          onClose={() => setAdding(null)}
          onAdd={addTag}
        />
      )}

      {/* enable confirmation */}
      {confirming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setConfirming(null)}>
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="grid h-11 w-11 place-items-center rounded-full bg-blue-mist text-blue-ink">
              <Radar className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-xl text-ink">Turn on {confirming.label}?</h2>
            <p className="mt-2 text-[14px] text-ink-2">
              It starts loading for <strong>every visitor</strong> of the live site from their next page load. You can switch it off here anytime.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirming(null)} className="rounded-full border border-line-2 px-4 py-2 text-[13.5px] font-semibold text-ink hover:border-ink-3">
                Cancel
              </button>
              <button onClick={confirmEnable} className="rounded-full bg-blue px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-blue-ink">
                Turn on — go live
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-[13.5px] font-semibold text-white shadow-card">
          <Check className="h-4 w-4 text-green-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

/* One installed tag. */
function TagCard({ tag, busy, onToggle, onDelete, onSaveId }: { tag: Tag; busy: boolean; onToggle: () => void; onDelete: () => void; onSaveId: (id: string) => void }) {
  const p = providerOf(tag.provider);
  const [open, setOpen] = useState(false);
  const [idValue, setIdValue] = useState(tag.config?.id ?? "");
  useEffect(() => setIdValue(tag.config?.id ?? ""), [tag.config?.id]);
  const valid = !p || !idValue || p.pattern.test(idValue.trim());

  return (
    <div className={cn("rounded-xl border bg-canvas", tag.enabled ? "border-blue/30" : "border-line-2")}>
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[12px] font-bold", tag.enabled ? "bg-blue text-white" : "bg-white text-ink-3 ring-1 ring-line")}>
          {(p?.name ?? tag.label).slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[14px] font-semibold text-ink">{tag.label}</span>
            {tag.enabled ? (
              <span className="rounded-full bg-blue-mist px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-blue-ink">Live</span>
            ) : (
              <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-ink-3">Off</span>
            )}
          </div>
          <div className="truncate font-mono text-[11.5px] text-ink-3">
            {tag.provider === "custom" ? "custom snippet" : tag.config?.id || "no ID yet"}
          </div>
        </div>
        <button onClick={() => setOpen((v) => !v)} title="Details" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-ink/5 hover:text-ink">
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
        <button
          onClick={onToggle}
          disabled={busy}
          className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", tag.enabled ? "bg-blue" : "bg-line-2", busy && "opacity-50")}
          title={tag.enabled ? "Turn off" : "Turn on (goes live)"}
        >
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all", tag.enabled ? "left-[1.45rem]" : "left-0.5")} />
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-line px-3.5 py-3">
          {tag.provider !== "custom" && p && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{p.field}</span>
                <a href={p.helpUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11.5px] font-medium text-blue hover:underline">
                  Where do I find this? <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex gap-2">
                <input
                  value={idValue}
                  onChange={(e) => setIdValue(e.target.value)}
                  placeholder={p.ph}
                  className={cn("w-full rounded-lg border bg-white px-3 py-2 font-mono text-[13px] text-ink outline-none", valid ? "border-line-2 focus:border-blue" : "border-critical/50")}
                />
                <button
                  onClick={() => onSaveId(idValue.trim())}
                  disabled={!valid || idValue.trim() === (tag.config?.id ?? "")}
                  className="shrink-0 rounded-lg bg-blue px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-blue-ink disabled:cursor-not-allowed disabled:bg-ink-3"
                >
                  Save
                </button>
              </div>
              {!valid && <p className="mt-1 text-[11.5px] text-critical">That doesn't look like a {p.field} ({p.ph}). {p.help}.</p>}
              {valid && <p className="mt-1 text-[11.5px] text-ink-3">{p.help}.</p>}
            </div>
          )}
          {tag.provider === "custom" && (
            <div className="rounded-lg bg-white p-2.5 font-mono text-[10.5px] leading-relaxed text-ink-3 ring-1 ring-line">
              {(tag.custom_head || "").slice(0, 220) || "(no head snippet)"}
              {tag.custom_body ? `\n— body —\n${tag.custom_body.slice(0, 120)}` : ""}
            </div>
          )}
          {tag.notes && <p className="text-[12px] text-ink-2">{tag.notes}</p>}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-3">Added by {tag.created_by || "—"}</span>
            <button onClick={onDelete} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold text-ink-3 transition-colors hover:text-critical">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Add a provider tag (one field) or a custom snippet. */
function AddTagModal({ provider, onClose, onAdd }: { provider: Provider | null; onClose: () => void; onAdd: (providerId: string, values: { id?: string; label: string; head?: string; body?: string }, enable: boolean) => void }) {
  const [id, setId] = useState("");
  const [label, setLabel] = useState(provider?.name ?? "");
  const [head, setHead] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const custom = !provider;
  const valid = custom ? !!label.trim() && (!!head.trim() || !!bodyHtml.trim()) : !!id.trim() && provider!.pattern.test(id.trim());

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg rounded-3xl border border-line bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <h2 className="font-display text-xl text-ink">{custom ? "Custom HTML / script" : `Add ${provider!.name}`}</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-ink/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        {custom ? (
          <div className="mt-4 space-y-3">
            <div>
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-3">Name</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Segment, ProfitWell, live chat…" className="w-full rounded-xl border border-line-2 bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-blue" />
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-3">Snippet for &lt;head&gt;</span>
              <textarea value={head} onChange={(e) => setHead(e.target.value)} rows={5} placeholder="<script>…</script>" className="w-full resize-y rounded-xl border border-line-2 bg-canvas px-3.5 py-2.5 font-mono text-[12px] text-ink outline-none focus:border-blue" />
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-3">Snippet for end of &lt;body&gt; (optional)</span>
              <textarea value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} rows={3} className="w-full resize-y rounded-xl border border-line-2 bg-canvas px-3.5 py-2.5 font-mono text-[12px] text-ink outline-none focus:border-blue" />
            </div>
            <p className="text-[12px] text-ink-3">Paste the vendor's snippet exactly as documented. It runs for every visitor once enabled.</p>
          </div>
        ) : (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{provider!.field}</span>
              <a href={provider!.helpUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11.5px] font-medium text-blue hover:underline">
                Where do I find this? <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder={provider!.ph}
              autoFocus
              className={cn("w-full rounded-xl border bg-canvas px-3.5 py-2.5 font-mono text-[14px] text-ink outline-none", !id || provider!.pattern.test(id.trim()) ? "border-line-2 focus:border-blue" : "border-critical/50")}
            />
            <p className="mt-1.5 text-[12px] text-ink-3">{provider!.help}.</p>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => onAdd(custom ? "custom" : provider!.id, { id: custom ? undefined : id, label: label || provider?.name || "Custom", head, body: bodyHtml }, false)}
            disabled={!valid}
            className="rounded-full border border-line-2 px-4 py-2 text-[13.5px] font-semibold text-ink hover:border-ink-3 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add (keep off)
          </button>
          <button
            onClick={() => onAdd(custom ? "custom" : provider!.id, { id: custom ? undefined : id, label: label || provider?.name || "Custom", head, body: bodyHtml }, true)}
            disabled={!valid}
            className="rounded-full bg-blue px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-blue-ink disabled:cursor-not-allowed disabled:bg-ink-3"
          >
            Add &amp; turn on
          </button>
        </div>
      </div>
    </div>
  );
}
