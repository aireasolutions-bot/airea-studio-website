import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Download, Film, FolderPlus, Loader2, RefreshCw, Search, UploadCloud, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";

/* ---------- upload engine ----------
 * ≤ 3 MB: base64 through /api/upload (fits Vercel's body limit).
 * > 3 MB: presigned PUT straight from the browser to R2 (any size, real
 * progress) + a register call that files it in the library. R2 keys stay
 * server-side in both paths. */

const DIRECT_THRESHOLD = 3 * 1024 * 1024;

type UploadItem = {
  id: string;
  file: File;
  preview: string;
  progress: number; // 0..1, -1 = indeterminate
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase!.auth.getSession();
  return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` };
}

// Pixel dimensions for the library (images + videos), best-effort.
function readDimensions(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (d: { width?: number; height?: number }) => {
      URL.revokeObjectURL(url);
      resolve(d);
    };
    if (file.type.startsWith("video")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => done({ width: v.videoWidth, height: v.videoHeight });
      v.onerror = () => done({});
      v.src = url;
    } else if (file.type.startsWith("image")) {
      const img = new Image();
      img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => done({});
      img.src = url;
    } else {
      done({});
    }
  });
}

function putWithProgress(url: string, file: File, onProgress: (f: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage answered ${xhr.status}`)));
    xhr.onerror = () =>
      reject(
        new Error(
          "The browser couldn't reach storage — for files over 3 MB the R2 bucket's CORS rules must allow PUT (one-time Cloudflare tweak). Ping Nicolas."
        )
      );
    xhr.send(file);
  });
}

async function uploadOne(file: File, folder: string, onProgress: (f: number) => void): Promise<void> {
  const dims = await readDimensions(file);
  if (file.size <= DIRECT_THRESHOLD) {
    onProgress(-1); // no granular progress on the base64 path
    const dataBase64 = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1] ?? "");
      r.onerror = () => rej(new Error("Couldn't read the file"));
      r.readAsDataURL(file);
    });
    const resp = await fetch("/api/upload", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ filename: file.name, contentType: file.type, folder, dataBase64, ...dims }),
    });
    if (!resp.ok) throw new Error((await resp.json().catch(() => ({})))?.error || `Upload failed (${resp.status})`);
    return;
  }
  // large file → presign → direct PUT → register
  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ presign: { filename: file.name, contentType: file.type, folder } }),
  });
  if (!presignRes.ok) throw new Error((await presignRes.json().catch(() => ({})))?.error || `Couldn't prepare the upload (${presignRes.status})`);
  const { uploadUrl, key } = await presignRes.json();
  await putWithProgress(uploadUrl, file, onProgress);
  const regRes = await fetch("/api/upload", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ register: { key, filename: file.name, contentType: file.type, folder, sizeBytes: file.size, ...dims } }),
  });
  if (!regRes.ok) throw new Error((await regRes.json().catch(() => ({})))?.error || "Uploaded, but couldn't register it — refresh and check.");
}

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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false });
    setAssets((data as Asset[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Drop files anywhere on the page → upload modal opens pre-filled.
  useEffect(() => {
    const enter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      dragDepth.current++;
      setDragOver(true);
      e.preventDefault();
    };
    const leave = (e: DragEvent) => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragOver(false);
      e.preventDefault();
    };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragOver(false);
      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => /^(image|video)\//.test(f.type));
      if (files.length) {
        setPendingFiles(files);
        setShowUpload(true);
      }
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
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

      {/* page-wide drop hint */}
      {dragOver && !showUpload && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-blue/10 backdrop-blur-[2px]">
          <div className="rounded-3xl border-2 border-dashed border-blue bg-white px-10 py-8 text-center shadow-card">
            <UploadCloud className="mx-auto h-8 w-8 text-blue" />
            <div className="mt-2 text-[15px] font-semibold text-ink">Drop to upload</div>
          </div>
        </div>
      )}

      {/* upload */}
      {showUpload && (
        <UploadModal
          folders={folders.filter((f) => f !== "root")}
          initialFiles={pendingFiles}
          onClose={() => {
            setShowUpload(false);
            setPendingFiles([]);
          }}
          onUploaded={refresh}
        />
      )}
    </div>
  );
}

/* The real uploader: pick or drop files (images & video), choose/create a
 * folder, watch per-file progress, then the grid refreshes. */
function UploadModal({ folders, initialFiles, onClose, onUploaded }: { folders: string[]; initialFiles: File[]; onClose: () => void; onUploaded: () => void }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [folder, setFolder] = useState("uploads");
  const [newFolder, setNewFolder] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uid = () => Math.random().toString(36).slice(2, 9);

  const addFiles = useCallback((files: File[] | FileList | null) => {
    if (!files) return;
    const list = Array.from(files).filter((f) => /^(image|video)\//.test(f.type));
    setItems((prev) => [
      ...prev,
      ...list.map((file) => ({ id: uid(), file, preview: URL.createObjectURL(file), progress: 0, status: "queued" as const })),
    ]);
  }, []);

  useEffect(() => {
    addFiles(initialFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveFolder = (creatingFolder && newFolder.trim() ? newFolder.trim().toLowerCase().replace(/[^a-z0-9/_-]/g, "-") : folder) || "uploads";
  const queued = items.filter((i) => i.status === "queued" || i.status === "error");
  const doneCount = items.filter((i) => i.status === "done").length;

  const start = async () => {
    if (running || queued.length === 0) return;
    setRunning(true);
    for (const item of items) {
      if (item.status === "done" || item.status === "uploading") continue;
      setItems((p) => p.map((x) => (x.id === item.id ? { ...x, status: "uploading", progress: 0, error: undefined } : x)));
      try {
        await uploadOne(item.file, effectiveFolder, (f) =>
          setItems((p) => p.map((x) => (x.id === item.id ? { ...x, progress: f } : x)))
        );
        setItems((p) => p.map((x) => (x.id === item.id ? { ...x, status: "done", progress: 1 } : x)));
        onUploaded();
      } catch (e) {
        setItems((p) => p.map((x) => (x.id === item.id ? { ...x, status: "error", error: (e as Error).message } : x)));
      }
    }
    setRunning(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !running && onClose()}>
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
      <div className="relative flex max-h-[88vh] w-full max-w-xl flex-col rounded-3xl border border-line bg-white shadow-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 pb-0">
          <div>
            <h2 className="font-display text-2xl text-ink">Upload to the Asset hub</h2>
            <p className="mt-1 text-[13px] text-ink-2">Images & video · any size · stored on the CDN, usable anywhere on the site.</p>
          </div>
          <button onClick={() => !running && onClose()} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-ink/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* dropzone */}
          <button
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            className="grid w-full place-items-center rounded-2xl border-2 border-dashed border-line-2 bg-canvas px-6 py-8 text-center transition-colors hover:border-blue"
          >
            <UploadCloud className="h-7 w-7 text-blue" />
            <span className="mt-2 text-[14px] font-semibold text-ink">Click to choose files — or drop them here</span>
            <span className="mt-0.5 text-[12px] text-ink-3">PNG, JPG, WebP, GIF, MP4, WebM…</span>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          </button>

          {/* folder */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium uppercase tracking-wide text-ink-3">Folder</span>
            {creatingFolder ? (
              <input
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                placeholder="new-folder-name"
                autoFocus
                className="w-44 rounded-lg border border-blue bg-white px-2.5 py-1.5 text-[13px] text-ink outline-none"
              />
            ) : (
              <select
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                className="rounded-lg border border-line-2 bg-white px-2.5 py-1.5 text-[13px] text-ink"
              >
                {!folders.includes("uploads") && <option value="uploads">uploads</option>}
                {folders.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setCreatingFolder((v) => !v)}
              title={creatingFolder ? "Pick an existing folder" : "New folder"}
              className={cn("flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold", creatingFolder ? "text-ink-2 hover:text-ink" : "text-blue hover:bg-blue-mist")}
            >
              <FolderPlus className="h-3.5 w-3.5" /> {creatingFolder ? "existing" : "new"}
            </button>
          </div>

          {/* files */}
          {items.length > 0 && (
            <ul className="space-y-2">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 rounded-xl border border-line-2 bg-canvas p-2.5">
                  {it.file.type.startsWith("video") ? (
                    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink text-white">
                      <Film className="h-4 w-4" />
                    </span>
                  ) : (
                    <img src={it.preview} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-ink">{it.file.name}</span>
                      <span className="shrink-0 text-[11px] text-ink-3">{fmtSize(it.file.size)}</span>
                    </div>
                    {it.status === "uploading" && (
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                        <div
                          className={cn("h-full rounded-full bg-blue transition-all", it.progress < 0 && "w-1/3 animate-pulse")}
                          style={it.progress >= 0 ? { width: `${Math.round(it.progress * 100)}%` } : undefined}
                        />
                      </div>
                    )}
                    {it.status === "error" && (
                      <div className="mt-1 flex items-start gap-1 text-[11.5px] text-critical">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {it.error}
                      </div>
                    )}
                  </div>
                  {it.status === "done" ? (
                    <Check className="h-4.5 w-4.5 shrink-0 text-blue" />
                  ) : it.status === "uploading" ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-3" />
                  ) : (
                    <button
                      onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-3 hover:text-critical"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line p-4">
          <span className="text-[12.5px] text-ink-3">
            {doneCount > 0 && `${doneCount} uploaded`}
            {doneCount > 0 && queued.length > 0 && " · "}
            {queued.length > 0 && `${queued.length} ready`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => !running && onClose()}
              disabled={running}
              className="rounded-full border border-line-2 px-4 py-2 text-[13.5px] font-semibold text-ink hover:border-ink-3 disabled:opacity-50"
            >
              {doneCount > 0 && queued.length === 0 ? "Done" : "Cancel"}
            </button>
            <button
              onClick={start}
              disabled={running || queued.length === 0}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold text-white",
                running || queued.length === 0 ? "cursor-not-allowed bg-ink-3" : "bg-blue hover:bg-blue-ink"
              )}
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {running ? "Uploading…" : `Upload ${queued.length || ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
