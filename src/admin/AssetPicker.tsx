import { useEffect, useRef, useState } from "react";
import { Loader2, Search, UploadCloud, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resolveAsset } from "@/content/ContentProvider";

type Asset = { id: string; key: string; filename: string; url: string; folder: string | null };

export function AssetPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (key: string) => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("assets")
      .select("id,key,filename,url,folder")
      .eq("type", "image")
      .order("created_at", { ascending: false });
    setAssets((data as Asset[]) ?? []);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const upload = async (file: File) => {
    setErr("");
    setUploading(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const { data: s } = await supabase!.auth.getSession();
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder: "uploads",
          dataBase64,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || `Upload failed (${res.status})`);
      const out = await res.json();
      await load();
      onSelect(out.key);
      onClose();
    } catch (e) {
      setErr(
        e instanceof Error && e.message.includes("404")
          ? "Upload runs on the deployed site (needs the serverless function). Pick an existing asset for now."
          : (e as Error).message
      );
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;
  const filtered = assets.filter((a) => a.filename.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <h2 className="font-display text-xl text-ink">Choose an image</h2>
          <div className="ml-auto flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 rounded-full bg-blue px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-blue-ink disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Upload
            </button>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-ink/5">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="border-b border-line px-5 py-3">
          <div className="flex items-center gap-2 rounded-full border border-line-2 bg-canvas px-3.5 py-2">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search images…"
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-ink-3"
            />
          </div>
          {err && <p className="mt-2 text-[12.5px] text-critical">{err}</p>}
        </div>
        <div className="grid grid-cols-3 gap-2.5 overflow-y-auto p-5 sm:grid-cols-4 md:grid-cols-5">
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                onSelect(a.key);
                onClose();
              }}
              className="group overflow-hidden rounded-xl border border-line bg-paper transition-all hover:-translate-y-0.5 hover:border-blue/40 hover:shadow-card"
            >
              <img src={resolveAsset(a.key)} alt={a.filename} loading="lazy" className="aspect-square w-full object-cover" />
              <div className="truncate px-2 py-1.5 text-[10.5px] text-ink-2">{a.filename}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
