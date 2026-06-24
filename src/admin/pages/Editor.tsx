import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ExternalLink, Loader2, RefreshCw, Rocket } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import { useAdminAuth } from "../auth";

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

export function Editor() {
  const { email } = useAdminAuth();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [published, setPublished] = useState<Record<string, string>>({});
  const [page, setPage] = useState("home");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [publishing, setPublishing] = useState(false);
  const [toast, setToast] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timers = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase
        .from("content_blocks")
        .select("*")
        .order("page")
        .order("sort");
      const list = (data as Block[]) ?? [];
      setBlocks(list);
      setDraft(Object.fromEntries(list.map((b) => [b.key, String(b.draft_value ?? "")])));
      setPublished(Object.fromEntries(list.map((b) => [b.key, String(b.published_value ?? "")])));
    })();
  }, []);

  const pages = useMemo(() => Array.from(new Set(blocks.map((b) => b.page))), [blocks]);
  const sections = useMemo(() => {
    const map = new Map<string, Block[]>();
    blocks
      .filter((b) => b.page === page)
      .forEach((b) => {
        const s = b.section ?? "General";
        map.set(s, [...(map.get(s) ?? []), b]);
      });
    return Array.from(map.entries());
  }, [blocks, page]);

  const dirtyKeys = useMemo(
    () => Object.keys(draft).filter((k) => draft[k] !== published[k]),
    [draft, published]
  );

  const previewSrc = page === "home" ? "/?preview=1" : `/${page}?preview=1`;

  const refreshPreview = () =>
    iframeRef.current?.contentWindow?.postMessage({ type: "airea-refresh-content" }, "*");

  const onEdit = (key: string, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setStatus("saving");
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(async () => {
      if (!supabase) return;
      await supabase
        .from("content_blocks")
        .update({ draft_value: value, updated_by: email })
        .eq("key", key);
      setStatus("saved");
      refreshPreview();
      window.setTimeout(() => setStatus("idle"), 1200);
    }, 450);
  };

  const publish = async () => {
    if (!supabase || dirtyKeys.length === 0) return;
    setPublishing(true);
    await Promise.all(
      dirtyKeys.map((k) =>
        supabase!.from("content_blocks").update({ published_value: draft[k] }).eq("key", k)
      )
    );
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

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">Content</p>
          <h1 className="mt-1 font-display text-[clamp(26px,3.4vw,38px)] tracking-tight text-ink">Site editor</h1>
          <p className="mt-1 text-[14px] text-ink-2">
            Edit copy and CTAs. Changes save as a draft and preview live — publish when ready.
          </p>
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

      {/* page tabs */}
      <div className="mt-6 flex gap-1 rounded-full border border-line bg-white p-1 w-fit">
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={cn(
              "rounded-full px-4 py-1.5 text-[13px] font-semibold capitalize transition-colors",
              page === p ? "bg-blue text-white" : "text-ink-2 hover:text-ink"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* fields */}
        <div className="space-y-5">
          {sections.map(([section, items]) => (
            <div key={section} className="rounded-2xl border border-line bg-white p-5 shadow-soft">
              <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-ink-3">{section}</h3>
              <div className="space-y-4">
                {items.map((b) => {
                  const dirty = draft[b.key] !== published[b.key];
                  return (
                    <label key={b.key} className="block">
                      <div className="mb-1.5 flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
                        {b.label}
                        {dirty && (
                          <span className="rounded-full bg-blue-mist px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-ink">
                            unpublished
                          </span>
                        )}
                      </div>
                      {b.type === "richtext" ? (
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
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* live preview */}
        <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Live preview · draft
              </span>
              <div className="flex items-center gap-1">
                <button onClick={refreshPreview} title="Refresh" className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 hover:bg-ink/5">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <a href={previewSrc} target="_blank" rel="noreferrer" title="Open in new tab" className="grid h-7 w-7 place-items-center rounded-lg text-ink-3 hover:bg-ink/5">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <iframe
              ref={iframeRef}
              key={previewSrc}
              src={previewSrc}
              title="Preview"
              className="min-h-[420px] w-full flex-1 bg-canvas"
            />
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
