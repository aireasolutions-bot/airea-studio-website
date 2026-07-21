import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  Loader2,
  Monitor,
  RefreshCw,
  Rocket,
  RotateCcw,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import {
  contrastRatio,
  deriveAccentFamily,
  DESIGN_DEFAULTS,
  FONT_CHOICES,
  fontSrc,
  hexToRgb,
  normalizeDesign,
  parseDesign,
  type CustomFont,
  type DesignColors,
  type DesignTokens,
} from "@/lib/design";
import { useAdminAuth } from "../auth";

/* Design — the whole site's look, no code. Typography (with rendered samples +
 * custom font upload), the full color palette (with one-click accent presets
 * and auto-derived shades), button shape, and page background. Everything
 * streams into the live preview and rides draft → publish like all content. */

const KEY = "design.tokens";
const newId = () => Math.random().toString(36).slice(2, 8);

// Accent presets: pick one, the full shade family is derived automatically.
const ACCENT_PRESETS = [
  { name: "Studio Blue", hex: "#0047ff", house: true },
  { name: "Emerald", hex: "#0e8345" },
  { name: "Crimson", hex: "#d9163c" },
  { name: "Royal Violet", hex: "#6431f5" },
  { name: "Amber", hex: "#e07c00" },
  { name: "Ink", hex: "#1f2937" },
];

// One stylesheet with every curated family so the pickers render true samples.
const SAMPLE_FONTS_HREF = `https://fonts.googleapis.com/css2?${[
  ...new Set(Object.values(FONT_CHOICES).map((f) => f.g).filter(Boolean) as string[]),
]
  .map((g) => `family=${g}`)
  .join("&")}&display=swap`;

const fontFormat = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext === "woff2" ? "woff2" : ext === "woff" ? "woff" : ext === "otf" ? "opentype" : "truetype";
};

export function Design() {
  const { email } = useAdminAuth();
  const [data, setData] = useState<DesignTokens | null>(null);
  const [publishedJson, setPublishedJson] = useState("");
  const [rowExists, setRowExists] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pane, setPane] = useState({ w: 0, h: 0 });
  const saveTimer = useRef<number>(0);
  const rowExistsRef = useRef(false);
  rowExistsRef.current = rowExists;

  // Load fonts for the picker samples (admin page only).
  useEffect(() => {
    const id = "airea-admin-font-samples";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = SAMPLE_FONTS_HREF;
      document.head.appendChild(link);
    }
  }, []);

  // Register uploaded fonts in the admin too, so their picker cards render in
  // the real typeface (the site's own @font-face lives on the public pages).
  const customs = data?.fonts.customs;
  useEffect(() => {
    const id = "airea-admin-custom-faces";
    let style = document.getElementById(id) as HTMLStyleElement | null;
    if (!customs?.length) {
      style?.remove();
      return;
    }
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = customs
      .map(
        (f) =>
          `@font-face{font-family:"${f.label.replace(/"/g, "")}";src:url("${fontSrc(f.url)}") format("${f.format}");font-display:swap;font-weight:100 900;}`
      )
      .join("\n");
  }, [customs]);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data: rows } = await supabase
        .from("content_blocks")
        .select("draft_value,published_value")
        .eq("key", KEY)
        .maybeSingle();
      if (rows) {
        setRowExists(true);
        setPublishedJson(String(rows.published_value ?? ""));
        setData(parseDesign(String(rows.draft_value ?? "")) ?? DESIGN_DEFAULTS);
      } else {
        setData(DESIGN_DEFAULTS);
      }
    })();
  }, []);

  // Attach only once the data (and therefore the pane element) is rendered —
  // this page shows a loader first, so an on-mount-only observer would find
  // nothing and the preview iframe would stay collapsed at 0px.
  const ready = !!data;
  useEffect(() => {
    if (!ready) return;
    const el = paneRef.current;
    if (!el) return;
    const update = () => setPane({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  const draftJson = useMemo(() => (data ? JSON.stringify(data) : ""), [data]);
  const isHouse = draftJson === JSON.stringify(DESIGN_DEFAULTS);
  const dirty = rowExists ? draftJson !== publishedJson : !isHouse;

  const refreshPreview = () => iframeRef.current?.contentWindow?.postMessage({ type: "airea-refresh-content" }, "*");

  const apply = (next: DesignTokens) => {
    const norm = normalizeDesign(next);
    if (!norm) return;
    setData(norm);
    setStatus("saving");
    window.clearTimeout(saveTimer.current);
    const json = JSON.stringify(norm);
    saveTimer.current = window.setTimeout(async () => {
      if (!supabase) return;
      if (rowExistsRef.current) {
        await supabase.from("content_blocks").update({ draft_value: json, updated_by: email }).eq("key", KEY);
      } else {
        await supabase.from("content_blocks").insert({
          key: KEY, page: "global", section: "Design", label: "Design system tokens",
          type: "json", draft_value: json, published_value: null, sort: 0,
        } as any);
        setRowExists(true);
      }
      setStatus("saved");
      refreshPreview();
      window.setTimeout(() => setStatus("idle"), 1200);
    }, 500);
  };

  const publish = async () => {
    if (!supabase || !data) return;
    setPublishing(true);
    const json = JSON.stringify(data);
    if (!rowExistsRef.current) {
      await supabase.from("content_blocks").insert({
        key: KEY, page: "global", section: "Design", label: "Design system tokens",
        type: "json", draft_value: json, published_value: json, sort: 0,
      } as any);
      setRowExists(true);
    } else {
      await supabase.from("content_blocks").update({ draft_value: json, published_value: json, updated_by: email }).eq("key", KEY);
    }
    await supabase.from("publish_log").insert({
      summary: "Published site design (typography, colors, shape, background)",
      changed_keys: [KEY],
      status: "success",
      published_by: email,
    });
    setPublishedJson(json);
    setPublishing(false);
    setToast("Design published — live on the site.");
    window.setTimeout(() => setToast(""), 3500);
  };

  const resetHouse = () => {
    if (!data) return;
    apply({ ...DESIGN_DEFAULTS, fonts: { ...DESIGN_DEFAULTS.fonts, customs: data.fonts.customs } });
    setToast("Back to the house look — publish to make it live.");
    window.setTimeout(() => setToast(""), 3000);
  };

  const setColors = (patch: Partial<DesignColors>) => data && apply({ ...data, colors: { ...data.colors, ...patch } });

  const uploadFont = async (file: File) => {
    if (!supabase) return;
    setUploading(true);
    setError("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Session expired — sign in again.");
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] ?? "");
        r.onerror = () => rej(new Error("Could not read file"));
        r.readAsDataURL(file);
      });
      const resp = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "font/woff2",
          dataBase64: b64,
          folder: "fonts",
        }),
      });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({})))?.error || `Upload failed (${resp.status})`);
      const { url } = await resp.json();
      const label = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
      const font: CustomFont = { id: newId(), label, url, format: fontFormat(file.name) };
      if (data) apply({ ...data, fonts: { ...data.fonts, customs: [...data.fonts.customs, font] } });
      setToast(`Font "${label}" uploaded — select it below, rename if needed.`);
      window.setTimeout(() => setToast(""), 4000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // preview scaling (fallbacks keep the iframe visible even pre-measure)
  const previewW = device === "desktop" ? 1280 : 390;
  const innerW = Math.max(0, pane.w - 24);
  const innerH = Math.max(0, pane.h - 24);
  const scale = innerW ? Math.min(1, innerW / previewW) : 0.5;
  const frameH = innerH && scale ? innerH / scale : 900;

  if (!data) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-ink-3">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const displays = Object.entries(FONT_CHOICES).filter(([, f]) => f.kind === "display");
  const bodies = Object.entries(FONT_CHOICES).filter(([, f]) => f.kind === "body");
  const monos = Object.entries(FONT_CHOICES).filter(([, f]) => f.kind === "mono");
  const inkContrast = contrastRatio(data.colors.ink, data.colors.canvas);
  const btnContrast = contrastRatio("#ffffff", data.colors.blue);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">Design system</p>
          <h1 className="mt-1 font-display text-[clamp(26px,3.4vw,38px)] tracking-tight text-ink">Design</h1>
          <p className="mt-1 text-[14px] text-ink-2">
            Typography, colors, buttons, and backgrounds for the whole site — preview live, publish when it's right.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={resetHouse} className="flex items-center gap-1.5 rounded-full border border-line-2 px-3.5 py-2 text-[12.5px] font-semibold text-ink hover:border-ink-3">
            <RotateCcw className="h-3.5 w-3.5" /> House look
          </button>
          <span className="text-[12.5px] text-ink-3">
            {status === "saving" ? "Saving…" : status === "saved" ? "Draft saved" : dirty ? "Unpublished changes" : "Up to date"}
          </span>
          <button
            onClick={publish}
            disabled={publishing || !dirty}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-soft transition-colors",
              !dirty ? "cursor-not-allowed bg-ink-3" : "bg-blue hover:bg-blue-ink"
            )}
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Publish design
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-critical/30 bg-critical/5 p-3.5 text-[13px] text-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[560px_1fr]">
        <div className="space-y-5">
          {/* ---------- typography ---------- */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Typography</h3>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 rounded-full border border-line-2 px-3 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-blue hover:text-blue disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload custom font
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".woff2,.woff,.ttf,.otf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadFont(e.target.files[0])}
              />
            </div>
            <p className="mb-4 text-[12.5px] text-ink-3">.woff2 / .woff / .ttf / .otf — uploads land in your asset library and become selectable below.</p>

            {data.fonts.customs.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {data.fonts.customs.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 rounded-xl border border-line-2 bg-canvas px-3 py-2">
                    <span className="rounded bg-blue-mist px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-blue-ink">Custom</span>
                    <input
                      value={f.label}
                      onChange={(e) =>
                        apply({
                          ...data,
                          fonts: { ...data.fonts, customs: data.fonts.customs.map((x) => (x.id === f.id ? { ...x, label: e.target.value } : x)) },
                        })
                      }
                      className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-0.5 text-[13px] font-medium text-ink outline-none focus:border-blue focus:bg-white"
                    />
                    <button
                      onClick={() =>
                        apply({
                          ...data,
                          fonts: {
                            ...data.fonts,
                            display: data.fonts.display === `custom:${f.id}` ? DESIGN_DEFAULTS.fonts.display : data.fonts.display,
                            body: data.fonts.body === `custom:${f.id}` ? DESIGN_DEFAULTS.fonts.body : data.fonts.body,
                            mono: data.fonts.mono === `custom:${f.id}` ? DESIGN_DEFAULTS.fonts.mono : data.fonts.mono,
                            customs: data.fonts.customs.filter((x) => x.id !== f.id),
                          },
                        })
                      }
                      title="Remove font"
                      className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 hover:text-critical"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <FontPicker
              label="Display — headlines & the big serif moments"
              sample="A full campaign out."
              sampleClass="text-[21px] leading-tight"
              options={displays}
              customs={data.fonts.customs}
              value={data.fonts.display}
              onChange={(v) => apply({ ...data, fonts: { ...data.fonts, display: v } })}
            />
            <FontPicker
              label="Body — paragraphs, buttons, UI"
              sample="AIREA Studio learns your brand, then ships on-brand campaigns across every channel."
              sampleClass="text-[13px] leading-snug"
              options={bodies}
              customs={data.fonts.customs}
              value={data.fonts.body}
              onChange={(v) => apply({ ...data, fonts: { ...data.fonts, body: v } })}
              className="mt-5"
            />
            <FontPicker
              label="Mono — eyebrows & labels"
              sample="THE AI MARKETING OS"
              sampleClass="text-[11.5px] tracking-[0.18em]"
              options={monos}
              customs={[]}
              value={data.fonts.mono}
              onChange={(v) => apply({ ...data, fonts: { ...data.fonts, mono: v } })}
              className="mt-5"
              cols={2}
            />
          </div>

          {/* ---------- colors ---------- */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <h3 className="mb-1 text-[13px] font-semibold uppercase tracking-wider text-ink-3">Color palette</h3>
            <p className="mb-4 text-[12.5px] text-ink-3">Pick an accent — the shade family derives automatically. Fine-tune anything below.</p>

            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map((p) => {
                const on = data.colors.blue.toLowerCase() === p.hex;
                return (
                  <button
                    key={p.name}
                    onClick={() => setColors(deriveAccentFamily(p.hex))}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-all",
                      on ? "border-ink bg-ink text-white" : "border-line-2 text-ink hover:border-ink-3"
                    )}
                  >
                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: p.hex }} />
                    {p.name}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <ColorField label="Accent (base)" value={data.colors.blue} onChange={(v) => setColors(deriveAccentFamily(v))} />
              <ColorField label="Accent — dark (hover)" value={data.colors.blueInk} onChange={(v) => setColors({ blueInk: v })} />
              <ColorField label="Accent — bright" value={data.colors.blueBright} onChange={(v) => setColors({ blueBright: v })} />
              <ColorField label="Accent — light (sky)" value={data.colors.blueSky} onChange={(v) => setColors({ blueSky: v })} />
              <ColorField label="Accent — tint (mist)" value={data.colors.blueMist} onChange={(v) => setColors({ blueMist: v })} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <ColorField label="Text" value={data.colors.ink} onChange={(v) => setColors({ ink: v })} />
              <ColorField label="Text — secondary" value={data.colors.ink2} onChange={(v) => setColors({ ink2: v })} />
              <ColorField label="Text — muted" value={data.colors.ink3} onChange={(v) => setColors({ ink3: v })} />
              <ColorField label="Page background" value={data.colors.canvas} onChange={(v) => setColors({ canvas: v })} />
              <ColorField label="Warm panels" value={data.colors.paper} onChange={(v) => setColors({ paper: v })} />
              <ColorField label="Cards" value={data.colors.card} onChange={(v) => setColors({ card: v })} />
              <ColorField label="Borders" value={data.colors.line} onChange={(v) => setColors({ line: v })} />
              <ColorField label="Borders — strong" value={data.colors.line2} onChange={(v) => setColors({ line2: v })} />
            </div>

            <div className="mt-4 space-y-1.5">
              <ContrastHint label="Text on page background" ratio={inkContrast} />
              <ContrastHint label="White on accent (buttons)" ratio={btnContrast} />
            </div>
          </div>

          {/* ---------- buttons ---------- */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-3">Buttons</h3>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  ["pill", "Pill — the house shape", "9999px"],
                  ["rounded", "Rounded", "14px"],
                  ["square", "Sharp", "6px"],
                ] as const
              ).map(([id, label, radius]) => (
                <button
                  key={id}
                  onClick={() => apply({ ...data, shape: { button: id } })}
                  className={cn(
                    "rounded-xl border p-3 text-center transition-all",
                    data.shape.button === id ? "border-blue bg-blue-mist/40" : "border-line-2 hover:border-ink-3"
                  )}
                >
                  <span
                    className="mx-auto block w-fit px-4 py-2 text-[12px] font-semibold text-white"
                    style={{ background: data.colors.blue, borderRadius: radius }}
                  >
                    Start free
                  </span>
                  <span className="mt-2 block text-[11.5px] font-medium text-ink-2">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ---------- background ---------- */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-3">Page background</h3>
            <div className="flex gap-1.5">
              {(
                [
                  ["default", "House"],
                  ["solid", "Solid color"],
                  ["gradient", "Gradient"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => apply({ ...data, background: { ...data.background, type: id } })}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                    data.background.type === id ? "bg-blue text-white" : "border border-line-2 text-ink-2 hover:text-ink"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {data.background.type === "solid" && (
              <div className="mt-3 max-w-[220px]">
                <ColorField label="Background color" value={data.background.solid ?? data.colors.canvas} onChange={(v) => apply({ ...data, background: { ...data.background, solid: v } })} />
              </div>
            )}
            {data.background.type === "gradient" && (
              <>
                <div className="mt-3 grid grid-cols-[1fr_1fr_120px] items-end gap-2.5">
                  <ColorField label="From" value={data.background.from ?? "#fafafa"} onChange={(v) => apply({ ...data, background: { ...data.background, from: v } })} />
                  <ColorField label="To" value={data.background.to ?? "#e8eeff"} onChange={(v) => apply({ ...data, background: { ...data.background, to: v } })} />
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-3">Angle · {data.background.angle ?? 160}°</span>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={data.background.angle ?? 160}
                      onChange={(e) => apply({ ...data, background: { ...data.background, angle: Number(e.target.value) } })}
                      className="w-full accent-[var(--blue)]"
                    />
                  </label>
                </div>
                <div
                  className="mt-3 h-14 rounded-xl border border-line"
                  style={{ background: `linear-gradient(${data.background.angle ?? 160}deg, ${data.background.from}, ${data.background.to})` }}
                />
              </>
            )}
          </div>
        </div>

        {/* ---------- live preview ---------- */}
        <div className="xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)]">
          <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Live preview · draft design
              </span>
              <div className="flex items-center gap-2">
                <div className="flex rounded-full border border-line-2 p-0.5">
                  {([["desktop", Monitor], ["mobile", Smartphone]] as const).map(([d, Icon]) => (
                    <button
                      key={d}
                      onClick={() => setDevice(d)}
                      title={d}
                      className={cn("grid h-7 w-7 place-items-center rounded-full", device === d ? "bg-blue text-white" : "text-ink-3 hover:text-ink")}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                <button onClick={refreshPreview} title="Refresh" className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 hover:bg-ink/5">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <a href="/?preview=1" target="_blank" rel="noreferrer" title="Open in new tab" className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 hover:bg-ink/5">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <div ref={paneRef} className="relative flex flex-1 items-start justify-center overflow-hidden bg-paper p-3">
              <div
                style={{ width: previewW * scale, height: innerH || 600 }}
                className={cn("overflow-hidden bg-canvas", device === "mobile" ? "rounded-[2rem] border-[6px] border-ink shadow-card" : "rounded-lg border border-line shadow-sm")}
              >
                <iframe
                  ref={iframeRef}
                  src="/?preview=1"
                  title="Design preview"
                  style={{ width: previewW, height: frameH, transform: `scale(${scale})`, transformOrigin: "top left", border: 0 }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-[13.5px] font-semibold text-white shadow-card">
          <Check className="h-4 w-4 text-green-400" />
          {toast}
        </div>
      )}
    </div>
  );
}

function FontPicker({
  label,
  sample,
  sampleClass,
  options,
  customs,
  value,
  onChange,
  className,
  cols = 2,
}: {
  label: string;
  sample: string;
  sampleClass?: string;
  options: [string, (typeof FONT_CHOICES)[string]][];
  customs: CustomFont[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
  cols?: number;
}) {
  return (
    <div className={className}>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</div>
      <div className={cn("grid gap-2", cols === 2 ? "grid-cols-2" : "grid-cols-1")}>
        {options.map(([id, f]) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "rounded-xl border p-3 text-left transition-all",
              value === id ? "border-blue bg-blue-mist/40" : "border-line-2 hover:border-ink-3"
            )}
          >
            <span className={cn("block truncate text-ink", sampleClass)} style={{ fontFamily: `"${f.family}"` }}>
              {sample}
            </span>
            <span className="mt-1.5 block text-[11px] text-ink-3">{f.label}</span>
          </button>
        ))}
        {customs.map((f) => (
          <button
            key={f.id}
            onClick={() => onChange(`custom:${f.id}`)}
            className={cn(
              "rounded-xl border p-3 text-left transition-all",
              value === `custom:${f.id}` ? "border-blue bg-blue-mist/40" : "border-line-2 hover:border-ink-3"
            )}
          >
            <span className={cn("block truncate text-ink", sampleClass)} style={{ fontFamily: `"${f.label}"` }}>
              {sample}
            </span>
            <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-3">
              <span className="rounded bg-blue-mist px-1 py-px text-[9px] font-bold uppercase text-blue-ink">Custom</span>
              {f.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <label className="block">
      <span className="mb-1 block truncate text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</span>
      <span className="flex items-center gap-1.5 rounded-xl border border-line-2 bg-canvas p-1.5">
        <input
          type="color"
          value={hexToRgb(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-8 shrink-0 cursor-pointer rounded-md border-0 bg-transparent p-0"
        />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (hexToRgb(e.target.value)) onChange(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`);
          }}
          className="w-full min-w-0 bg-transparent font-mono text-[12px] text-ink outline-none"
        />
      </span>
    </label>
  );
}

function ContrastHint({ label, ratio }: { label: string; ratio: number }) {
  const ok = ratio >= 4.5;
  const warn = ratio >= 3 && ratio < 4.5;
  return (
    <div className={cn("flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px]", ok ? "bg-canvas text-ink-2" : warn ? "bg-amber-50 text-amber-800" : "bg-critical/10 text-critical")}>
      <span>{label}</span>
      <span className="font-mono font-semibold">
        {ratio.toFixed(1)}:1 {ok ? "· AA ✓" : warn ? "· low" : "· fails AA"}
      </span>
    </div>
  );
}
