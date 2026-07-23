import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Reorder, useDragControls } from "framer-motion";
import {
  Check,
  ExternalLink,
  GripVertical,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Rocket,
  Star,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import blocksData from "@/content/blocks.json";
import {
  MAX_PLANS,
  normalizePricing,
  parsePricing,
  pricingFromLegacy,
  type CompareCell,
  type PricingData,
  type PricingPlan,
} from "@/lib/pricing";
import { useAdminAuth } from "../auth";

/* Pricing Studio — the pricing page as a CMS. Plans (add / remove / reorder /
 * feature) and the full comparison matrix (rows + per-plan cells) are edited
 * here, stored as ONE `pricing.data` content block, and ride the same
 * draft → publish pipeline as everything else. Until first publish the live
 * site keeps rendering the legacy per-key content — nothing changes silently. */

const KEY = "pricing.data";
const DEFAULTS: Record<string, string> = Object.fromEntries(
  (blocksData as { key: string; value: string }[]).map((b) => [b.key, b.value])
);

const newId = () => Math.random().toString(36).slice(2, 8);

/* Reorder.Item that only drags from its grip handle, so inputs inside stay
 * clickable/selectable. */
function DragItem({ value, className, style, children }: { value: string; className?: string; style?: React.CSSProperties; children: (grip: ReactNode) => ReactNode }) {
  const controls = useDragControls();
  const grip = (
    <span
      onPointerDown={(e) => {
        e.preventDefault();
        controls.start(e);
      }}
      className="grid shrink-0 cursor-grab touch-none place-items-center text-ink-3 active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4" />
    </span>
  );
  return (
    <Reorder.Item value={value} dragListener={false} dragControls={controls} className={className} style={style}>
      {children(grip)}
    </Reorder.Item>
  );
}

export function PricingStudio() {
  const { email } = useAdminAuth();
  const [data, setData] = useState<PricingData | null>(null);
  const [rowIds, setRowIds] = useState<string[]>([]);
  const [publishedJson, setPublishedJson] = useState<string>("");
  const [rowExists, setRowExists] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const [pane, setPane] = useState({ w: 0, h: 0 });
  const saveTimer = useRef<number>(0);
  const rowExistsRef = useRef(false);
  rowExistsRef.current = rowExists;

  // Load: the pricing.data row if present, else assemble from the legacy
  // per-key pricing content (draft values first, so unpublished edits carry).
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data: rows } = await supabase
        .from("content_blocks")
        .select("key,draft_value,published_value")
        .or(`key.eq.${KEY},key.like.pricing.%`);
      const list = (rows as { key: string; draft_value: string | null; published_value: string | null }[]) ?? [];
      const dataRow = list.find((r) => r.key === KEY);
      if (dataRow) {
        setRowExists(true);
        setPublishedJson(String(dataRow.published_value ?? ""));
        const parsed = parsePricing(String(dataRow.draft_value ?? ""));
        if (parsed) {
          setData(parsed);
          setRowIds(parsed.compare.rows.map(() => newId()));
          return;
        }
      }
      const get = (k: string) => {
        const r = list.find((x) => x.key === k);
        const v = r?.draft_value;
        return v != null && v !== "" ? String(v) : String(DEFAULTS[k] ?? "");
      };
      const legacy = pricingFromLegacy(get);
      setData(legacy);
      setRowIds(legacy.compare.rows.map(() => newId()));
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
  const dirty = rowExists ? draftJson !== publishedJson : !!data;

  const refreshPreview = () => iframeRef.current?.contentWindow?.postMessage({ type: "airea-refresh-content" }, "*");

  // Every mutation flows through here: normalize, set, debounced save.
  const apply = (next: PricingData) => {
    const norm = normalizePricing(next);
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
          key: KEY,
          page: "pricing",
          section: "Pricing Studio",
          label: "Pricing data (plans + comparison)",
          type: "json",
          draft_value: json,
          published_value: null,
          sort: 0,
        } as any);
        setRowExists(true);
      }
      setStatus("saved");
      refreshPreview();
      window.setTimeout(() => setStatus("idle"), 1200);
    }, 600);
  };

  const publish = async () => {
    if (!supabase || !data) return;
    setPublishing(true);
    const json = JSON.stringify(data);
    if (!rowExistsRef.current) {
      await supabase.from("content_blocks").insert({
        key: KEY, page: "pricing", section: "Pricing Studio", label: "Pricing data (plans + comparison)",
        type: "json", draft_value: json, published_value: json, sort: 0,
      } as any);
      setRowExists(true);
    } else {
      const { error: err } = await supabase.from("content_blocks").update({ draft_value: json, published_value: json, updated_by: email }).eq("key", KEY);
      if (err) {
        setPublishing(false);
        window.alert(`Couldn't publish pricing (your draft is safe): ${err.message}`);
        return;
      }
    }
    await supabase.from("publish_log").insert({
      summary: `Published pricing (${data.plans.length} plans, ${data.compare.rows.length} comparison rows)`,
      changed_keys: [KEY],
      status: "success",
      published_by: email,
    });
    setPublishedJson(json);
    setPublishing(false);
    setToast("Pricing published — live on the site.");
    window.setTimeout(() => setToast(""), 3500);
  };

  /* ---------- plan ops ---------- */

  const setPlan = (id: string, patch: Partial<PricingPlan>) =>
    data && apply({ ...data, plans: data.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

  const setFeatured = (id: string) =>
    data &&
    apply({
      ...data,
      plans: data.plans.map((p) => ({ ...p, featured: p.id === id ? !p.featured : false })),
    });

  const addPlan = () => {
    if (!data || data.plans.length >= MAX_PLANS) return;
    const plan: PricingPlan = {
      id: newId(),
      name: "New plan",
      price: "$0",
      cadence: "/mo",
      blurb: "Who this plan is for.",
      features: ["First feature", "Second feature"],
      ctaLabel: "Start free",
      ctaHref: "https://app.aireastudio.ai/sign-up",
      featured: false,
      badge: "",
    };
    apply({
      ...data,
      plans: [...data.plans, plan],
      compare: { rows: data.compare.rows.map((r) => ({ ...r, values: [...r.values, { t: "dash" } as CompareCell] })) },
    });
  };

  const removePlan = (id: string) => {
    if (!data || data.plans.length <= 1) return;
    const idx = data.plans.findIndex((p) => p.id === id);
    apply({
      ...data,
      plans: data.plans.filter((p) => p.id !== id),
      compare: { rows: data.compare.rows.map((r) => ({ ...r, values: r.values.filter((_, i) => i !== idx) })) },
    });
  };

  const reorderPlans = (ids: string[]) => {
    if (!data) return;
    const order = ids.map((id) => data.plans.findIndex((p) => p.id === id));
    apply({
      ...data,
      plans: order.map((i) => data.plans[i]),
      compare: { rows: data.compare.rows.map((r) => ({ ...r, values: order.map((i) => r.values[i]) })) },
    });
  };

  /* ---------- compare ops ---------- */

  const setRowLabel = (r: number, label: string) =>
    data && apply({ ...data, compare: { rows: data.compare.rows.map((row, i) => (i === r ? { ...row, label } : row)) } });

  const cycleCell = (r: number, cIdx: number) => {
    if (!data) return;
    const cell = data.compare.rows[r].values[cIdx];
    const next: CompareCell = cell.t === "check" ? { t: "dash" } : cell.t === "dash" ? { t: "text", v: "" } : { t: "check" };
    setCell(r, cIdx, next);
  };

  const setCell = (r: number, cIdx: number, cell: CompareCell) =>
    data &&
    apply({
      ...data,
      compare: {
        rows: data.compare.rows.map((row, i) =>
          i === r ? { ...row, values: row.values.map((v, j) => (j === cIdx ? cell : v)) } : row
        ),
      },
    });

  const addRow = () => {
    if (!data) return;
    setRowIds((ids) => [...ids, newId()]);
    apply({
      ...data,
      compare: { rows: [...data.compare.rows, { label: "New feature", values: data.plans.map(() => ({ t: "dash" } as CompareCell)) }] },
    });
  };

  const removeRow = (r: number) => {
    if (!data) return;
    setRowIds((ids) => ids.filter((_, i) => i !== r));
    apply({ ...data, compare: { rows: data.compare.rows.filter((_, i) => i !== r) } });
  };

  const reorderRows = (ids: string[]) => {
    if (!data) return;
    const rows = ids.map((id) => data.compare.rows[rowIds.indexOf(id)]).filter(Boolean);
    if (rows.length !== data.compare.rows.length) return;
    setRowIds(ids);
    apply({ ...data, compare: { rows } });
  };

  // preview scaling (fallbacks keep the iframe visible even pre-measure)
  const previewW = 1280;
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

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">Pricing</p>
          <h1 className="mt-1 font-display text-[clamp(26px,3.4vw,38px)] tracking-tight text-ink">Pricing Studio</h1>
          <p className="mt-1 text-[14px] text-ink-2">
            Plans, prices, features, and the comparison table — add, remove, reorder anything. Publish when it's right.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            Publish pricing
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[520px_1fr]">
        <div className="space-y-5">
          {/* ---- plans ---- */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Plans</h3>
              <button
                onClick={addPlan}
                disabled={data.plans.length >= MAX_PLANS}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                  data.plans.length >= MAX_PLANS
                    ? "cursor-not-allowed border-line-2 text-ink-3"
                    : "border-line-2 text-ink hover:border-blue hover:text-blue"
                )}
              >
                <Plus className="h-3.5 w-3.5" /> Add plan
              </button>
            </div>
            <p className="mb-4 text-[12.5px] text-ink-3">Drag to reorder · star = featured plan · 1–{MAX_PLANS} plans</p>

            <Reorder.Group axis="y" values={data.plans.map((p) => p.id)} onReorder={reorderPlans} className="space-y-3">
              {data.plans.map((p) => (
                <DragItem key={p.id} value={p.id} className="rounded-2xl border border-line-2 bg-canvas p-4">
                  {(grip) => (
                  <>
                  <div className="flex items-center gap-2">
                    {grip}
                    <input
                      value={p.name}
                      onChange={(e) => setPlan(p.id, { name: e.target.value })}
                      className="w-full min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[15px] font-semibold text-ink outline-none focus:border-blue focus:bg-white"
                    />
                    <button
                      onClick={() => setFeatured(p.id)}
                      title={p.featured ? "Featured plan" : "Make featured"}
                      className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors", p.featured ? "text-blue" : "text-ink-3 hover:text-ink")}
                    >
                      <Star className={cn("h-4.5 w-4.5", p.featured && "fill-blue")} />
                    </button>
                    <button
                      onClick={() => removePlan(p.id)}
                      disabled={data.plans.length <= 1}
                      title="Remove plan"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:text-critical disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-[1fr_90px] gap-2">
                    <Field label="Price">
                      <input value={p.price} onChange={(e) => setPlan(p.id, { price: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Cadence">
                      <input value={p.cadence} onChange={(e) => setPlan(p.id, { cadence: e.target.value })} className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Blurb" className="mt-2">
                    <input value={p.blurb} onChange={(e) => setPlan(p.id, { blurb: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Features — one per line" className="mt-2">
                    <textarea
                      value={p.features.join("\n")}
                      onChange={(e) => setPlan(p.id, { features: e.target.value.split("\n") })}
                      onBlur={(e) => setPlan(p.id, { features: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                      rows={Math.max(3, p.features.length)}
                      className={cn(inputCls, "resize-y leading-relaxed")}
                    />
                  </Field>
                  <div className="mt-2 grid grid-cols-[110px_1fr] gap-2">
                    <Field label="Button label">
                      <input value={p.ctaLabel} onChange={(e) => setPlan(p.id, { ctaLabel: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Button URL">
                      <input value={p.ctaHref} onChange={(e) => setPlan(p.id, { ctaHref: e.target.value })} className={inputCls} />
                    </Field>
                  </div>
                  {p.featured && (
                    <Field label="Badge (featured plan)" className="mt-2">
                      <input value={p.badge ?? ""} onChange={(e) => setPlan(p.id, { badge: e.target.value })} className={inputCls} />
                    </Field>
                  )}
                  </>
                  )}
                </DragItem>
              ))}
            </Reorder.Group>
          </div>

          {/* ---- comparison table ---- */}
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Comparison table</h3>
              <button
                onClick={addRow}
                className="flex items-center gap-1.5 rounded-full border border-line-2 px-3 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-blue hover:text-blue"
              >
                <Plus className="h-3.5 w-3.5" /> Add row
              </button>
            </div>
            <p className="mb-4 text-[12.5px] text-ink-3">Click a cell to cycle ✓ → — → text · drag rows to reorder</p>

            {/* header */}
            <div
              className="grid items-end gap-1.5 pb-2"
              style={{ gridTemplateColumns: `16px 1fr repeat(${data.plans.length}, 64px) 28px` }}
            >
              <span />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Feature</span>
              {data.plans.map((p) => (
                <span key={p.id} className="truncate text-center text-[11px] font-semibold text-ink" title={p.name}>
                  {p.name}
                </span>
              ))}
              <span />
            </div>

            <Reorder.Group axis="y" values={rowIds} onReorder={reorderRows} className="space-y-1.5">
              {data.compare.rows.map((row, r) => (
                <DragItem
                  key={rowIds[r] ?? r}
                  value={rowIds[r] ?? String(r)}
                  className="grid items-center gap-1.5 rounded-xl border border-line-2 bg-canvas px-1.5 py-1.5"
                  style={{ gridTemplateColumns: `16px 1fr repeat(${data.plans.length}, 64px) 28px` }}
                >
                  {(grip) => (
                  <>
                  {grip}
                  <input
                    value={row.label}
                    onChange={(e) => setRowLabel(r, e.target.value)}
                    className="w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1 text-[13px] text-ink outline-none focus:border-blue focus:bg-white"
                  />
                  {row.values.map((cell, i) => (
                    <CompareCellEditor key={i} cell={cell} onCycle={() => cycleCell(r, i)} onText={(v) => setCell(r, i, { t: "text", v })} />
                  ))}
                  <button
                    onClick={() => removeRow(r)}
                    title="Remove row"
                    className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 transition-colors hover:text-critical"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  </>
                  )}
                </DragItem>
              ))}
            </Reorder.Group>
          </div>
        </div>

        {/* ---- live preview ---- */}
        <div className="xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)]">
          <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Live preview · draft
              </span>
              <div className="flex items-center gap-2">
                <button onClick={refreshPreview} title="Refresh" className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 hover:bg-ink/5">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <a href="/pricing?preview=1" target="_blank" rel="noreferrer" title="Open in new tab" className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 hover:bg-ink/5">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <div ref={paneRef} className="relative flex flex-1 items-start justify-center overflow-hidden bg-paper p-3">
              <div style={{ width: previewW * scale, height: innerH || 600 }} className="overflow-hidden rounded-lg border border-line bg-canvas shadow-sm">
                <iframe
                  ref={iframeRef}
                  src="/pricing?preview=1"
                  title="Pricing preview"
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

const inputCls =
  "w-full rounded-lg border border-line-2 bg-white px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-blue";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</span>
      {children}
    </label>
  );
}

/* One comparison cell: ✓ / — / free text. Click cycles; text mode edits inline. */
function CompareCellEditor({ cell, onCycle, onText }: { cell: CompareCell; onCycle: () => void; onText: (v: string) => void }) {
  if (cell.t === "text") {
    return (
      <span className="relative">
        <input
          value={cell.v ?? ""}
          autoFocus={!cell.v}
          placeholder="text"
          onChange={(e) => onText(e.target.value)}
          className="w-full rounded-lg border border-blue/40 bg-white px-1.5 py-1 text-center text-[12px] text-ink outline-none focus:border-blue"
          title="Custom text — use the ↻ to switch back to ✓"
        />
        <button
          onClick={onCycle}
          title="Switch to ✓"
          className="absolute -right-1 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-ink text-[9px] leading-none text-white opacity-70 hover:opacity-100"
        >
          ↻
        </button>
      </span>
    );
  }
  return (
    <button
      onClick={onCycle}
      title={cell.t === "check" ? "Included — click for —" : "Not included — click for text"}
      className={cn(
        "grid h-8 place-items-center rounded-lg border transition-colors",
        cell.t === "check" ? "border-blue/30 bg-blue-mist/60 text-blue" : "border-line-2 bg-white text-ink-3"
      )}
    >
      {cell.t === "check" ? <Check className="h-4 w-4" /> : <Minus className="h-3.5 w-3.5" />}
    </button>
  );
}

