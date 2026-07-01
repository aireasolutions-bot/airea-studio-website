import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CalendarClock,
  Check,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Loader2,
  Pencil,
  Rocket,
  Search,
  Sparkles,
  Trash2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Markdown } from "@/components/Markdown";
import { logEvent } from "../activity/client";
import {
  BLOG_CATEGORIES,
  deletePost,
  generateBlog,
  getSettings,
  listPosts,
  saveSettings,
  setStatus,
  updatePost,
  type AdminBlogPost,
  type BlogSettings,
  type BlogStatus,
} from "../blog/client";

const GEN_PHASES = [
  { icon: Globe, label: "Researching the web for current facts + sources…" },
  { icon: FileText, label: "Outlining the article around search intent…" },
  { icon: Wand2, label: "Writing on-brand, genuinely useful copy…" },
  { icon: Search, label: "Optimizing the title, meta + internal links…" },
  { icon: Check, label: "Saving your post…" },
];

function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        on ? "bg-blue" : "bg-ink/15",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span className={cn("inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}

function StatusChip({ status }: { status: BlogStatus }) {
  const map: Record<BlogStatus, string> = {
    published: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    draft: "bg-amber-50 text-amber-700 ring-amber-600/20",
    scheduled: "bg-blue-mist text-blue-ink ring-blue-600/20",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset", map[status])}>
      {status}
    </span>
  );
}

export function Blog() {
  const [posts, setPosts] = useState<AdminBlogPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // composer
  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [phase, setPhase] = useState(0);

  // settings
  const [settings, setSettings] = useState<BlogSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [themeInput, setThemeInput] = useState("");

  // list
  const [tab, setTab] = useState<"all" | "draft" | "published">("all");
  const [query, setQuery] = useState("");

  // editor
  const [editing, setEditing] = useState<AdminBlogPost | null>(null);

  const flash = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    window.setTimeout(() => setToast(null), 4200);
  };

  const load = async () => {
    try {
      const [p, s] = await Promise.all([listPosts(), getSettings()]);
      setPosts(p);
      setSettings(s);
    } catch (e: any) {
      setError(e?.message || "Couldn't load the blog workspace.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // animate the generation phases
  useEffect(() => {
    if (!generating) return;
    setPhase(0);
    const id = window.setInterval(() => setPhase((p) => Math.min(p + 1, GEN_PHASES.length - 1)), 7000);
    return () => window.clearInterval(id);
  }, [generating]);

  const onGenerate = async () => {
    setGenerating(true);
    setError(null);
    const started = Date.now();
    try {
      const { post, searchUsed, sources } = await generateBlog({
        topic: topic.trim() || undefined,
        keyword: keyword.trim() || undefined,
        autopublish: publishNow,
      });
      setPosts((prev) => [post, ...(prev || [])]);
      setTopic("");
      setKeyword("");
      logEvent({
        action: "blog.generate",
        category: "content",
        target: post.slug,
        targetType: "blog",
        summary: `${publishNow ? "Published" : "Drafted"} blog: ${post.title}`,
        durationMs: Date.now() - started,
        metadata: { searchUsed, sources },
      });
      flash("ok", `${publishNow ? "Published" : "Drafted"} “${post.title}”${searchUsed ? ` · ${sources} sources` : ""}`);
      setEditing(post);
    } catch (e: any) {
      flash("err", e?.message || "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const onSaveSettings = async (patch: Partial<BlogSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    setSavingSettings(true);
    try {
      await saveSettings(patch);
      logEvent({ action: "blog.settings", category: "content", summary: "Updated blog autopilot settings", metadata: patch });
    } catch (e: any) {
      flash("err", e?.message || "Couldn't save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const addTheme = () => {
    const t = themeInput.trim();
    if (!t || !settings) return;
    const themes = [...(settings.themes || []), t];
    setThemeInput("");
    onSaveSettings({ themes });
  };
  const removeTheme = (t: string) => {
    if (!settings) return;
    onSaveSettings({ themes: (settings.themes || []).filter((x) => x !== t) });
  };

  const onToggleStatus = async (post: AdminBlogPost) => {
    const next: BlogStatus = post.status === "published" ? "draft" : "published";
    try {
      const updated = await setStatus(post.id, next);
      setPosts((prev) => (prev || []).map((p) => (p.id === post.id ? updated : p)));
      logEvent({
        action: next === "published" ? "blog.publish" : "blog.unpublish",
        category: "content",
        target: post.slug,
        targetType: "blog",
        summary: `${next === "published" ? "Published" : "Unpublished"} blog: ${post.title}`,
      });
      flash("ok", next === "published" ? "Published — live on the site." : "Moved back to draft.");
    } catch (e: any) {
      flash("err", e?.message || "Couldn't update status.");
    }
  };

  const onDelete = async (post: AdminBlogPost) => {
    if (!window.confirm(`Delete “${post.title}”? This can't be undone.`)) return;
    try {
      await deletePost(post.id);
      setPosts((prev) => (prev || []).filter((p) => p.id !== post.id));
      logEvent({ action: "blog.delete", category: "content", target: post.slug, targetType: "blog", summary: `Deleted blog: ${post.title}` });
      flash("ok", "Post deleted.");
    } catch (e: any) {
      flash("err", e?.message || "Couldn't delete.");
    }
  };

  const filtered = useMemo(() => {
    let list = posts || [];
    if (tab !== "all") list = list.filter((p) => p.status === tab);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => (p.title + " " + (p.category || "") + " " + (p.keywords || "")).toLowerCase().includes(q));
    return list;
  }, [posts, tab, query]);

  const counts = useMemo(() => {
    const p = posts || [];
    return { all: p.length, draft: p.filter((x) => x.status === "draft").length, published: p.filter((x) => x.status === "published").length };
  }, [posts]);

  const PhaseIcon = GEN_PHASES[phase].icon;

  return (
    <div className="space-y-8">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue">
            <Sparkles className="h-5 w-5" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.16em]">AIREA Blog Agent</span>
          </div>
          <h1 className="mt-2 font-display text-[clamp(26px,3vw,36px)] tracking-[-0.01em] text-ink">The content engine</h1>
          <p className="mt-1.5 max-w-2xl text-[14.5px] text-ink-2">
            Research-backed, SEO-rich articles on AI + marketing — written on brand, cited from live sources, and linked back to the platform. Review before publishing, or let it run on autopilot.
          </p>
        </div>
        <div className="flex gap-2 text-center">
          {[
            { k: "Published", v: counts.published },
            { k: "Drafts", v: counts.draft },
          ].map((s) => (
            <div key={s.k} className="rounded-2xl border border-line bg-white px-4 py-2.5">
              <div className="font-display text-2xl text-ink">{s.v}</div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{s.k}</div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* compose + autopilot */}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* composer */}
        <div className="relative overflow-hidden rounded-3xl border border-line bg-white p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-mist/50 blur-3xl" />
          <div className="relative">
            <h2 className="flex items-center gap-2 font-display text-xl text-ink">
              <Wand2 className="h-5 w-5 text-blue" /> Write a new post
            </h2>
            <p className="mt-1 text-[13.5px] text-ink-2">Give it a topic or keyword — or leave both blank and AIREA will pick something timely.</p>

            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">Topic <span className="font-normal text-ink-3">(optional)</span></label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={2}
                  disabled={generating}
                  placeholder="e.g. How small businesses can use AI to plan a month of social content in an afternoon"
                  className="w-full resize-none rounded-2xl border border-line-2 bg-canvas px-4 py-3 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-blue"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">Target keyword <span className="font-normal text-ink-3">(optional)</span></label>
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  disabled={generating}
                  placeholder="e.g. ai marketing for small business"
                  className="w-full rounded-2xl border border-line-2 bg-canvas px-4 py-3 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-blue"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-line-2 bg-canvas px-4 py-3">
                <div>
                  <div className="text-[13.5px] font-semibold text-ink">{publishNow ? "Publish immediately" : "Save as draft"}</div>
                  <div className="text-[12px] text-ink-3">{publishNow ? "Goes live the moment it's ready." : "Review + edit before it goes live."}</div>
                </div>
                <Toggle on={publishNow} onChange={setPublishNow} disabled={generating} />
              </div>
            </div>

            {generating ? (
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-blue/20 bg-blue-mist/40 px-4 py-3.5">
                <PhaseIcon className="h-5 w-5 shrink-0 animate-pulse text-blue" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium text-blue-ink">{GEN_PHASES[phase].label}</div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-blue/15">
                    <div className="h-full rounded-full bg-blue transition-all duration-700" style={{ width: `${((phase + 1) / GEN_PHASES.length) * 100}%` }} />
                  </div>
                </div>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue" />
              </div>
            ) : (
              <button
                onClick={onGenerate}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_30px_-10px_rgba(0,71,255,0.65)] transition-all hover:bg-blue-ink"
              >
                <Sparkles className="h-5 w-5" /> Generate article
              </button>
            )}
            <p className="mt-2.5 text-center text-[11.5px] text-ink-3">Deep research + writing takes ~30–90 seconds. Runs on the deployed site.</p>
          </div>
        </div>

        {/* autopilot */}
        <div className="rounded-3xl border border-line bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-xl text-ink">
              <Zap className="h-5 w-5 text-blue" /> Autopilot
            </h2>
            {settings && <Toggle on={settings.enabled} onChange={(v) => onSaveSettings({ enabled: v })} disabled={savingSettings} />}
          </div>
          <p className="mt-1 text-[13.5px] text-ink-2">
            {settings?.enabled ? "AIREA is publishing on a schedule." : "Turn on to have AIREA research + write automatically."}
          </p>

          {!settings ? (
            <div className="mt-6 h-40 animate-pulse rounded-2xl bg-ink/[0.04]" />
          ) : (
            <div className={cn("mt-5 space-y-4 transition-opacity", !settings.enabled && "opacity-60")}>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[12px] font-semibold text-ink-2">Posts per week</span>
                  <select
                    value={settings.frequency_per_week}
                    onChange={(e) => onSaveSettings({ frequency_per_week: Number(e.target.value) })}
                    className="w-full rounded-xl border border-line-2 bg-canvas px-3 py-2.5 text-[14px] text-ink outline-none focus:border-blue"
                  >
                    {[1, 2, 3, 5, 7].map((n) => (
                      <option key={n} value={n}>{n}× / week</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] font-semibold text-ink-2">Min. words</span>
                  <input
                    type="number"
                    min={600}
                    step={100}
                    value={settings.min_words}
                    onChange={(e) => onSaveSettings({ min_words: Number(e.target.value) })}
                    className="w-full rounded-xl border border-line-2 bg-canvas px-3 py-2.5 text-[14px] text-ink outline-none focus:border-blue"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-line-2 bg-canvas px-4 py-3">
                <div>
                  <div className="text-[13px] font-semibold text-ink">Auto-publish</div>
                  <div className="text-[11.5px] text-ink-3">{settings.autopublish ? "Posts go live automatically." : "Posts wait as drafts for review."}</div>
                </div>
                <Toggle on={settings.autopublish} onChange={(v) => onSaveSettings({ autopublish: v })} disabled={savingSettings} />
              </div>

              <div>
                <span className="mb-1.5 block text-[12px] font-semibold text-ink-2">Preferred themes <span className="font-normal text-ink-3">(rotates through these)</span></span>
                <div className="flex flex-wrap gap-1.5">
                  {(settings.themes || []).map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-blue-mist px-2.5 py-1 text-[12px] font-medium text-blue-ink">
                      {t}
                      <button onClick={() => removeTheme(t)} className="text-blue-ink/60 hover:text-blue-ink">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {(settings.themes || []).length === 0 && <span className="text-[12.5px] text-ink-3">None yet — AIREA picks freely.</span>}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={themeInput}
                    onChange={(e) => setThemeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTheme())}
                    placeholder="Add a theme + Enter"
                    className="w-full rounded-xl border border-line-2 bg-canvas px-3 py-2 text-[13px] text-ink outline-none focus:border-blue"
                  />
                  <button onClick={addTheme} className="rounded-xl border border-line-2 px-3 py-2 text-[13px] font-semibold text-ink hover:border-ink-3">Add</button>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-ink/[0.03] px-3 py-2 text-[12px] text-ink-3">
                <CalendarClock className="h-3.5 w-3.5" />
                {settings.last_run_at ? `Last auto-run ${timeAgo(settings.last_run_at)}.` : "No auto-run yet."} Runs daily, paced to your cadence.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* posts */}
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-full border border-line bg-white p-1">
            {(["all", "draft", "published"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors",
                  tab === t ? "bg-blue text-white" : "text-ink-2 hover:text-ink"
                )}
              >
                {t} <span className={cn("ml-0.5", tab === t ? "text-white/70" : "text-ink-3")}>{counts[t]}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-line-2 bg-white px-3.5 py-2">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts…"
              className="w-44 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-3"
            />
          </div>
        </div>

        {posts === null ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-ink/[0.04]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line-2 bg-white p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-ink-3" />
            <p className="mt-3 font-medium text-ink">{query ? "No posts match your search." : "No posts yet."}</p>
            <p className="text-[13.5px] text-ink-3">{query ? "Try a different term." : "Generate your first article above."}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            {filtered.map((post, i) => (
              <div
                key={post.id}
                className={cn("flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-canvas", i > 0 && "border-t border-line")}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusChip status={post.status} />
                    {post.category && <span className="text-[11.5px] font-medium text-blue-ink">{post.category}</span>}
                  </div>
                  <button onClick={() => setEditing(post)} className="mt-1 block truncate text-left text-[15px] font-semibold text-ink hover:text-blue">
                    {post.title}
                  </button>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] text-ink-3">
                    <span>{timeAgo(post.published_at || post.created_at)}</span>
                    {post.word_count ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{post.reading_minutes || 1} min · {post.word_count} words</span>
                      </>
                    ) : null}
                    {Array.isArray(post.sources) && post.sources.length > 0 && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{post.sources.length} sources</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {post.status === "published" && (
                    <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" title="View live" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-ink/5 hover:text-ink">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <button onClick={() => setEditing(post)} title="Edit" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-ink/5 hover:text-ink">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onToggleStatus(post)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors",
                      post.status === "published" ? "text-ink-2 hover:bg-ink/5" : "bg-blue text-white hover:bg-blue-ink"
                    )}
                  >
                    {post.status === "published" ? "Unpublish" : (<><Rocket className="h-3.5 w-3.5" /> Publish</>)}
                  </button>
                  <button onClick={() => onDelete(post)} title="Delete" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <PostEditor
          post={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setPosts((prev) => (prev || []).map((p) => (p.id === updated.id ? updated : p)));
            setEditing(updated);
            flash("ok", "Saved.");
          }}
          onFlash={flash}
        />
      )}

      {/* toast */}
      {toast && (
        <div className={cn("fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-[14px] font-medium text-white shadow-card", toast.kind === "ok" ? "bg-ink" : "bg-red-600")}>
          {toast.kind === "ok" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ---------------- Editor modal ----------------
function PostEditor({
  post,
  onClose,
  onSaved,
  onFlash,
}: {
  post: AdminBlogPost;
  onClose: () => void;
  onSaved: (p: AdminBlogPost) => void;
  onFlash: (k: "ok" | "err", m: string) => void;
}) {
  const [form, setForm] = useState({
    title: post.title || "",
    slug: post.slug || "",
    category: post.category || "",
    excerpt: post.excerpt || "",
    body: post.body || "",
    cover_image: post.cover_image || "",
    seo_title: post.seo_title || "",
    seo_description: post.seo_description || "",
    keywords: post.keywords || "",
    tags: (post.tags || []).join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"write" | "preview">("write");
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async (publish?: boolean) => {
    setSaving(true);
    try {
      const words = form.body.trim().split(/\s+/).filter(Boolean).length;
      const patch: Partial<AdminBlogPost> = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        category: form.category.trim() || null,
        excerpt: form.excerpt.trim() || null,
        body: form.body,
        cover_image: form.cover_image.trim() || null,
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
        keywords: form.keywords.trim() || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        word_count: words,
        reading_minutes: Math.max(1, Math.round(words / 220)),
      };
      if (publish) {
        patch.status = "published";
        patch.published_at = post.published_at || new Date().toISOString();
      }
      const updated = await updatePost(post.id, patch);
      logEvent({
        action: publish ? "blog.publish" : "blog.edit",
        category: "content",
        target: updated.slug,
        targetType: "blog",
        summary: `${publish ? "Published" : "Edited"} blog: ${updated.title}`,
      });
      onSaved(updated);
      if (publish) onFlash("ok", "Published — live on the site.");
    } catch (e: any) {
      onFlash("err", e?.message || "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  const titleLen = form.seo_title.length;
  const descLen = form.seo_description.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="my-4 w-full max-w-3xl overflow-hidden rounded-3xl border border-line bg-white shadow-card">
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <StatusChip status={post.status} />
            <h3 className="font-display text-lg text-ink">Edit post</h3>
          </div>
          <div className="flex items-center gap-2">
            {post.status === "published" && (
              <a href={`/blog/${form.slug}`} target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 rounded-full border border-line-2 px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:border-ink-3 sm:inline-flex">
                <Eye className="h-3.5 w-3.5" /> View
              </a>
            )}
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-ink/5 hover:text-ink">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="max-h-[calc(100vh-220px)] space-y-5 overflow-y-auto px-6 py-5">
          <Field label="Title">
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Slug" hint={`/blog/${form.slug || "…"}`}>
              <input value={form.slug} onChange={(e) => set("slug", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Category">
              <input list="blog-cats" value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls} />
              <datalist id="blog-cats">
                {BLOG_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </div>

          <Field label="Excerpt" hint="1–2 sentences, shown on cards + as the meta fallback">
            <textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} className={cn(inputCls, "resize-none")} />
          </Field>

          <Field label="Cover image URL" hint="Optional — paste an R2/CDN image URL">
            <input value={form.cover_image} onChange={(e) => set("cover_image", e.target.value)} placeholder="https://…" className={inputCls} />
          </Field>
          {form.cover_image && (
            <img src={form.cover_image} alt="" className="max-h-40 w-full rounded-xl border border-line object-cover" />
          )}

          {/* body write/preview */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-ink-2">Body (Markdown)</span>
              <div className="flex gap-1 rounded-lg border border-line p-0.5">
                {(["write", "preview"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn("rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize", view === v ? "bg-blue text-white" : "text-ink-2 hover:text-ink")}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {view === "write" ? (
              <textarea
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                rows={16}
                className={cn(inputCls, "resize-y font-mono text-[13px] leading-relaxed")}
              />
            ) : (
              <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-line bg-canvas px-5 py-4">
                <Markdown content={form.body} />
              </div>
            )}
          </div>

          {/* SEO */}
          <div className="rounded-2xl border border-line bg-canvas p-4">
            <div className="mb-3 flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-wide text-ink-3">
              <Search className="h-3.5 w-3.5" /> Search &amp; social
            </div>
            <div className="space-y-4">
              <Field label="SEO title" hint={`${titleLen}/60`} warn={titleLen > 60}>
                <input value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Meta description" hint={`${descLen}/160`} warn={descLen > 160}>
                <textarea value={form.seo_description} onChange={(e) => set("seo_description", e.target.value)} rows={2} className={cn(inputCls, "resize-none")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Keywords" hint="comma-separated">
                  <input value={form.keywords} onChange={(e) => set("keywords", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Tags" hint="comma-separated">
                  <input value={form.tags} onChange={(e) => set("tags", e.target.value)} className={inputCls} />
                </Field>
              </div>
            </div>
          </div>

          {Array.isArray(post.sources) && post.sources.length > 0 && (
            <details className="rounded-2xl border border-line bg-canvas p-4">
              <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-2">Researched sources ({post.sources.length})</summary>
              <ul className="mt-3 space-y-1.5">
                {post.sources.map((s, i) => (
                  <li key={i} className="truncate text-[12.5px]">
                    <a href={s.url} target="_blank" rel="noreferrer" className="text-blue hover:underline">{s.title || s.url}</a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line bg-paper px-6 py-4">
          <button onClick={onClose} className="text-[13.5px] font-medium text-ink-2 hover:text-ink">Cancel</button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="rounded-full border border-line-2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink hover:border-ink-3 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-soft hover:bg-blue-ink disabled:opacity-50"
            >
              <Rocket className="h-4 w-4" /> {post.status === "published" ? "Save + keep live" : "Publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-line-2 bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-blue";

function Field({ label, hint, warn, children }: { label: string; hint?: string; warn?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-ink-2">{label}</span>
        {hint && <span className={cn("text-[11.5px]", warn ? "font-semibold text-amber-600" : "text-ink-3")}>{hint}</span>}
      </div>
      {children}
    </label>
  );
}
