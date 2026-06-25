import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ExternalLink, Film, ImageIcon, LayoutTemplate, Loader2, Monitor, MousePointerClick, RefreshCw, Rocket, Smartphone, Tablet, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import { resolveAsset } from "@/content/ContentProvider";
import { mergePages, pageLabel, pagePath } from "@/lib/pages";
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
  const [editing, setEditing] = useState<{ key: string; type: string; value: string; x: number; y: number } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const [pane, setPane] = useState({ w: 0, h: 0 });
  const timers = useRef<Record<string, number>>({});
  const draftRef = useRef<Record<string, string>>({});
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

  const pages = useMemo(() => mergePages(blocks.map((b) => b.page)).map((p) => p.slug), [blocks]);
  const sections = useMemo(() => {
    const map = new Map<string, Block[]>();
    blocks
      .filter((b) => b.page === page)
      .forEach((b) => map.set(b.section ?? "General", [...(map.get(b.section ?? "General") ?? []), b]));
    const entries = Array.from(map.entries());
    entries.sort((a, b) => (a[0].startsWith("Sections") ? -1 : b[0].startsWith("Sections") ? 1 : 0));
    return entries;
  }, [blocks, page]);

  const dirtyKeys = useMemo(() => Object.keys(draft).filter((k) => draft[k] !== published[k]), [draft, published]);

  draftRef.current = draft;
  const previewSrc = `${pagePath(page)}?preview=1${editOnCanvas ? "&edit=1" : ""}`;
  const refreshPreview = () => iframeRef.current?.contentWindow?.postMessage({ type: "airea-refresh-content" }, "*");

  const onEdit = (key: string, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setStatus("saving");
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(async () => {
      if (!supabase) return;
      await supabase.from("content_blocks").update({ draft_value: value, updated_by: email }).eq("key", key);
      setStatus("saved");
      refreshPreview();
      window.setTimeout(() => setStatus("idle"), 1200);
    }, 400);
  };

  const blockExists = (key: string) => blocks.some((b) => b.key === key);

  // Save from the visual canvas. Creates the content block on first edit (so any
  // tagged element is editable without pre-seeding), otherwise updates the draft.
  const saveBlock = async (key: string, value: string, type: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setStatus("saving");
    if (supabase) {
      if (blockExists(key)) {
        await supabase.from("content_blocks").update({ draft_value: value, updated_by: email }).eq("key", key);
      } else {
        const parts = key.split(".");
        const pageMap: Record<string, string> = { home: "home", pricing: "pricing", sb: "small-business", ec: "ecommerce", howitworks: "how-it-works", faq: "faq", global: "home" };
        const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
        const row: Block = {
          key,
          page: pageMap[parts[0]] ?? page,
          section: parts[1] ? cap(parts[1]) : "General",
          label: cap(parts.slice(1).join(" ").replace(/[._]/g, " ")) || key,
          type,
          draft_value: value,
          published_value: null,
          sort: 900,
        };
        await supabase.from("content_blocks").insert(row as any);
        setBlocks((b) => [...b, row]);
        setPublished((p) => ({ ...p, [key]: "" }));
      }
    }
    setStatus("saved");
    refreshPreview();
    window.setTimeout(() => setStatus("idle"), 1200);
  };

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

  const applyTemplate = async (t: Template) => {
    const updates: Record<string, string> = {};
    SECTION_KEYS.forEach((k) => (updates[`section.home.${k}`] = inTemplate(t, k) ? "true" : "false"));
    setDraft((d) => ({ ...d, ...updates }));
    setStatus("saving");
    if (supabase)
      await Promise.all(
        Object.entries(updates).map(([k, v]) => supabase!.from("content_blocks").update({ draft_value: v, updated_by: email }).eq("key", k))
      );
    setStatus("saved");
    refreshPreview();
    setToast(`Applied the “${t.name}” layout — preview updated.`);
    window.setTimeout(() => setToast(""), 3000);
    window.setTimeout(() => setStatus("idle"), 1200);
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
          <p className="mt-1 text-[14px] text-ink-2">Edit copy, CTAs, images, and video. Changes preview live — publish when ready.</p>
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
            {pageLabel(p)}
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
            Apply a starting layout — it sets which sections appear. Preview live, fine-tune the toggles below, then publish.
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
          {sections.map(([section, items]) => (
            <div key={section} className="rounded-2xl border border-line bg-white p-5 shadow-soft">
              <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-ink-3">{section}</h3>
              <div className="space-y-4">
                {items.map((b) => {
                  const dirty = draft[b.key] !== published[b.key];
                  if (b.type === "section") {
                    const visible = draft[b.key] !== "false";
                    return (
                      <button
                        key={b.key}
                        onClick={() => onEdit(b.key, visible ? "false" : "true")}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-line-2 bg-canvas px-3.5 py-2.5 text-left"
                      >
                        <span className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
                          {b.label}
                          {dirty && <span className="rounded-full bg-blue-mist px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-ink">unpublished</span>}
                        </span>
                        <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", visible ? "bg-blue" : "bg-line-2")}>
                          <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all", visible ? "left-[1.1rem]" : "left-0.5")} />
                        </span>
                      </button>
                    );
                  }
                  return (
                    <div key={b.key}>
                      <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
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
                      ) : b.type === "richtext" ? (
                        <textarea
                          data-key={b.key}
                          value={draft[b.key] ?? ""}
                          onChange={(e) => onEdit(b.key, e.target.value)}
                          rows={3}
                          className="w-full resize-y rounded-xl border border-line-2 bg-canvas px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-blue"
                        />
                      ) : (
                        <input
                          data-key={b.key}
                          value={draft[b.key] ?? ""}
                          onChange={(e) => onEdit(b.key, e.target.value)}
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
            className="fixed z-[60] w-[min(360px,92vw)] rounded-2xl border border-line bg-white p-3 shadow-card"
            style={{ left: Math.max(8, Math.min(editing.x, window.innerWidth - 372)), top: Math.max(8, Math.min(editing.y + 8, window.innerHeight - 210)) }}
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[10.5px] uppercase tracking-wider text-ink-3">Edit · {editing.key.split(".").slice(-1)[0]}</span>
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
                  saveBlock(editing.key, editing.value, editing.type);
                  setEditing(null);
                }
              }}
              rows={editing.type === "richtext" ? 4 : 2}
              className="w-full resize-y rounded-xl border border-line-2 bg-canvas px-3 py-2 text-[14px] text-ink outline-none focus:border-blue"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10.5px] text-ink-3">⌘↵ to save</span>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="rounded-full border border-line-2 px-3 py-1.5 text-[12px] font-semibold text-ink hover:border-ink-3">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    saveBlock(editing.key, editing.value, editing.type);
                    setEditing(null);
                  }}
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
}
