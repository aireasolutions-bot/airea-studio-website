# Module 03 — Asset Hub

> The team's media library: browse, search, filter, preview, upload, and pick images,
> videos, fonts, and documents — as a full library page and as a picker modal that every
> editor in the admin opens when a field needs media.

| | |
|---|---|
| **Depends on** | 00 Foundation · 02 File Storage (the `assets` table, `uploadOne()`, `deleteAsset()`) |
| **Used by** | 01 Website Builder (image/video fields, agent `list_assets`) · 05 Branding (custom fonts) · any content editor (blog, help centre, SEO OG images) |
| **Provides** | Assets library page · `<AssetPicker>` modal · `<AssetThumb>` · `<AssetLightbox>` · usage lookup |
| **Reference build** | AIREA Studio — `src/admin/pages/Assets.tsx`, `src/admin/AssetPicker.tsx`, `src/admin/AssetThumb.tsx` |

---

## 1. What it does

| Capability | Detail |
|---|---|
| Library grid | Every asset as a recognizable thumbnail — the **whole** image, never a crop |
| Search | By filename, instant, client-side |
| Filter | By folder and by type (image · video · font · document) |
| Detail panel | Full-size preview, metadata (folder, type, size, dimensions, uploader, date), copy public URL, download |
| Upload | Button or drag-and-drop anywhere on the page; multi-file queue; per-file progress; retry failures; choose or create a folder |
| Picker | The same library as a modal, filtered to what the field accepts, with upload built in |
| Expand | Look at any asset full-size before choosing it — separate from selecting |
| Robust states | Distinct loading, loaded, and failed-to-load states for every thumbnail |

---

## 2. How it works

```
                 ┌──────────────── assets table (Module 02) ────────────────┐
                 │  key · url · filename · type · folder · size · w × h · alt │
                 └───────────────▲───────────────────────────▲────────────────┘
                                 │ select (RLS: is_admin)     │ insert via /api/upload
     ┌───────────────────────────┴────────┐      ┌────────────┴───────────────┐
     │ Assets library page (/admin/assets)│      │ uploadOne() — Module 02    │
     │  grid · filters · detail · upload  │      │  one engine, every uploader│
     └───────────────────────────┬────────┘      └────────────▲───────────────┘
                                 │ shares                      │
     ┌───────────────────────────┴────────┐                    │
     │ <AssetPicker kind onSelect(key)>   │────── upload ──────┘
     │  used by every editor in the admin │
     └───────────────────────────┬────────┘
                                 │ onSelect(key) → the field stores the KEY
                                 ▼
                 content value = "assets/uploads/1712-a1b2c3-hero.png"
                 site renders   = resolveAsset(key) → https://assets.acme.com/assets/…
```

**Fields store the storage key, not the full URL.** `resolveAsset()` (Module 01 §6.1)
turns a key into a URL using `VITE_ASSETS_BASE_URL`. Moving to a new asset domain is then
one environment variable, not a content migration. Full URLs are also accepted, so pasted
external images keep working.

---

## 3. Brand configuration

Almost none — this module is brand-neutral admin UI. Configurable:

```ts
// src/admin/assets.config.ts
export const ASSET_HUB = {
  pageSize: 60,                  // grid pagination / virtualization window (§11)
  defaultFolder: "uploads",
  suggestedFolders: ["uploads", "brand", "product", "blog", "fonts", "social"],
  acceptByKind: {
    image: "image/*",
    video: "video/*",
    font: ".woff2,.woff,.ttf,.otf",
    document: "application/pdf",
    all: "image/*,video/*,.woff2,.woff,.ttf,.otf,application/pdf",
  },
} as const;
```

---

## 4. Data

Reads the `assets` table from Module 02. Uses two columns that the reference build stored
but never surfaced in the UI — surface them here:

- `alt` — alternative text. Editable in the detail panel (§6.4). Components rendering an
  asset should prefer the stored `alt` when the content doesn't specify one.
- `width` / `height` — shown in the detail panel; used to reserve aspect ratio.

---

## 5. Thumbnails — the part that's easy to get wrong

### 5.1 The problem

A typical marketing asset library is full of **wide screenshots of a white UI** — some 4:1.
A square grid with `object-fit: cover` crops every one of them to a white sliver of its
middle. The reference build shipped exactly that; the grid looked like rows of empty boxes
and the team couldn't tell any asset from another.

### 5.2 The rule

**Contain, don't crop.** Show the entire asset inside the tile, on a checkerboard so white
and transparent artwork has something to read against.

### 5.3 Reference: `<AssetThumb>`

```tsx
// src/admin/AssetThumb.tsx
import { useState } from "react";
import { FileText, FileWarning, Film, Type } from "lucide-react";
import { cn } from "@/lib/cn";

export function AssetThumb({ src, filename, kind = "image", className }: {
  src: string; filename: string; kind?: string | null; className?: string;
}) {
  const [state, setState] = useState<"loading" | "ok" | "error">(kind === "font" || kind === "document" ? "ok" : "loading");

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-checker", className)}>
      {state === "error" ? (
        <div className="flex flex-col items-center gap-1 px-2 text-center">
          <FileWarning className="h-5 w-5 opacity-50" />
          <span className="text-[10px] leading-tight opacity-60">Preview unavailable</span>
        </div>
      ) : kind === "font" ? (
        <div className="flex flex-col items-center gap-1"><Type className="h-6 w-6 opacity-60" /><span className="text-[10px] opacity-60">Font</span></div>
      ) : kind === "document" ? (
        <div className="flex flex-col items-center gap-1"><FileText className="h-6 w-6 opacity-60" /><span className="text-[10px] opacity-60">PDF</span></div>
      ) : kind === "video" ? (
        <video src={src} muted playsInline preload="metadata"
               className="max-h-full max-w-full object-contain"
               onLoadedMetadata={() => setState("ok")} onError={() => setState("error")} />
      ) : (
        <img src={src} alt={filename} loading="lazy" decoding="async"
             className={cn("max-h-full max-w-full object-contain transition-opacity duration-200", state === "ok" ? "opacity-100" : "opacity-0")}
             onLoad={() => setState("ok")} onError={() => setState("error")} />
      )}

      {/* a quiet shimmer while loading — so the grid never looks broken */}
      {state === "loading" && <div className="absolute inset-0 animate-pulse bg-black/[0.04]" />}

      {kind === "video" && state !== "error" && (
        <span className="absolute bottom-1.5 left-1.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-white">
          <Film className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
```

```css
/* src/index.css — checkerboard behind thumbnails */
.bg-checker {
  background-color: #fff;
  background-image:
    linear-gradient(45deg, rgba(16,24,40,.055) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(16,24,40,.055) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(16,24,40,.055) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(16,24,40,.055) 75%);
  background-size: 14px 14px;
  background-position: 0 0, 0 7px, 7px -7px, -7px 0;
}
```

Three states, three looks. In the reference build *loading*, *failed*, and *white
screenshot* all rendered as the same blank square — a large part of why the grid read as broken.

---

## 6. Assets library page (`/admin/assets`)

### 6.1 Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Assets                                          [⬆ Upload]           │
│ [🔍 Search files…]  [All folders ▾]  [All types ▾]   124 assets      │
├─────────────────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│ │ thumb  │ │ thumb  │ │ thumb  │ │ thumb  │ │ thumb  │ │ thumb  │   │
│ ├────────┤ ├────────┤ …                                             │
│ │name.png│ │name.jpg│                                               │
│ │folder·2MB│                                                        │
│ └────────┘ └────────┘                                               │
└─────────────────────────────────────────────────────────────────────┘
      drop files anywhere → full-page "Drop to upload" overlay
```

Grid: 2 columns on mobile → 6 on wide screens. Each card: `<AssetThumb className="aspect-square w-full">`,
then filename (truncated), folder and size.

### 6.2 Filtering

```ts
const folders = useMemo(() => Array.from(new Set(assets.map((a) => a.folder ?? "root"))).sort(), [assets]);
const filtered = useMemo(() => {
  const needle = q.trim().toLowerCase();
  return assets.filter((a) =>
    (!needle || a.filename.toLowerCase().includes(needle)) &&
    (folder === "all" || (a.folder ?? "root") === folder) &&
    (type === "all" || a.type === type));
}, [assets, q, folder, type]);
```

Empty state distinguishes **"No assets yet — drop files here"** from **"No assets match your filters — clear filters."**

### 6.3 Page-wide drag and drop

`dragenter`/`dragleave` fire for every child element the cursor crosses, so a naive
boolean flickers the overlay. Count depth:

```ts
const dragDepth = useRef(0);
useEffect(() => {
  const enter = (e: DragEvent) => {
    if (!e.dataTransfer?.types.includes("Files")) return;   // ignore dragged text/links
    e.preventDefault(); dragDepth.current++; setDragOver(true);
  };
  const leave = () => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragOver(false); };
  const over = (e: DragEvent) => e.preventDefault();      // required, or drop never fires
  const drop = (e: DragEvent) => {
    e.preventDefault(); dragDepth.current = 0; setDragOver(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) openUploadModal(files);
  };
  addEventListener("dragenter", enter); addEventListener("dragleave", leave);
  addEventListener("dragover", over);   addEventListener("drop", drop);
  return () => { removeEventListener("dragenter", enter); removeEventListener("dragleave", leave);
                 removeEventListener("dragover", over);   removeEventListener("drop", drop); };
}, []);
```

### 6.4 Detail panel

Opens on card click. Shows:

- Full-size preview (`object-contain`, `max-h-[70vh]`, on `bg-checker`); `<video controls>` for video.
- Metadata: folder · type · size · dimensions · uploaded by · date · key.
- **Public URL** with one-click copy (and a "Copied" confirmation).
- **Alt text** field — saves to `assets.alt` on blur. Hint: *"Describe what's in the image
  for screen readers and search engines."*
- **Download** (fetch as blob → object URL → temporary `<a download>`; direct links to a
  cross-origin URL ignore the `download` attribute).
- **Delete** (owner/admin only) — see §6.6.

### 6.5 Upload modal

- Opens from the Upload button (file input) or a page drop (pre-filled).
- **Folder:** choose existing, or "New folder…" inline (slugified: lowercase, `a-z0-9/_-`).
- **Queue:** each file shows a thumbnail preview (`URL.createObjectURL`), name, size,
  status (`queued → uploading → done | error`), and a progress bar (indeterminate for small files).
- **Sequential** upload through `uploadOne()` — predictable, easy on the network, clear progress.
  (Parallelism of 2–3 is a fine upgrade.)
- **Failures stay in the queue** with the server's message and a **Retry**; successes refresh the grid.
- Revoke every object URL on close.

### 6.6 Delete — check usage first

Deleting an asset the live site still references produces a broken image. Before deleting,
search every place a key or URL can live. Do it in the database — content values are
`jsonb`, and text-matching them needs a cast that PostgREST filters can't express:

```sql
-- One function that knows every table content can live in. Extend it as you add modules.
create or replace function public.asset_usages(p_key text, p_url text)
returns table (source text, ref text)
language sql stable security definer set search_path to 'public' as $$
  select 'Site content', key from content_blocks
   where is_admin()
     and (draft_value::text ilike '%' || p_key || '%' or published_value::text ilike '%' || p_key || '%'
       or draft_value::text ilike '%' || p_url || '%' or published_value::text ilike '%' || p_url || '%')
  -- union all
  -- select 'Blog post', slug from blog_posts where is_admin() and (cover_image ilike … or body ilike …)
  -- union all
  -- select 'SEO', path from seo_meta where is_admin() and og_image ilike …
$$;
grant execute on function public.asset_usages(text, text) to authenticated;
```

```ts
// src/admin/lib/assetUsage.ts
export async function findUsages(a: { key: string; url: string }): Promise<string[]> {
  const { data, error } = await supabase!.rpc("asset_usages", { p_key: a.key, p_url: a.url });
  if (error) throw new Error(`Couldn't check where this asset is used: ${error.message}`);
  return (data ?? []).map((r: { source: string; ref: string }) => `${r.source} · ${r.ref}`);
}
```

`is_admin()` inside the function matters: it's `SECURITY DEFINER`, so without that check
anyone with the anon key could probe your content through it.

If usages exist, show them and require a second, explicit confirmation ("Delete anyway —
these places will show a broken image"). Then call `deleteAsset(key)` (Module 02).

---

## 7. `<AssetPicker>` — the modal every editor uses

### 7.1 Contract

```ts
type AssetPickerProps = {
  open: boolean;
  kind?: "image" | "video" | "font" | "document" | "all";   // default "image"
  onClose: () => void;
  onSelect: (key: string, asset: Asset) => void;             // store the KEY
};
```

Callers store the **key** they receive (§2). Examples:

| Caller | On select |
|---|---|
| Site Editor image field / canvas click | `writeMany({ [fieldKey]: { value: key, type: "image" } })` |
| Blog / help centre markdown editor | Insert `![](<resolved url>)` at the cursor |
| Blog cover / SEO OG image | Set the field to the resolved URL |
| Design Studio custom font | Add to `fonts.customs` (Module 05) |

### 7.2 Behaviour

- Loads `assets` filtered by `kind` (unless `all`), newest first.
- Search box; grid of `<AssetThumb>` tiles, 3 → 5 columns.
- **Select** = click the tile. Selects and closes.
- **Expand** = a button in the tile's top-right, visible on hover **and keyboard focus**.
  Opens a lightbox with the full asset and **"Use this image"**. Expanding never selects.
- **Upload** button in the header, accepting `acceptByKind[kind]`, through `uploadOne()`,
  showing `Uploading 42%`. On success: reload, then `onSelect` the new key and close.
- **Esc closes the lightbox first**, then the picker — not both at once.

### 7.3 Reference implementation

```tsx
// src/admin/AssetPicker.tsx
export function AssetPicker({ open, kind = "image", onClose, onSelect }: {
  open: boolean; kind?: "image" | "video" | "font" | "document" | "all";
  onClose: () => void; onSelect: (key: string, asset: Asset) => void;
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState<Asset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    let query = supabase!.from("assets").select("*").order("created_at", { ascending: false });
    if (kind !== "all") query = query.eq("type", kind);
    const { data } = await query;
    setAssets((data as Asset[]) ?? []);
  };
  useEffect(() => { if (open) load(); }, [open, kind]);

  // Layered Esc: lightbox first, then the picker.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (zoom) { e.stopPropagation(); setZoom(null); } else onClose();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open, zoom, onClose]);

  const choose = (a: Asset) => { onSelect(a.key, a); setZoom(null); onClose(); };

  const upload = async (file: File) => {
    setErr(""); setUploading(true); setProgress(0);
    try {
      const key = await uploadOne(file, "uploads", setProgress);     // the ONE engine
      await load();
      const { data } = await supabase!.from("assets").select("*").eq("key", key).maybeSingle();
      if (data) choose(data as Asset);
    } catch (e) {
      setErr((e as Error).message || "Upload failed");
    } finally { setUploading(false); setProgress(0); }
  };

  if (!open) return null;
  const shown = assets.filter((a) => a.filename.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
           onClick={(e) => e.stopPropagation()}>
        {/* header: title · upload · close */}
        <div className="flex items-center gap-3 border-b px-5 py-3.5">
          <h2 className="text-xl font-semibold">Choose {kind === "video" ? "a video" : kind === "font" ? "a font" : "an image"}</h2>
          <div className="ml-auto flex items-center gap-2">
            <input ref={fileRef} type="file" hidden accept={ASSET_HUB.acceptByKind[kind]}
                   onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="rounded-full bg-blue-600 px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
              {uploading ? (progress > 0 ? `Uploading ${Math.round(progress * 100)}%` : "Uploading…") : "Upload"}
            </button>
            <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-black/5">✕</button>
          </div>
        </div>

        <div className="border-b px-5 py-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files…"
                 className="w-full rounded-full border px-4 py-2 text-[14px] outline-none" />
          {err && <p className="mt-2 text-[12.5px] text-red-600">{err}</p>}
        </div>

        {/* grid */}
        <div className="grid grid-cols-3 gap-2.5 overflow-y-auto p-5 sm:grid-cols-4 md:grid-cols-5">
          {shown.map((a) => (
            <div key={a.id} className="group relative overflow-hidden rounded-xl border bg-white transition hover:-translate-y-0.5 hover:shadow-md">
              <button onClick={() => choose(a)} title={`Use ${a.filename}`} className="block w-full text-left">
                <AssetThumb src={resolveAsset(a.key)} filename={a.filename} kind={a.type} className="aspect-square w-full" />
                <div className="truncate px-2 py-1.5 text-[10.5px] opacity-70">{a.filename}</div>
              </button>
              {/* Expand is separate from select: looking closer must not commit. */}
              <button onClick={(e) => { e.stopPropagation(); setZoom(a); }} title="Expand" aria-label={`Expand ${a.filename}`}
                      className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg bg-white/90 opacity-0 shadow transition-opacity focus:opacity-100 group-hover:opacity-100">
                ⤢
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* lightbox */}
      {zoom && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/80 p-6 backdrop-blur-sm"
             onClick={(e) => { e.stopPropagation(); setZoom(null); }}>
          <div className="flex max-h-[70vh] max-w-[90vw] items-center justify-center overflow-hidden rounded-2xl bg-checker p-2"
               onClick={(e) => e.stopPropagation()}>
            {zoom.type === "video"
              ? <video src={resolveAsset(zoom.key)} controls playsInline className="max-h-[66vh] max-w-full rounded-xl" />
              : <img src={resolveAsset(zoom.key)} alt={zoom.alt || zoom.filename} className="max-h-[66vh] max-w-full rounded-xl object-contain" />}
          </div>
          <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <span className="max-w-[46ch] truncate text-[13px] text-white/90">{zoom.filename}</span>
            {zoom.width && zoom.height && <span className="text-[12px] text-white/60">{zoom.width}×{zoom.height}</span>}
            <button onClick={() => choose(zoom)} className="rounded-full bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white">
              Use this {zoom.type === "video" ? "video" : "image"}
            </button>
            <button onClick={() => setZoom(null)} className="rounded-full bg-white/15 px-4 py-2 text-[13px] font-semibold text-white">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 7.4 Agent access

The AI Builder agent (Module 01 §15) gets a `list_assets(query?)` tool returning
`{ filename, url, type, width, height, alt }` for matches, so it uses real uploaded images by
their exact URL instead of inventing paths.

---

## 8. Security

- Reads are RLS-gated to admins; the public site never queries `assets` — it only renders
  URLs already stored in published content.
- Uploads and deletes go through Module 02's endpoint (`requireAdmin`; delete requires owner/admin).
- Hide the Delete button for editors — and enforce it server-side regardless.
- Alt text is rendered as an attribute, never as HTML.

---

## 9. Nuances & hard-won lessons

1. **`object-contain`, never `object-cover`**, for a library thumbnail (§5). Cropping is
   right for decorative imagery on the site; it is wrong where the job is identification.
2. **Checkerboard background** so white and transparent assets are visible.
3. **Three visual states** — loading, loaded, failed — each distinct.
4. **One upload engine** (Module 02 §7). The picker and the library must import the same function.
5. **Expand ≠ select.** Two controls. Looking closer should never commit a choice.
6. **Layered Esc.** Inner overlay first.
7. **Expand must be keyboard-reachable** (`focus:opacity-100`), not hover-only.
8. **Store keys, render with `resolveAsset()`** — domain changes stay one env var.
9. **Drag depth counter** or the drop overlay flickers.
10. **`download` attribute is ignored cross-origin** — fetch as a blob first.
11. **Check usage before delete.**
12. **Capture dimensions at upload** — the reference build added this late and ended up with
    89 of 98 assets missing dimensions. Backfill: load each image in the browser, read
    `naturalWidth/Height`, update the row (a one-off admin action).

---

## 10. Productization upgrades

| Upgrade | Why | Sketch |
|---|---|---|
| **Delete with usage scan** | Not in the reference build | §6.6 |
| **Alt text editing** | Column existed, never surfaced | §6.4; also expose to the agent |
| **Dimension backfill** | Legacy rows missing w × h | One-click "Scan dimensions" action |
| **Bulk select** | Move, delete, re-folder many at once | Checkbox mode + action bar |
| **Rename & move** | Tidy folders | Update `filename`/`folder` only — keys stay stable |
| **Sort** | Newest · oldest · name · size | Client-side on the loaded set |
| **Usage count badge** | See what's safe to clean up | Cache `findUsages` counts |
| **Virtualized grid** | 1,000+ assets | `react-window`, or paginate by `created_at` cursor |
| **Paste to upload** | Screenshots straight from the clipboard | `paste` listener → `clipboardData.files` |
| **Image editing** | Crop to a ratio before insert | Canvas crop → upload the result as a new asset |

---

## 11. Acceptance tests

- [ ] A 4:1 white screenshot is fully visible and identifiable in the grid (not a white square).
- [ ] A transparent PNG logo is visible against the checkerboard.
- [ ] A broken URL shows "Preview unavailable", distinct from the loading shimmer.
- [ ] Search, folder, and type filters combine correctly; the empty state distinguishes "none" from "no matches."
- [ ] Dragging files over the page shows the overlay without flicker; dropping opens the queue with them.
- [ ] Uploading five files shows per-file progress; one failure stays in the queue with its message and retries.
- [ ] A new folder created during upload appears in the folder filter.
- [ ] Detail panel copies the public URL; download saves the file; alt text persists after reload.
- [ ] The picker filtered to `video` shows only videos.
- [ ] Expand (mouse and keyboard) opens the lightbox; "Use this image" selects; Close and Esc do not select.
- [ ] Esc with the lightbox open closes only the lightbox.
- [ ] Uploading an 80 MB video from inside the picker works (proves the shared engine).
- [ ] Deleting an asset used in published content lists where it's used and requires a second confirmation.
- [ ] An editor sees no Delete button; a forged delete request returns 403.

---

## 12. Build plan

1. `AssetThumb` + `.bg-checker` (§5).
2. Library page: load, grid, search/folder/type filters, empty states (§6.1–6.2).
3. Detail panel: preview, metadata, copy URL, download, alt text (§6.4).
4. Upload modal: queue, folders, progress, retry via `uploadOne` (§6.5).
5. Page-wide drag and drop (§6.3).
6. `AssetPicker` with expand/lightbox, upload-in-picker, layered Esc (§7).
7. Wire the picker into Module 01's image/video fields and canvas clicks.
8. Usage lookup + guarded delete (§6.6).
9. `list_assets` tool for the agent (§7.4).
10. Run §11.
