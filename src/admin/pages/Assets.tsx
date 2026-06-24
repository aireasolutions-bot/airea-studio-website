import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, Film, Search, UploadCloud, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";

type Asset = {
  id: string;
  key: string;
  filename: string;
  url: string;
  type: string | null;
  content_type: string | null;
  folder: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

const fmtSize = (b: number | null) =>
  b == null ? "—" : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

export function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState("all");
  const [type, setType] = useState("all");
  const [sel, setSel] = useState<Asset | null>(null);
  const [copied, setCopied] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase
        .from("assets")
        .select("*")
        .order("folder", { ascending: true })
        .order("filename", { ascending: true });
      setAssets((data as Asset[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const folders = useMemo(
    () => Array.from(new Set(assets.map((a) => a.folder ?? "root"))).sort(),
    [assets]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return assets.filter(
      (a) =>
        (folder === "all" || (a.folder ?? "root") === folder) &&
        (type === "all" || a.type === type) &&
        (!s || a.filename.toLowerCase().includes(s) || a.key.toLowerCase().includes(s))
    );
  }, [assets, q, folder, type]);

  const copy = (t: string) => {
    navigator.clipboard?.writeText(t);
    setCopied(t);
    setTimeout(() => setCopied(""), 1500);
  };

  const download = async (a: Asset) => {
    try {
      const r = await fetch(a.url);
      const blob = await r.blob();
      const u = URL.createObjectURL(blob);
      const el = document.createElement("a");
      el.href = u;
      el.download = a.filename;
      document.body.appendChild(el);
      el.click();
      el.remove();
      URL.revokeObjectURL(u);
    } catch {
      window.open(a.url, "_blank");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">Library</p>
          <h1 className="mt-1 font-display text-[clamp(26px,3.4vw,38px)] tracking-tight text-ink">
            Assets
          </h1>
          <p className="mt-1 text-[14px] text-ink-2">
            {loading ? "Loading…" : `${assets.length} files on Cloudflare R2`}
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 rounded-full bg-blue px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-soft hover:bg-blue-ink"
        >
          <UploadCloud className="h-4 w-4" /> Upload
        </button>
      </div>

      {/* filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-line-2 bg-white px-4 py-2.5 focus-within:border-blue">
          <Search className="h-4 w-4 text-ink-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search files…"
            className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
        <select
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          className="rounded-full border border-line-2 bg-white px-4 py-2.5 text-[13.5px] text-ink"
        >
          <option value="all">All folders</option>
          {folders.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <div className="flex rounded-full border border-line-2 bg-white p-0.5">
          {["all", "image", "video"].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "rounded-full px-3.5 py-2 text-[13px] font-medium capitalize transition-colors",
                type === t ? "bg-blue text-white" : "text-ink-2 hover:text-ink"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((a) => (
          <button
            key={a.id}
            onClick={() => setSel(a)}
            className="group overflow-hidden rounded-2xl border border-line bg-white text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <div className="relative aspect-square overflow-hidden bg-paper">
              {a.type === "video" ? (
                <>
                  <video src={a.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  <span className="absolute bottom-2 left-2 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-white">
                    <Film className="h-3.5 w-3.5" />
                  </span>
                </>
              ) : (
                <img
                  src={a.url}
                  alt={a.filename}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
            </div>
            <div className="px-3 py-2.5">
              <div className="truncate text-[12.5px] font-medium text-ink">{a.filename}</div>
              <div className="mt-0.5 flex items-center justify-between text-[11px] text-ink-3">
                <span className="truncate">{a.folder}</span>
                <span>{fmtSize(a.size_bytes)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      {!loading && filtered.length === 0 && (
        <div className="mt-10 rounded-2xl border border-line bg-white p-10 text-center text-ink-2">
          No assets match your filters.
        </div>
      )}

      {/* detail modal */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSel(null)}>
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
          <div
            className="relative grid max-h-[88vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-line bg-white shadow-card md:grid-cols-[1.3fr_1fr]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid place-items-center bg-paper p-6">
              {sel.type === "video" ? (
                <video src={sel.url} controls className="max-h-[70vh] w-full rounded-xl" />
              ) : (
                <img src={sel.url} alt={sel.filename} className="max-h-[70vh] w-auto rounded-xl object-contain" />
              )}
            </div>
            <div className="flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="break-all font-display text-xl text-ink">{sel.filename}</h2>
                <button onClick={() => setSel(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-ink/5">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <dl className="mt-5 space-y-2.5 text-[13px]">
                {[
                  ["Folder", sel.folder],
                  ["Type", sel.content_type],
                  ["Size", fmtSize(sel.size_bytes)],
                  ["Key", sel.key],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-ink-3">{k}</dt>
                    <dd className="truncate text-right font-medium text-ink">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                  Public URL
                </div>
                <button
                  onClick={() => copy(sel.url)}
                  className="flex w-full items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2.5 text-left text-[12px] text-ink-2 hover:border-ink-3"
                >
                  <span className="flex-1 truncate">{sel.url}</span>
                  {copied === sel.url ? <Check className="h-4 w-4 text-blue" /> : <Copy className="h-4 w-4 text-ink-3" />}
                </button>
              </div>

              <div className="mt-auto flex gap-2 pt-5">
                <button
                  onClick={() => download(sel)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue py-2.5 text-[13.5px] font-semibold text-white hover:bg-blue-ink"
                >
                  <Download className="h-4 w-4" /> Download
                </button>
                <a
                  href={sel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center rounded-full border border-line-2 px-4 py-2.5 text-[13.5px] font-semibold text-ink hover:border-ink-3"
                >
                  Open
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* upload (phase 2) */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-3xl border border-line bg-white p-7 text-center shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-mist text-blue">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-display text-2xl text-ink">Uploads are almost ready</h2>
            <p className="mt-2 text-[14px] text-ink-2">
              Direct upload to Cloudflare R2 ships with the publish pipeline in the next
              update — it needs a secure server function so your R2 keys never touch the browser.
            </p>
            <button
              onClick={() => setShowUpload(false)}
              className="mt-5 rounded-full bg-blue px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-blue-ink"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
