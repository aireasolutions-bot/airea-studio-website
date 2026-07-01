import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUp,
  Check,
  ExternalLink,
  Gauge,
  Globe,
  Loader2,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from "lucide-react";
import { RobotHead } from "@/components/RobotHead";
import { cn } from "@/lib/cn";
import { SITE_PAGES, pageLabel } from "@/lib/pages";
import { pageSeo, SITE_URL } from "@/lib/seo";
import { PageHead } from "./_Placeholder";
import {
  listSeo,
  saveSeo,
  clearSeo,
  runSeoAgent,
  type SeoRow,
  type SeoStep,
  type SeoChange,
} from "../seo/client";
import { logEvent } from "../activity/client";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e6)}`);

type Form = {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  canonical: string;
  noindex: boolean;
  priority: string;
  changefreq: string;
};
const EMPTY: Form = { title: "", description: "", keywords: "", ogImage: "", canonical: "", noindex: false, priority: "", changefreq: "" };

type Check = { label: string; ok: boolean; warn?: boolean; note: string };

function pageChecks(title: string, description: string, keywords: string, noindex: boolean): Check[] {
  const kw = (keywords || "").split(",")[0].trim().toLowerCase();
  const t = title.trim();
  const d = description.trim();
  return [
    { label: "Title length (30–60)", ok: t.length >= 30 && t.length <= 60, warn: t.length > 60, note: `${t.length}` },
    { label: "Description length (70–160)", ok: d.length >= 70 && d.length <= 160, warn: d.length > 160, note: `${d.length}` },
    { label: "Focus keyword set", ok: !!kw, note: kw ? "✓" : "add one" },
    { label: "Keyword in title", ok: !kw || t.toLowerCase().includes(kw), note: kw ? (t.toLowerCase().includes(kw) ? "✓" : "missing") : "—" },
    { label: "Indexable", ok: !noindex, note: noindex ? "noindex" : "index" },
  ];
}

type UIMsg = { id: string; role: "user" | "assistant"; content: string; transcript?: SeoStep[]; changes?: SeoChange[]; error?: boolean };

const SUGGESTIONS = [
  { title: "Audit the whole site", body: "Check every page and list the highest-impact fixes, ranked." },
  { title: "Sharpen the pricing page", body: "Rewrite its title + description for higher click-through." },
  { title: "Refresh all meta descriptions", body: "Make every description compelling and keyword-rich." },
  { title: "Fill keyword gaps", body: "Find pages missing a focus keyword and add the best one." },
];

export function SeoConsole() {
  const [mode, setMode] = useState<"agent" | "manual">("agent");
  const [seoMap, setSeoMap] = useState<Record<string, SeoRow>>({});
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [selected, setSelected] = useState("/");
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [msgs, setMsgs] = useState<UIMsg[]>([]);
  const [agentInput, setAgentInput] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    setLoadErr("");
    try {
      setSeoMap(await listSeo());
    } catch (e) {
      setLoadErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  // Load the selected page's override into the form
  useEffect(() => {
    const o = seoMap[selected] || {};
    setForm({
      title: o.title || "",
      description: o.description || "",
      keywords: o.keywords || "",
      ogImage: o.og_image || "",
      canonical: o.canonical || "",
      noindex: !!o.noindex,
      priority: o.priority != null ? String(o.priority) : "",
      changefreq: o.changefreq || "",
    });
    setSaveMsg(null);
  }, [selected, seoMap]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, agentBusy]);

  const def = pageSeo(selected);
  const effTitle = form.title || def.title;
  const effDesc = form.description || def.description;
  const checks = pageChecks(effTitle, effDesc, form.keywords, form.noindex);

  // Health across all pages
  const health = useMemo(() => {
    let issues = 0;
    for (const p of SITE_PAGES) {
      const o = seoMap[p.path] || {};
      const d = pageSeo(p.path);
      const c = pageChecks(o.title || d.title, o.description || d.description, o.keywords || "", !!o.noindex);
      issues += c.filter((x) => !x.ok).length;
    }
    return { pages: SITE_PAGES.length, issues, customized: Object.keys(seoMap).length };
  }, [seoMap]);

  const save = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await saveSeo(selected, {
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        keywords: form.keywords.trim() || null,
        og_image: form.ogImage.trim() || null,
        canonical: form.canonical.trim() || null,
        noindex: form.noindex,
        priority: form.priority ? Number(form.priority) : null,
        changefreq: form.changefreq || null,
      });
      setSaveMsg({ kind: "ok", text: "Saved — live on the site." });
      void logEvent({ action: "seo.edit", category: "seo", target: selected, targetType: "page", summary: `Updated SEO for ${selected}` });
      await load();
    } catch (e) {
      setSaveMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = async () => {
    if (!window.confirm("Reset this page to its built-in defaults? This clears all your SEO overrides for it.")) return;
    setSaving(true);
    try {
      await clearSeo(selected);
      setSaveMsg({ kind: "ok", text: "Reset to defaults." });
      await load();
    } catch (e) {
      setSaveMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const sendAgent = async (text: string) => {
    const content = text.trim();
    if (!content || agentBusy) return;
    setAgentInput("");
    const userMsg: UIMsg = { id: uid(), role: "user", content };
    const history = [...msgs, userMsg].filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [...m, userMsg]);
    setAgentBusy(true);
    try {
      const res = await runSeoAgent(history);
      setMsgs((m) => [...m, { id: uid(), role: "assistant", content: res.reply || "Done.", transcript: res.transcript, changes: res.changes }]);
      if (res.changes?.length) await load(); // reflect applied changes in the editor
    } catch (e) {
      setMsgs((m) => [...m, { id: uid(), role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setAgentBusy(false);
    }
  };

  const titleLen = effTitle.length;
  const descLen = effDesc.length;
  const bar = (len: number, min: number, max: number) =>
    len === 0 ? "bg-line-2" : len >= min && len <= max ? "bg-emerald-500" : len > max ? "bg-critical" : "bg-amber-500";

  return (
    <div>
      <PageHead
        eyebrow="SEO"
        title="SEO console"
        sub="Let the SEO agent audit and optimize the whole site for you — or fine-tune any page by hand. Everything goes live instantly."
      />

      {/* health strip */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {[
          { icon: Globe, label: "Pages", value: health.pages, tone: "text-ink" },
          { icon: AlertTriangle, label: "Open issues", value: health.issues, tone: health.issues ? "text-amber-600" : "text-emerald-600" },
          { icon: Sparkles, label: "Customized", value: health.customized, tone: "text-blue" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-2xl border border-line bg-white px-4 py-2.5 shadow-soft">
            <s.icon className={cn("h-4 w-4", s.tone)} />
            <span className={cn("text-[18px] font-bold tabular-nums", s.tone)}>{s.value}</span>
            <span className="text-[12.5px] text-ink-3">{s.label}</span>
          </div>
        ))}
        <a
          href="/sitemap.xml"
          target="_blank"
          rel="noreferrer"
          className="ml-auto flex items-center gap-1.5 rounded-full border border-line-2 px-3.5 py-2 text-[12.5px] font-semibold text-ink-2 hover:border-ink-3 hover:text-ink"
        >
          <ExternalLink className="h-3.5 w-3.5" /> sitemap.xml
        </a>
      </div>

      {/* mode toggle */}
      <div className="mt-6 inline-flex rounded-full border border-line bg-white p-1 shadow-soft">
        <button
          onClick={() => setMode("agent")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
            mode === "agent" ? "bg-blue text-white shadow-soft" : "text-ink-2 hover:text-ink"
          )}
        >
          <Sparkles className="h-4 w-4" /> SEO Agent
        </button>
        <button
          onClick={() => setMode("manual")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
            mode === "manual" ? "bg-blue text-white shadow-soft" : "text-ink-2 hover:text-ink"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" /> Manual editor
        </button>
      </div>

      {/* ================= AGENT ================= */}
      {mode === "agent" && (
        <div
          className="mt-5 flex w-full flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft"
          style={{ height: "calc(100vh - 17rem)", minHeight: 560 }}
        >
          <div className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-white to-blue-mist/40 px-5 py-4">
            <RobotHead size={38} float={false} glow={false} />
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-ink">SEO Agent</div>
              <div className="truncate text-[12.5px] text-ink-3">Audits your pages, then writes + applies better titles, descriptions & keywords — live</div>
            </div>
            <span className="hidden items-center gap-1.5 rounded-full bg-blue-mist px-3 py-1 text-[11.5px] font-semibold text-blue-ink sm:inline-flex">
              <Gauge className="h-3.5 w-3.5" /> {health.issues} open {health.issues === 1 ? "issue" : "issues"}
            </span>
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto p-5">
            {msgs.length === 0 && !agentBusy ? (
              <div className="mx-auto max-w-2xl pt-6 text-center">
                <div className="mb-4 flex justify-center">
                  <RobotHead size={64} />
                </div>
                <h3 className="font-display text-[26px] tracking-[-0.01em] text-ink">What should we optimize?</h3>
                <p className="mx-auto mt-2 max-w-md text-[14px] text-ink-2">
                  I read each page's real copy, then write and apply higher-converting, keyword-rich SEO. Just ask — or start with one of these:
                </p>
                <div className="mt-6 grid gap-2.5 text-left sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.title}
                      onClick={() => sendAgent(`${s.title}: ${s.body}`)}
                      className="group flex flex-col gap-1 rounded-2xl border border-line bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue/40 hover:shadow-card"
                    >
                      <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
                        <Wand2 className="h-3.5 w-3.5 text-blue" /> {s.title}
                      </span>
                      <span className="text-[12.5px] leading-snug text-ink-3">{s.body}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-3">
                {msgs.map((m) =>
                  m.role === "user" ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue px-3.5 py-2 text-[13px] text-white shadow-soft">{m.content}</div>
                    </div>
                  ) : (
                    <div key={m.id} className="space-y-2">
                      <div
                        className={cn(
                          "rounded-2xl rounded-tl-sm border px-3.5 py-2.5 text-[13px] leading-relaxed",
                          m.error ? "border-critical/30 bg-critical/5 text-ink" : "border-line bg-white text-ink"
                        )}
                      >
                        {m.error && (
                          <div className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-critical">
                            <AlertTriangle className="h-3.5 w-3.5" /> Couldn't complete that
                          </div>
                        )}
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      </div>
                      {m.transcript && m.transcript.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {m.transcript.map((s, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 font-mono text-[10px] text-ink-3">
                              <Sparkles className="h-2.5 w-2.5" /> {s.label}
                            </span>
                          ))}
                        </div>
                      )}
                      {m.changes && m.changes.length > 0 && (
                        <div className="space-y-1.5">
                          {m.changes.map((ch, i) => (
                            <div key={i} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
                              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-800">
                                <Check className="h-3.5 w-3.5" /> Applied to {ch.label}
                              </div>
                              {ch.title && <div className="mt-1 truncate text-[12px] text-ink"><span className="text-ink-3">Title:</span> {ch.title}</div>}
                              {ch.description && <div className="mt-0.5 line-clamp-2 text-[11.5px] text-ink-2"><span className="text-ink-3">Desc:</span> {ch.description}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}
                {agentBusy && (
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-line bg-white px-3.5 py-2.5 text-[13px] text-ink-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue" /> Auditing & optimizing…
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-line bg-white p-3">
            <div className="mx-auto flex max-w-2xl items-end gap-2">
              <textarea
                value={agentInput}
                onChange={(e) => setAgentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendAgent(agentInput);
                  }
                }}
                rows={1}
                placeholder="Ask the SEO agent to audit or optimize anything…"
                className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-line-2 bg-white px-3.5 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3 focus:border-blue"
              />
              <button
                onClick={() => sendAgent(agentInput)}
                disabled={agentBusy || !agentInput.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue text-white shadow-soft hover:bg-blue-ink disabled:opacity-40"
              >
                {agentBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MANUAL EDITOR ================= */}
      {mode === "manual" && (
        <div className="mx-auto mt-5 max-w-3xl space-y-5">
          {/* page tabs */}
          <div className="flex flex-wrap gap-1.5">
            {SITE_PAGES.map((p) => {
              const hasOverride = !!seoMap[p.path];
              return (
                <button
                  key={p.path}
                  onClick={() => setSelected(p.path)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                    selected === p.path ? "border-blue bg-blue text-white shadow-soft" : "border-line-2 bg-white text-ink-2 hover:border-blue/40 hover:text-ink"
                  )}
                >
                  {pageLabel(p.slug)}
                  {hasOverride && <span className={cn("h-1.5 w-1.5 rounded-full", selected === p.path ? "bg-white" : "bg-blue")} />}
                </button>
              );
            })}
          </div>

          {loadErr ? (
            <div className="flex items-start gap-2 rounded-2xl border border-critical/30 bg-critical/5 p-4 text-[13px] text-critical">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loadErr}
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-white p-8 text-[14px] text-ink-3 shadow-soft">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading SEO…
            </div>
          ) : (
            <>
              {/* Google SERP preview */}
              <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
                <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                  <Search className="h-3.5 w-3.5" /> Search preview
                </div>
                <div className="max-w-xl">
                  <div className="flex items-center gap-1 text-[12.5px] text-ink-3">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-blue-mist text-[8px] font-bold text-blue-ink">A</span>
                    <span>AIREA Studio</span>
                    <span className="text-ink-3/60">
                      {" · "}
                      {SITE_URL.replace("https://", "")}
                      {selected === "/" ? "" : " › " + selected.slice(1).replace(/-/g, " ")}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[19px] leading-tight text-[#1a0dab]">{effTitle}</div>
                  <div className="mt-1 line-clamp-2 text-[13.5px] leading-snug text-ink-2">{effDesc}</div>
                </div>
              </div>

              {/* fields */}
              <div className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-soft">
                <Field label="Title tag" hint={`${titleLen} chars · aim 30–60`} bar={<Meter len={titleLen} cls={bar(titleLen, 30, 60)} max={60} />}>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={def.title}
                    className="w-full rounded-xl border border-line-2 bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-3/70 focus:border-blue"
                  />
                </Field>

                <Field label="Meta description" hint={`${descLen} chars · aim 140–160`} bar={<Meter len={descLen} cls={bar(descLen, 70, 160)} max={160} />}>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder={def.description}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-line-2 bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-3/70 focus:border-blue"
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Focus keyword">
                    <input
                      value={form.keywords}
                      onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                      placeholder="e.g. AI marketing for small business"
                      className="w-full rounded-xl border border-line-2 bg-white px-3.5 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3/70 focus:border-blue"
                    />
                  </Field>
                  <Field label="OG / social image URL">
                    <input
                      value={form.ogImage}
                      onChange={(e) => setForm((f) => ({ ...f, ogImage: e.target.value }))}
                      placeholder="https://…/og.png (optional)"
                      className="w-full rounded-xl border border-line-2 bg-white px-3.5 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3/70 focus:border-blue"
                    />
                  </Field>
                </div>

                <details className="rounded-xl border border-line bg-canvas/50 px-4 py-2.5">
                  <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-2">Advanced</summary>
                  <div className="mt-3 space-y-4">
                    <Field label="Canonical URL override">
                      <input
                        value={form.canonical}
                        onChange={(e) => setForm((f) => ({ ...f, canonical: e.target.value }))}
                        placeholder={`${SITE_URL}${selected === "/" ? "/" : selected}`}
                        className="w-full rounded-lg border border-line-2 bg-white px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-3/70 focus:border-blue"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Sitemap priority">
                        <input
                          value={form.priority}
                          onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                          placeholder={String(def.priority)}
                          className="w-full rounded-lg border border-line-2 bg-white px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-3/70 focus:border-blue"
                        />
                      </Field>
                      <Field label="Change frequency">
                        <input
                          value={form.changefreq}
                          onChange={(e) => setForm((f) => ({ ...f, changefreq: e.target.value }))}
                          placeholder={def.changefreq}
                          className="w-full rounded-lg border border-line-2 bg-white px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-3/70 focus:border-blue"
                        />
                      </Field>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={form.noindex}
                        onChange={(e) => setForm((f) => ({ ...f, noindex: e.target.checked }))}
                        className="h-4 w-4 rounded border-line-2 text-blue focus:ring-blue"
                      />
                      <span className="text-[13px] font-medium text-ink-2">
                        Hide from search (<code className="text-ink-3">noindex</code>) — keeps this page out of Google
                      </span>
                    </label>
                  </div>
                </details>

                {/* checks */}
                <div className="flex flex-wrap gap-1.5 border-t border-line pt-4">
                  {checks.map((c) => (
                    <span
                      key={c.label}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium",
                        c.ok ? "bg-emerald-50 text-emerald-700" : c.warn ? "bg-critical/10 text-critical" : "bg-amber-50 text-amber-700"
                      )}
                    >
                      {c.ok ? <Check className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                      {c.label} {c.note && <span className="opacity-70">· {c.note}</span>}
                    </span>
                  ))}
                </div>

                {/* actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-full bg-blue px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-soft hover:bg-blue-ink disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving…" : "Save — go live"}
                  </button>
                  {seoMap[selected] && (
                    <button
                      onClick={resetToDefault}
                      disabled={saving}
                      className="flex items-center gap-1.5 rounded-full border border-line-2 px-3.5 py-2.5 text-[13px] font-semibold text-ink-2 hover:border-ink-3 hover:text-ink disabled:opacity-60"
                    >
                      <RotateCcw className="h-4 w-4" /> Reset to default
                    </button>
                  )}
                  <a
                    href={selected === "/" ? "/" : selected}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-3 hover:text-ink"
                  >
                    View page <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  {saveMsg && (
                    <span className={cn("text-[12.5px] font-medium", saveMsg.kind === "ok" ? "text-emerald-600" : "text-critical")}>
                      {saveMsg.text}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, bar, children }: { label: string; hint?: string; bar?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-ink-2">{label}</span>
        {hint && <span className="text-[11px] text-ink-3">{hint}</span>}
      </div>
      {children}
      {bar}
    </label>
  );
}

function Meter({ len, cls, max }: { len: number; cls: string; max: number }) {
  return (
    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
      <div className={cn("h-full rounded-full transition-all", cls)} style={{ width: `${Math.min(100, (len / max) * 100)}%` }} />
    </div>
  );
}
