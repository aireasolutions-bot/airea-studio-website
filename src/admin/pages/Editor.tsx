import { useEffect, useMemo, useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  GripVertical,
  ImageIcon,
  LayoutTemplate,
  Link2,
  Loader2,
  Monitor,
  MousePointerClick,
  RefreshCw,
  Rocket,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import { resolveAsset, parseLink, type CtaLink } from "@/content/ContentProvider";
import blocksData from "@/content/blocks.json";
import { mergePages, pageLabel, pagePath, SITE_PAGES } from "@/lib/pages";
import { SIGN_UP_URL, SIGN_IN_URL } from "@/lib/site";
import { entryKey, resolveLayout, sectionLabel, type LayoutEntry } from "@/lib/sections";
import { useAdminAuth } from "../auth";
import { AssetPicker } from "../AssetPicker";

type Block = {
  key: string;
  page: string;
  section: string | null;
  label: string | null;
  type: string;
  draft_value: string | null;
  published_value: string | null;
  sort: number;
};

// Baked-in defaults (same source the live site falls back to) — used when a
// key has no row in the database yet.
const DEFAULTS: Record<string, string> = Object.fromEntries(
  (blocksData as { key: string; value: string }[]).map((b) => [b.key, b.value])
);

const DEVICE_W = { desktop: 1280, tablet: 834, mobile: 390 } as const;
type Device = keyof typeof DEVICE_W;

const SECTION_KEYS = ["stats", "agent", "onephoto", "film", "howitworks", "branddna", "channels", "deploy", "wall", "usecases", "testimonials", "pricing"];
type Template = { name: string; tag: string; on: "all" | string[] };
const TEMPLATES: Template[] = [
  { name: "Full Story", tag: "The complete narrative", on: "all" },
  { name: "Conversion", tag: "Straight to signup", on: ["stats", "onephoto", "pricing"] },
  { name: "Product Tour", tag: "Show how it works", on: ["agent", "onephoto", "film", "howitworks", "branddna", "channels"] },
  { name: "Social Proof", tag: "Lead with results", on: ["stats", "wall", "usecases", "testimonials", "pricing"] },
  { name: "Minimal", tag: "Less is more", on: ["onephoto", "pricing"] },
];
const inTemplate = (t: Template, k: string) => t.on === "all" || t.on.includes(k);

// Destinations offered in the URL quick-pick (any URL can still be typed).
const QUICK_LINKS: { label: string; href: string }[] = [
  { label: "App — Sign up", href: SIGN_UP_URL },
  { label: "App — Log in", href: SIGN_IN_URL },
  ...SITE_PAGES.map((p) => ({ label: `Page — ${p.label}`, href: p.path })),
  { label: "Home § One photo", href: "/#campaign" },
  { label: "Home § The Wall", href: "/#wall" },
  { label: "Home § Final CTA", href: "/#cta" },
];

// Derive row metadata for keys created on the fly (canvas edits, links, layouts).
function deriveRow(key: string, type: string, fallbackPage: string): Omit<Block, "draft_value" | "published_value"> {
  const parts = key.split(".");
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  if (parts[0] === "layout") {
    return { key, page: parts[1] ?? fallbackPage, section: "Page structure", label: "Section order & visibility", type: "layout", sort: 0 };
  }
  const pageMap: Record<string, string> = {
    home: "home", pricing: "pricing", sb: "small-business", ec: "ecommerce",
    howitworks: "how-it-works", faq: "faq", global: "global", sec: fallbackPage,
  };
  return {
    key,
    page: pageMap[parts[0]] ?? fallbackPage,
    section: parts[1] ? cap(parts[1]) : "General",
    label: cap(parts.slice(1).join(" ").replace(/[._]/g, " ")) || key,
    type,
    sort: 900,
  };
}

export function Editor() {
  const { email } = useAdminAuth();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [published, setPublished] = useState<Record<string, string>>({});
  const [page, setPage] = useState("home");
  const [device, setDevice] = useState<Device>("desktop");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState("");
  const [picker, setPicker] = useState<{ key: string; kind: "image" | "video" } | null>(null);
  const [editOnCanvas, setEditOnCanvas] = useState(true);
  const [editing, setEditing] = useState<{ key: string; type: string; value: string; x: number; y: number; link?: CtaLink } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const [pane, setPane] = useState({ w: 0, h: 0 });
  const timers = useRef<Record<string, number>>({});
  const draftRef = useRef<Record<string, string>>({});
  const blocksRef = useRef<Block[]>([]);
  const scaleRef = useRef(1);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase.from("content_blocks").select("*").order("page").order("sort");
      const list = (data as Block[]) ?? [];
      setBlocks(list);
      setDraft(Object.fromEntries(list.map((b) => [b.key, String(b.draft_value ?? "")])));
      setPublished(Object.fromEntries(list.map((b) => [b.key, String(b.published_value ?? "")])));
    })();
  }, []);

  useEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const update = () => setPane({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pages = useMemo(
    () => mergePages(blocks.map((b) => b.page)).map((p) => p.slug).filter((p) => p !== "global").concat(blocks.some((b) => b.page === "global") || DEFAULTS["global.nav.cta_link"] ? ["global"] : []),
    [blocks]
  );

  // Once the Pricing Studio manages pricing (pricing.data row exists), its
  // legacy per-key fields disappear from this panel in favor of the Studio.
  const pricingManaged = useMemo(() => blocks.some((b) => b.key === "pricing.data"), [blocks]);

  // Field groups for the current page. Structure rows (section toggles, layouts)
  // are managed by the Structure panel, not shown as raw fields.
  const sections = useMemo(() => {
    const map = new Map<string, Block[]>();
    blocks
      .filter((b) => b.page === page && b.type !== "section" && b.type !== "layout" && b.type !== "json")
      .filter(
        (b) =>
          !(
            pricingManaged &&
            (b.key.startsWith("pricing.plan") || b.key.startsWith("pricing.compare.row") || b.key === "pricing.card.badge")
          )
      )
      .forEach((b) => map.set(b.section ?? "General", [...(map.get(b.section ?? "General") ?? []), b]));
    return Array.from(map.entries());
  }, [blocks, page, pricingManaged]);

  const dirtyKeys = useMemo(() => Object.keys(draft).filter((k) => draft[k] !== (published[k] ?? "")), [draft, published]);

  draftRef.current = draft;
  blocksRef.current = blocks;
  const previewSrc = `${pagePath(page)}?preview=1${editOnCanvas ? "&edit=1" : ""}`;
  const refreshPreview = () => iframeRef.current?.contentWindow?.postMessage({ type: "airea-refresh-content" }, "*");

  // Write one key's draft value, creating the content row on first write so any
  // key (canvas edits, links, layouts) is editable without pre-seeding.
  const writeBlock = async (key: string, value: string, type: string) => {
    if (!supabase) return;
    if (blocksRef.current.some((b) => b.key === key)) {
      await supabase.from("content_blocks").update({ draft_value: value, updated_by: email }).eq("key", key);
    } else {
      const row: Block = { ...deriveRow(key, type, page), draft_value: value, published_value: null };
      await supabase.from("content_blocks").insert(row as any);
      setBlocks((b) => [...b, row]);
      setPublished((p) => ({ ...p, [key]: "" }));
    }
  };

  // Debounced single-field edit (typing in the panel).
  const onEdit = (key: string, value: string, type = "text") => {
    setDraft((d) => ({ ...d, [key]: value }));
    setStatus("saving");
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(async () => {
      await writeBlock(key, value, type);
      setStatus("saved");
      refreshPreview();
      window.setTimeout(() => setStatus("idle"), 1200);
    }, 400);
  };

  // Immediate multi-key write (canvas saves, structure ops, templates).
  const writeMany = async (updates: Record<string, { value: string; type: string }>) => {
    setDraft((d) => ({ ...d, ...Object.fromEntries(Object.entries(updates).map(([k, u]) => [k, u.value])) }));
    setStatus("saving");
    for (const [k, u] of Object.entries(updates)) await writeBlock(k, u.value, u.type);
    setStatus("saved");
    refreshPreview();
    window.setTimeout(() => setStatus("idle"), 1200);
  };

  const saveBlock = (key: string, value: string, type: string) => writeMany({ [key]: { value, type } });

  // Listen for clicks coming from the visual-edit overlay inside the preview.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== "airea-edit-click") return;
      const { key, editType, value, rect } = e.data;
      if (editType === "image" || editType === "video") {
        setEditing(null);
        setPicker({ key, kind: editType === "video" ? "video" : "image" });
        return;
      }
      const ib = iframeRef.current?.getBoundingClientRect();
      setEditing({
        key,
        type: editType,
        value: draftRef.current[key] ?? value ?? "",
        link: editType === "cta" ? parseLink(draftRef.current[`${key}_link`] ?? DEFAULTS[`${key}_link`], "") : undefined,
        x: (ib?.left ?? 0) + rect.left * scaleRef.current,
        y: (ib?.top ?? 0) + (rect.top + rect.height) * scaleRef.current,
      });
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const publish = async () => {
    if (!supabase || dirtyKeys.length === 0) return;
    setPublishing(true);
    await Promise.all(dirtyKeys.map((k) => supabase!.from("content_blocks").update({ published_value: draft[k] }).eq("key", k)));
    await supabase.from("publish_log").insert({
      summary: `Published ${dirtyKeys.length} change${dirtyKeys.length > 1 ? "s" : ""}`,
      changed_keys: dirtyKeys,
      status: "success",
      published_by: email,
    });
    setPublished((p) => ({ ...p, ...Object.fromEntries(dirtyKeys.map((k) => [k, draft[k]])) }));
    setPublishing(false);
    setToast("Published — your changes are live.");
    window.setTimeout(() => setToast(""), 3500);
  };

  /* ---------- structure (order + show/hide), all pages ---------- */

  const layoutKey = `layout.${page}`;
  const layoutRaw = draft[layoutKey] ?? DEFAULTS[layoutKey];
  const savedEntries = useMemo(() => resolveLayout(page, layoutRaw), [page, layoutRaw]);
  // While dragging, reorders buffer locally and commit once on drag end —
  // otherwise every intermediate swap would hit the database.
  const [dragEntries, setDragEntries] = useState<LayoutEntry[] | null>(null);
  const dragRef = useRef<LayoutEntry[] | null>(null);
  dragRef.current = dragEntries;
  useEffect(() => setDragEntries(null), [page]);
  const entries = dragEntries ?? savedEntries;

  const isHidden = (e: LayoutEntry) =>
    !!e.hidden || (page === "home" && !!e.id && draft[`section.home.${e.id}`] === "false");

  const writeLayout = (next: LayoutEntry[]) => {
    const updates: Record<string, { value: string; type: string }> = {
      [layoutKey]: { value: JSON.stringify(next), type: "layout" },
    };
    // Keep the home page's legacy per-section toggles in sync (they still gate
    // the live site until every layout is republished through this system).
    if (page === "home") {
      for (const e of next) {
        if (e.id && SECTION_KEYS.includes(e.id)) {
          updates[`section.home.${e.id}`] = { value: e.hidden ? "false" : "true", type: "section" };
        }
      }
    }
    writeMany(updates);
  };

  const toggleEntry = (key: string) => {
    const next = entries.map((e) => (entryKey(e) === key ? { ...e, hidden: !isHidden(e) } : e));
    writeLayout(next);
  };

  const reorderEntries = (keys: string[]) => {
    const byKey = new Map(entries.map((e) => [entryKey(e), e]));
    setDragEntries(keys.map((k) => byKey.get(k)!).filter(Boolean));
  };

  const commitReorder = () => {
    const next = dragRef.current;
    setDragEntries(null);
    if (next) writeLayout(next);
  };

  const layoutDirty = (draft[layoutKey] ?? "") !== (published[layoutKey] ?? "");

  const applyTemplate = (t: Template) => {
    const next = entries.map((e) =>
      e.id && SECTION_KEYS.includes(e.id) ? { ...e, hidden: !inTemplate(t, e.id) } : e
    );
    writeLayout(next);
    setToast(`Applied the “${t.name}” layout — preview updated.`);
    window.setTimeout(() => setToast(""), 3000);
  };

  // scaled preview math
  const dw = DEVICE_W[device];
  const innerW = Math.max(0, pane.w - 24);
  const innerH = Math.max(0, pane.h - 24);
  const scale = innerW ? Math.min(1, innerW / dw) : 0.5;
  const frameH = scale ? innerH / scale : 600;
  scaleRef.current = scale;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">Content</p>
          <h1 className="mt-1 font-display text-[clamp(26px,3.4vw,38px)] tracking-tight text-ink">Site editor</h1>
          <p className="mt-1 text-[14px] text-ink-2">Edit copy, buttons &amp; links, images, video, and page structure. Changes preview live — publish when ready.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] text-ink-3">
            {status === "saving" ? "Saving…" : status === "saved" ? "All changes saved" : dirtyKeys.length ? `${dirtyKeys.length} unpublished` : "Up to date"}
          </span>
          <button
            onClick={publish}
            disabled={publishing || dirtyKeys.length === 0}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-soft transition-colors",
              dirtyKeys.length === 0 ? "cursor-not-allowed bg-ink-3" : "bg-blue hover:bg-blue-ink"
            )}
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Publish{dirtyKeys.length ? ` (${dirtyKeys.length})` : ""}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-1 rounded-2xl border border-line bg-white p-1 w-fit">
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={cn("rounded-xl px-3.5 py-1.5 text-[13px] font-semibold transition-colors", page === p ? "bg-blue text-white" : "text-ink-2 hover:text-ink")}
          >
            {p === "global" ? "Global (nav & footer)" : pageLabel(p)}
          </button>
        ))}
      </div>

      {page === "home" && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-blue" />
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Page templates</h3>
          </div>
          <p className="mb-4 mt-1 text-[13px] text-ink-2">
            Apply a starting layout — it sets which sections appear. Preview live, fine-tune in Page structure below, then publish.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => applyTemplate(t)}
                className="group rounded-xl border border-line-2 bg-canvas p-3 text-left transition-all hover:-translate-y-0.5 hover:border-blue hover:shadow-card"
              >
                <div className="mb-2.5 flex flex-col gap-1 rounded-lg bg-white p-2 ring-1 ring-line">
                  <span className="h-3 rounded-sm bg-blue" />
                  {SECTION_KEYS.map((k) => (
                    <span key={k} className={cn("h-1.5 rounded-sm transition-colors", inTemplate(t, k) ? "bg-blue/40" : "bg-line-2")} />
                  ))}
                  <span className="h-2.5 rounded-sm bg-ink" />
                </div>
                <div className="text-[12.5px] font-semibold text-ink">{t.name}</div>
                <div className="text-[11px] text-ink-3">{t.tag}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* fields */}
        <div className="space-y-5">
          {/* page structure — every page */}
          {page !== "global" && entries.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Page structure</h3>
                {layoutDirty && <span className="rounded-full bg-blue-mist px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-ink">unpublished</span>}
              </div>
              <p className="mb-3 text-[12.5px] text-ink-3">Drag to reorder · eye to show/hide</p>
              <Reorder.Group axis="y" values={entries.map(entryKey)} onReorder={reorderEntries} className="space-y-1.5">
                {entries.map((e) => (
                  <StructureRow
                    key={entryKey(e)}
                    id={entryKey(e)}
                    label={sectionLabel(page, e)}
                    hidden={isHidden(e)}
                    onToggle={() => toggleEntry(entryKey(e))}
                    onDragEnd={commitReorder}
                  />
                ))}
              </Reorder.Group>
            </div>
          )}

          {page === "pricing" && pricingManaged && (
            <a
              href="/admin/pricing"
              className="flex items-center justify-between gap-3 rounded-2xl border border-blue/30 bg-blue-mist/40 p-4 transition-colors hover:border-blue"
            >
              <div>
                <div className="text-[13.5px] font-semibold text-ink">Plans &amp; comparison → Pricing Studio</div>
                <div className="text-[12.5px] text-ink-2">Add/remove plans, edit the table, and publish from the dedicated studio.</div>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-blue" />
            </a>
          )}

          {sections.map(([section, items]) => (
            <div key={section} className="rounded-2xl border border-line bg-white p-5 shadow-soft">
              <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-ink-3">{section}</h3>
              <div className="space-y-4">
                {items.map((b) => {
                  const dirty = draft[b.key] !== (published[b.key] ?? "");
                  return (
                    <div key={b.key}>
                      <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
                        {b.type === "link" && <Link2 className="h-3.5 w-3.5 text-ink-3" />}
                        {b.label}
                        {dirty && (
                          <span className="rounded-full bg-blue-mist px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-ink">unpublished</span>
                        )}
                      </div>
                      {b.type === "image" || b.type === "video" ? (
                        <div className="flex items-center gap-3 rounded-xl border border-line-2 bg-canvas p-2">
                          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white text-ink-3">
                            {draft[b.key] ? (
                              b.type === "video" ? (
                                <video src={resolveAsset(draft[b.key])} muted className="h-full w-full object-cover" />
                              ) : (
                                <img src={resolveAsset(draft[b.key])} alt="" className="h-full w-full object-cover" />
                              )
                            ) : b.type === "video" ? (
                              <Film className="h-5 w-5" />
                            ) : (
                              <ImageIcon className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 truncate text-[12px] text-ink-2">{draft[b.key]?.split("/").pop() || "None"}</div>
                          <button
                            onClick={() => setPicker({ key: b.key, kind: b.type as "image" | "video" })}
                            className="rounded-full border border-line-2 px-3.5 py-2 text-[12.5px] font-semibold text-ink hover:border-ink-3"
                          >
                            Change
                          </button>
                        </div>
                      ) : b.type === "link" ? (
                        <LinkField
                          value={parseLink(draft[b.key], "")}
                          onChange={(l) => onEdit(b.key, JSON.stringify(l), "link")}
                        />
                      ) : b.type === "richtext" ? (
                        <textarea
                          data-key={b.key}
                          value={draft[b.key] ?? ""}
                          onChange={(e) => onEdit(b.key, e.target.value, b.type)}
                          rows={3}
                          className="w-full resize-y rounded-xl border border-line-2 bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-blue"
                        />
                      ) : (
                        <input
                          data-key={b.key}
                          value={draft[b.key] ?? ""}
                          onChange={(e) => onEdit(b.key, e.target.value, b.type)}
                          className="w-full rounded-xl border border-line-2 bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-blue"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* live preview */}
        <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Live preview · draft
              </span>
              <div className="flex items-center gap-2">
                <div className="flex rounded-full border border-line-2 p-0.5">
                  {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([d, Icon]) => (
                    <button
                      key={d}
                      onClick={() => setDevice(d)}
                      title={d}
                      className={cn("grid h-7 w-7 place-items-center rounded-full capitalize", device === d ? "bg-blue text-white" : "text-ink-3 hover:text-ink")}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setEditOnCanvas((v) => !v)}
                  title={editOnCanvas ? "Click-to-edit is on — click any element in the preview" : "Turn on click-to-edit"}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors",
                    editOnCanvas ? "bg-blue text-white shadow-soft" : "border border-line-2 text-ink-2 hover:text-ink"
                  )}
                >
                  <MousePointerClick className="h-3.5 w-3.5" /> Edit
                </button>
                <button onClick={refreshPreview} title="Refresh" className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 hover:bg-ink/5">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <a href={previewSrc} target="_blank" rel="noreferrer" title="Open in new tab" className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 hover:bg-ink/5">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <div ref={paneRef} className="relative flex flex-1 items-start justify-center overflow-hidden bg-paper p-3">
              <div
                style={{ width: dw * scale, height: innerH || 600 }}
                className={cn("overflow-hidden bg-canvas", device === "mobile" ? "rounded-[2rem] border-[6px] border-ink shadow-card" : "rounded-lg border border-line shadow-sm")}
              >
                <iframe
                  ref={iframeRef}
                  key={previewSrc}
                  src={previewSrc}
                  title="Preview"
                  style={{ width: dw, height: frameH, transform: `scale(${scale})`, transformOrigin: "top left", border: 0 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AssetPicker
        open={picker !== null}
        kind={picker?.kind ?? "image"}
        onClose={() => setPicker(null)}
        onSelect={(assetKey) => picker && saveBlock(picker.key, assetKey, picker.kind === "video" ? "video" : "image")}
      />

      {editing && (
        <>
          <div className="fixed inset-0 z-[59]" onClick={() => setEditing(null)} />
          <div
            className="fixed z-[60] w-[min(400px,92vw)] rounded-2xl border border-line bg-white p-3 shadow-card"
            style={{ left: Math.max(8, Math.min(editing.x, window.innerWidth - 412)), top: Math.max(8, Math.min(editing.y + 8, window.innerHeight - (editing.type === "cta" ? 330 : 210))) }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
                {editing.type === "cta" ? "Edit button" : "Edit"} · {editing.key.split(".").slice(-1)[0]}
              </span>
              <button onClick={() => setEditing(null)} className="grid h-6 w-6 shrink-0 place-items-center rounded text-ink-3 hover:bg-ink/5">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <textarea
              autoFocus
              value={editing.value}
              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  saveEditing();
                }
              }}
              rows={editing.type === "richtext" ? 4 : editing.type === "cta" ? 1 : 2}
              className="w-full resize-y rounded-xl border border-line-2 bg-canvas px-3 py-2 text-[14px] text-ink outline-none focus:border-blue"
            />
            {editing.type === "cta" && editing.link && (
              <div className="mt-2 space-y-2">
                <LinkField value={editing.link} onChange={(l) => setEditing({ ...editing, link: l })} />
              </div>
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10.5px] text-ink-3">⌘↵ to save</span>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="rounded-full border border-line-2 px-3 py-1.5 text-[12px] font-semibold text-ink hover:border-ink-3">
                  Cancel
                </button>
                <button
                  onClick={saveEditing}
                  className="rounded-full bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-ink"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-[13.5px] font-semibold text-white shadow-card">
          <Check className="h-4 w-4 text-green-400" />
          {toast}
        </div>
      )}
    </div>
  );

  function saveEditing() {
    if (!editing) return;
    const updates: Record<string, { value: string; type: string }> = {
      [editing.key]: { value: editing.value, type: editing.type === "cta" ? "text" : editing.type },
    };
    if (editing.type === "cta" && editing.link) {
      updates[`${editing.key}_link`] = { value: JSON.stringify(editing.link), type: "link" };
    }
    writeMany(updates);
    setEditing(null);
  }
}

/* One row in the Structure panel — drags only from its grip handle so the
 * show/hide button stays cleanly clickable. */
function StructureRow({ id, label, hidden, onToggle, onDragEnd }: { id: string; label: string; hidden: boolean; onToggle: () => void; onDragEnd: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className={cn("flex select-none items-center gap-2.5 rounded-xl border bg-canvas px-3 py-2.5", hidden ? "border-line-2 opacity-60" : "border-line-2")}
    >
      <span
        onPointerDown={(e) => {
          e.preventDefault();
          controls.start(e);
        }}
        className="grid shrink-0 cursor-grab touch-none place-items-center text-ink-3 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <span className={cn("flex-1 truncate text-[13.5px] font-medium", hidden ? "text-ink-3 line-through decoration-ink-3/50" : "text-ink")}>
        {label}
      </span>
      <button
        onClick={onToggle}
        title={hidden ? "Show section" : "Hide section"}
        className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors", hidden ? "text-ink-3 hover:bg-ink/5 hover:text-ink" : "text-blue hover:bg-blue-mist")}
      >
        {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </Reorder.Item>
  );
}

/* URL + visibility editor for a CTA link value. Empty URL = keep the site's
 * built-in destination for that button. */
function LinkField({ value, onChange }: { value: CtaLink; onChange: (l: CtaLink) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={value.href}
          placeholder="https://… or /page (empty = site default)"
          onChange={(e) => onChange({ ...value, href: e.target.value })}
          className="w-full rounded-xl border border-line-2 bg-canvas px-3.5 py-2.5 text-[13.5px] text-ink outline-none focus:border-blue"
        />
        <select
          value=""
          onChange={(e) => e.target.value && onChange({ ...value, href: e.target.value })}
          className="w-[124px] shrink-0 rounded-xl border border-line-2 bg-canvas px-2 py-2.5 text-[12.5px] text-ink-2 outline-none focus:border-blue"
          title="Quick pick a destination"
        >
          <option value="">Quick pick…</option>
          {QUICK_LINKS.map((q) => (
            <option key={q.label} value={q.href}>
              {q.label}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={() => onChange({ ...value, visible: !value.visible })}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-line-2 bg-canvas px-3.5 py-2 text-left"
      >
        <span className="text-[13px] font-medium text-ink">{value.visible ? "Button is shown" : "Button is hidden"}</span>
        <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", value.visible ? "bg-blue" : "bg-line-2")}>
          <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all", value.visible ? "left-[1.1rem]" : "left-0.5")} />
        </span>
      </button>
    </div>
  );
}
