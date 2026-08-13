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
import { mergePages, pageLabel, pagePath, SITE_PAGES, HIDEABLE_PAGES, pageVisibleKey } from "@/lib/pages";
import { SIGN_UP_URL, SIGN_IN_URL } from "@/lib/site";
import { entryKey, resolveLayout, sectionLabel, type LayoutEntry } from "@/lib/sections";
import { TEMPLATES as SECTION_TEMPLATES, templateById, SHARED_SECTIONS, sharedById, type TemplateDef } from "@/sitebuilder/registry";
import { useAdminAuth } from "../auth";
import { AssetPicker } from "../AssetPicker";
import { runAgent, publishEdits, type AgentEdit, type ChatMsg } from "../agent/client";

// Element descriptor sent by the canvas when the team ⌥-clicks something.
type AiTarget = {
  tag: string;
  classes: string;
  editKey: string | null;
  section: string | null;
  text: string;
  imgSrc: string | null;
  path: string;
};

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
  if (parts[0] === "sec") {
    // Fields of an inserted gallery section: sec.<instanceId>.<field>
    return {
      key,
      page: fallbackPage,
      section: `Added section · ${parts[1]}`,
      label: cap(parts.slice(2).join(" ").replace(/[._]/g, " ")) || key,
      type,
      sort: 950,
    };
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
  const [liveSection, setLiveSection] = useState("");
  const fieldCardRefs = useRef<Map<string, HTMLElement>>(new Map());
  const pointerOverPreview = useRef(false);

  // "Fix with AI" — on-canvas component agent (⌥-click an element)
  const [aiTarget, setAiTarget] = useState<AiTarget | null>(null);
  const [aiMsgs, setAiMsgs] = useState<ChatMsg[]>([]);
  const [aiNotes, setAiNotes] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiStaged, setAiStaged] = useState<AgentEdit[]>([]);
  const [aiPublishing, setAiPublishing] = useState(false);
  const [aiLive, setAiLive] = useState<string | null>(null);

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
      .filter((b) => b.page === page && b.type !== "section" && b.type !== "layout" && b.type !== "json" && b.type !== "page")
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

  // Preview → panel scroll sync: highlight the structure row for the section
  // in view; when the user is actually scrolling the preview, follow along in
  // the fields column too (Campbell's "side nav scrolls with the section").
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const fieldsCardFor = (id: string, label: string): HTMLElement | undefined => {
    const nid = norm(id);
    const nlabel = norm(label);
    for (const [section, el] of fieldCardRefs.current) {
      const ns = norm(section);
      if (ns.includes(nid) || nid.includes(ns) || ns.includes(nlabel) || nlabel.includes(ns)) return el;
    }
    return undefined;
  };

  // Canvas → "Fix with AI": open the panel for the ⌥-clicked element.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== "airea-ai-select") return;
      setAiTarget(e.data.element as AiTarget);
      setAiMsgs([]);
      setAiNotes([]);
      setAiStaged([]);
      setAiLive(null);
      setAiInput("");
      setEditing(null);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const askAi = async (text: string) => {
    const q = text.trim();
    if (!q || !aiTarget || aiBusy) return;
    setAiInput("");
    setAiBusy(true);
    setAiNotes((n) => [...n, { role: "user", text: q }]);
    const content =
      aiMsgs.length === 0
        ? `On-canvas fix request from the visual editor.
Page: ${aiTarget.path}${aiTarget.section ? ` · Section id: "${aiTarget.section}"` : ""}
Selected element: <${aiTarget.tag}> ${aiTarget.classes ? `class="${aiTarget.classes}"` : ""}${aiTarget.editKey ? ` · content key: ${aiTarget.editKey}` : ""}${aiTarget.imgSrc ? ` · image src: ${aiTarget.imgSrc}` : ""}${aiTarget.text ? ` · text: "${aiTarget.text}"` : ""}

Task: ${q}

Locate this exact element in the source (search_code with its distinctive classes/text/key), make the MINIMAL edit that satisfies the task, and stage it. Do not publish. Keep every other element untouched.`
        : q;
    const nextMsgs: ChatMsg[] = [...aiMsgs, { role: "user", content }];
    setAiMsgs(nextMsgs);
    try {
      const res = await runAgent(nextMsgs, aiStaged.map((e) => ({ path: e.path, content: e.content })), "build");
      setAiMsgs((m) => [...m, { role: "assistant", content: res.reply || "Done." }]);
      setAiNotes((n) => [...n, { role: "assistant", text: res.reply || "Done." }]);
      if (res.edits?.length) {
        setAiStaged((prev) => {
          const byPath = new Map(prev.map((e) => [e.path, e]));
          for (const e of res.edits) byPath.set(e.path, e);
          return Array.from(byPath.values());
        });
      }
    } catch (e) {
      setAiNotes((n) => [...n, { role: "assistant", text: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setAiBusy(false);
    }
  };

  const publishAi = async () => {
    if (!aiStaged.length || aiPublishing) return;
    setAiPublishing(true);
    try {
      const first = aiNotes.find((n) => n.role === "user")?.text ?? "on-canvas fix";
      const res = await publishEdits(
        aiStaged.map((e) => ({ path: e.path, content: e.content })),
        `On-canvas fix: ${first.slice(0, 70)}`
      );
      setAiLive(res.url);
      setAiStaged([]);
    } catch (e) {
      setAiNotes((n) => [...n, { role: "assistant", text: `⚠️ Publish failed: ${(e as Error).message}` }]);
    } finally {
      setAiPublishing(false);
    }
  };

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type !== "airea-section-visible") return;
      const id = String(e.data.id || "");
      setLiveSection(id);
      if (pointerOverPreview.current) {
        const label = sectionLabel(page, { id });
        fieldsCardFor(id, label)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const jumpToSection = (id: string, label: string) => {
    iframeRef.current?.contentWindow?.postMessage({ type: "airea-scroll-section", id }, "*");
    fieldsCardFor(id, label)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    // Surface failures instead of assuming success — a swallowed error here
    // means someone thinks they published when they didn't.
    const results = await Promise.all(
      dirtyKeys.map(async (k) => ({ k, error: (await supabase!.from("content_blocks").update({ published_value: draft[k] }).eq("key", k)).error }))
    );
    const failed = results.filter((r) => r.error);
    const ok = results.filter((r) => !r.error).map((r) => r.k);
    if (ok.length) {
      await supabase.from("publish_log").insert({
        summary: `Published ${ok.length} change${ok.length > 1 ? "s" : ""}`,
        changed_keys: ok,
        status: failed.length ? "error" : "success",
        published_by: email,
      });
      setPublished((p) => ({ ...p, ...Object.fromEntries(ok.map((k) => [k, draft[k]])) }));
    }
    setPublishing(false);
    if (failed.length) {
      window.alert(`${failed.length} of ${dirtyKeys.length} changes could not be published (your drafts are safe). First error: ${failed[0].error!.message}`);
    } else {
      setToast("Published — your changes are live.");
      window.setTimeout(() => setToast(""), 3500);
    }
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
  const [gallery, setGallery] = useState(false);

  const entryLabel = (e: LayoutEntry): string => {
    if (e.kind === "lib") return templateById(e.template ?? "")?.name ?? "Added section";
    if (e.kind === "shared") return `${sharedById(e.id ?? "")?.label ?? e.id} · shared`;
    return sectionLabel(page, e);
  };

  // "+ Add section": template instance (seeds its editable copy as drafts)…
  const insertTemplate = (t: TemplateDef) => {
    const iid = Math.random().toString(36).slice(2, 8);
    const updates: Record<string, { value: string; type: string }> = {};
    for (const [field, value] of Object.entries(t.defaults)) {
      const type = /image|poster/.test(field) ? "image" : /video/.test(field) ? "video" : "text";
      updates[`sec.${iid}.${field}`] = { value, type };
    }
    updates[layoutKey] = { value: JSON.stringify([...entries, { kind: "lib", template: t.id, instanceId: iid }]), type: "layout" };
    writeMany(updates);
    setGallery(false);
    setToast(`“${t.name}” added at the bottom — drag it into place, then edit its copy.`);
    window.setTimeout(() => setToast(""), 4000);
    window.setTimeout(() => iframeRef.current?.contentWindow?.postMessage({ type: "airea-scroll-section", id: `lib:${iid}` }, "*"), 900);
  };

  // …or adopt an existing section from another page (one source of truth).
  const insertShared = (id: string) => {
    if (entries.some((e) => e.kind === "shared" && e.id === id)) {
      setToast("That section is already on this page.");
      window.setTimeout(() => setToast(""), 2500);
      return;
    }
    writeLayout([...entries, { kind: "shared", id }]);
    setGallery(false);
    const label = sharedById(id)?.label ?? id;
    setToast(`“${label}” added — it shares its content wherever it appears.`);
    window.setTimeout(() => setToast(""), 4000);
  };

  const removeEntry = (key: string) => {
    writeLayout(entries.filter((e) => entryKey(e) !== key));
  };

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
                <div className="flex items-center gap-2">
                  {layoutDirty && <span className="rounded-full bg-blue-mist px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-ink">unpublished</span>}
                  <button
                    onClick={() => setGallery(true)}
                    className="flex items-center gap-1 rounded-full border border-line-2 px-2.5 py-1 text-[11.5px] font-semibold text-ink transition-colors hover:border-blue hover:text-blue"
                  >
                    + Add section
                  </button>
                </div>
              </div>
              <p className="mb-3 text-[12.5px] text-ink-3">Drag to reorder · eye to show/hide · click a name to jump to it</p>
              <Reorder.Group axis="y" values={entries.map(entryKey)} onReorder={reorderEntries} className="space-y-1.5">
                {entries.map((e) => (
                  <StructureRow
                    key={entryKey(e)}
                    id={entryKey(e)}
                    label={entryLabel(e)}
                    hidden={isHidden(e)}
                    active={!!e.id && e.id === liveSection}
                    onToggle={() => toggleEntry(entryKey(e))}
                    onSelect={() => jumpToSection(e.id ?? entryKey(e), entryLabel(e))}
                    onDelete={e.kind === "lib" || e.kind === "shared" ? () => removeEntry(entryKey(e)) : undefined}
                    onDragEnd={commitReorder}
                  />
                ))}
              </Reorder.Group>
            </div>
          )}

          {/* whole-page visibility — customers only; home & pricing always on */}
          {page === "global" && (
            <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
              <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-wider text-ink-3">Pages</h3>
              <p className="mb-3 text-[12.5px] text-ink-3">
                Switch whole pages off for customers — they leave the menus and the URL sends visitors home. Publish to apply.
              </p>
              <div className="space-y-1.5">
                {HIDEABLE_PAGES.map((p) => {
                  const key = pageVisibleKey(p.slug);
                  const hidden = (draft[key] ?? DEFAULTS[key]) === "false";
                  const dirty = (draft[key] ?? "") !== (published[key] ?? "") && draft[key] !== undefined;
                  return (
                    <div key={p.slug} className={cn("flex items-center gap-2.5 rounded-xl border border-line-2 bg-canvas px-3 py-2.5", hidden && "opacity-60")}>
                      <span className={cn("flex-1 truncate text-[13.5px] font-medium", hidden ? "text-ink-3 line-through decoration-ink-3/50" : "text-ink")}>
                        {p.label}
                        <span className="ml-2 font-mono text-[10.5px] text-ink-3">{p.path}</span>
                      </span>
                      {dirty && <span className="rounded-full bg-blue-mist px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-ink">unpublished</span>}
                      <button
                        onClick={() => writeMany({ [key]: { value: hidden ? "true" : "false", type: "page" } })}
                        title={hidden ? "Show this page" : "Hide this page from customers"}
                        className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors", hidden ? "text-ink-3 hover:bg-ink/5 hover:text-ink" : "text-blue hover:bg-blue-mist")}
                      >
                        {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
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
            <div
              key={section}
              ref={(el) => {
                if (el) fieldCardRefs.current.set(section, el);
                else fieldCardRefs.current.delete(section);
              }}
              className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 shadow-soft"
            >
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
                {editOnCanvas && <span className="hidden rounded bg-[#7C3AED]/10 px-1.5 py-0.5 text-[10.5px] font-semibold text-[#7C3AED] xl:inline">⌥-click anything → Fix with AI</span>}
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
            <div
              ref={paneRef}
              onPointerEnter={() => (pointerOverPreview.current = true)}
              onPointerLeave={() => (pointerOverPreview.current = false)}
              className="relative flex flex-1 items-start justify-center overflow-hidden bg-paper p-3"
            >
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
              {editing.type === "cta" && editing.link ? (
                <button
                  onClick={() => {
                    // Campbell's "Remove" button: one click hides the item from
                    // the live site (it stays as a ghost on this canvas).
                    const next = { ...editing.link!, visible: !editing.link!.visible };
                    writeMany({
                      [editing.key]: { value: editing.value, type: "text" },
                      [`${editing.key}_link`]: { value: JSON.stringify(next), type: "link" },
                    });
                    setEditing(null);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                    editing.link.visible ? "text-critical hover:bg-critical/10" : "text-blue hover:bg-blue-mist"
                  )}
                >
                  {editing.link.visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {editing.link.visible ? "Remove from site" : "Show on site"}
                </button>
              ) : (
                <span className="text-[10.5px] text-ink-3">⌘↵ to save</span>
              )}
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

      {/* section template gallery */}
      {gallery && <SectionGallery onClose={() => setGallery(false)} onInsertTemplate={insertTemplate} onInsertShared={insertShared} />}

      {/* Fix with AI — on-canvas component agent */}
      {aiTarget && (
        <div className="fixed bottom-5 right-5 z-[70] flex max-h-[70vh] w-[380px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="flex items-start justify-between gap-2 border-b border-line bg-[#7C3AED]/5 p-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-[#7C3AED]">✨ Fix with AI</div>
              <div className="mt-0.5 truncate text-[12px] text-ink-2">
                {`<${aiTarget.tag}>`}{aiTarget.section ? ` in ${sectionLabel(page, { id: aiTarget.section })}` : ""}{aiTarget.text ? ` — “${aiTarget.text.slice(0, 40)}”` : ""}
              </div>
            </div>
            <button onClick={() => setAiTarget(null)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-ink/5">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3.5">
            {aiNotes.length === 0 && (
              <p className="rounded-xl bg-canvas p-3 text-[12.5px] leading-relaxed text-ink-2">
                Tell me what to change about this element — “less padding”, “center it”, “remove the frame”, “make it bigger on mobile”… I'll edit the code. Nothing goes live until you press Publish.
              </p>
            )}
            {aiNotes.map((n, i) => (
              <div key={i} className={cn("max-w-[92%] whitespace-pre-wrap rounded-xl px-3 py-2 text-[12.5px] leading-relaxed", n.role === "user" ? "ml-auto bg-[#7C3AED] text-white" : "bg-canvas text-ink")}>
                {n.text}
              </div>
            ))}
            {aiBusy && (
              <div className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-[12.5px] text-ink-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the code & making the change…
              </div>
            )}
            {aiLive && (
              <div className="rounded-xl border border-blue/30 bg-blue-mist/50 px-3 py-2 text-[12.5px] text-ink">
                Published — live in ~2 minutes.{" "}
                <a href={aiLive} target="_blank" rel="noreferrer" className="font-semibold text-blue underline">commit</a>
              </div>
            )}
          </div>

          <div className="border-t border-line p-3">
            {aiStaged.length > 0 && !aiLive && (
              <div className="mb-2 flex items-center justify-between rounded-xl border border-line-2 bg-canvas px-3 py-2">
                <span className="text-[12px] font-medium text-ink">{aiStaged.length} file{aiStaged.length > 1 ? "s" : ""} staged</span>
                <div className="flex gap-1.5">
                  <button onClick={() => setAiStaged([])} className="rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-ink-3 hover:text-critical">Discard</button>
                  <button
                    onClick={publishAi}
                    disabled={aiPublishing}
                    className="flex items-center gap-1.5 rounded-full bg-blue px-3 py-1 text-[11.5px] font-semibold text-white hover:bg-blue-ink disabled:opacity-60"
                  >
                    {aiPublishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Rocket className="h-3 w-3" />} Publish now
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    askAi(aiInput);
                  }
                }}
                rows={2}
                placeholder="e.g. remove the phone frame around this image"
                className="w-full resize-none rounded-xl border border-line-2 bg-canvas px-3 py-2 text-[13px] text-ink outline-none focus:border-[#7C3AED]"
              />
              <button
                onClick={() => askAi(aiInput)}
                disabled={aiBusy || !aiInput.trim()}
                className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white", aiBusy || !aiInput.trim() ? "cursor-not-allowed bg-ink-3" : "bg-[#7C3AED] hover:bg-[#6D28D9]")}
              >
                ➤
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
function StructureRow({ id, label, hidden, active, onToggle, onSelect, onDelete, onDragEnd }: { id: string; label: string; hidden: boolean; active?: boolean; onToggle: () => void; onSelect?: () => void; onDelete?: () => void; onDragEnd: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className={cn(
        "flex select-none items-center gap-2.5 rounded-xl border bg-canvas px-3 py-2.5 transition-colors",
        hidden ? "border-line-2 opacity-60" : "border-line-2",
        active && "border-blue/50 bg-blue-mist/40"
      )}
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
      <button
        onClick={onSelect}
        title="Jump to this section in the preview"
        className={cn("flex-1 truncate text-left text-[13.5px] font-medium", hidden ? "text-ink-3 line-through decoration-ink-3/50" : "text-ink")}
      >
        {label}
      </button>
      {onDelete && (
        <button
          onClick={() => window.confirm(`Remove “${label}” from this page? Its edited copy is kept, so re-adding restores it.`) && onDelete()}
          title="Remove from this page"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:text-critical"
        >
          ×
        </button>
      )}
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

/* "+ Add section" gallery: on-brand pre-coded templates rendered as LIVE
 * scaled previews (always current with the design system — no screenshots to
 * maintain), plus existing sections from other pages (one source of truth). */
function SectionGallery({ onClose, onInsertTemplate, onInsertShared }: { onClose: () => void; onInsertTemplate: (t: TemplateDef) => void; onInsertShared: (id: string) => void }) {
  const cats = ["All", ...Array.from(new Set(SECTION_TEMPLATES.map((t) => t.category))), "From other pages"];
  const [cat, setCat] = useState("All");
  const shown = cat === "From other pages" ? [] : SECTION_TEMPLATES.filter((t) => cat === "All" || t.category === cat);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
      <div className="relative flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-line p-5 pb-4">
          <div>
            <h2 className="font-display text-2xl text-ink">Add a section</h2>
            <p className="mt-0.5 text-[13px] text-ink-2">Pre-built, on-brand, instantly editable — or reuse a section that already exists on another page.</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-ink/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-line px-5 py-3">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors", cat === c ? "bg-blue text-white" : "border border-line-2 text-ink-2 hover:text-ink")}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {cat === "From other pages" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SHARED_SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onInsertShared(s.id)}
                  className="rounded-2xl border border-line-2 bg-canvas p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue hover:shadow-card"
                >
                  <div className="text-[14px] font-semibold text-ink">{s.label}</div>
                  <div className="mt-1 text-[12px] text-ink-3">Same content everywhere it appears — edit once, updates on every page.</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {shown.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onInsertTemplate(t)}
                  className="group rounded-2xl border border-line-2 bg-canvas p-3 text-left transition-all hover:-translate-y-0.5 hover:border-blue hover:shadow-card"
                >
                  <div className="pointer-events-none h-[170px] overflow-hidden rounded-xl border border-line bg-white [&_.reveal]:!translate-y-0 [&_.reveal]:!opacity-100">
                    <div style={{ width: 1280, transform: "scale(0.345)", transformOrigin: "top left" }}>
                      <t.Component k={(f) => `__tplpreview.${t.id}.${f}`} />
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between gap-2 px-1">
                    <span className="text-[13.5px] font-semibold text-ink">{t.name}</span>
                    <span className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{t.category}</span>
                  </div>
                  <p className="px-1 pb-0.5 text-[12px] text-ink-3">{t.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
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
