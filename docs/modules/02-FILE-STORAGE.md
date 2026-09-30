# Module 02 — File Storage

> Secure, any-size uploads from the admin into S3-compatible object storage (Cloudflare R2
> in the reference build), served from a CDN, indexed in the database — with storage
> credentials that never reach the browser.

| | |
|---|---|
| **Depends on** | 00 Foundation |
| **Required by** | 03 Asset Hub · 05 Branding (custom fonts) · 01 Website Builder (agent attachments) |
| **Provides** | `assets` table · `POST /api/upload` (presign · register · small-file · delete) · `uploadOne()` client engine · same-origin font proxy |
| **Reference build** | AIREA Studio — production, R2 bucket + `r2.dev` public URL |

---

## 1. What it does

| Capability | Detail |
|---|---|
| Any-size uploads | Large files go **directly from the browser to storage** via a short-lived signed URL. No server body limit applies. |
| Real progress | Per-file upload percentage for large files. |
| Simple small-file path | Files ≤ 3 MB go through the API as base64 — no CORS dependency. |
| Verified registration | A file only enters the library after the server confirms it actually landed in storage. |
| Type and size policy | Allowlisted MIME types, per-type size caps, enforced **server-side** from storage metadata. |
| Immutable CDN caching | Every object is written with `Cache-Control: public, max-age=31536000, immutable`. |
| Font proxy | Custom brand fonts served same-origin so `@font-face` works despite storage CORS limits. |
| Audit | Every upload and delete logged with actor, size, type, key. |

---

## 2. How it works

```
                         ┌──────────────── ≤ 3 MB ─────────────────┐
Browser (admin) ─ file ─►│ POST /api/upload { dataBase64, … }      │─► server PUTs to storage ─► insert assets row
                         └──────────────────────────────────────────┘

                         ┌──────────────── > 3 MB ─────────────────┐
                         │ 1. POST /api/upload { presign }          │─► server signs a PUT URL (15 min)
Browser (admin) ─ file ─►│ 2. PUT <signedUrl>  (XHR, progress)      │─► straight into storage (no server)
                         │ 3. POST /api/upload { register: {key} }  │─► server HEADs the object, validates
                         └──────────────────────────────────────────┘      type + size from STORAGE, inserts row
```

**Why keep the small-file path at all?** It has no CORS dependency, so small uploads keep
working even when bucket CORS is misconfigured — which is exactly when the team needs to
upload a screenshot of the error.

**Why register as a separate step?** The browser upload might fail, be abandoned, or be
spoofed. Only an object the server has *seen in storage* becomes an asset row.

---

## 3. Brand configuration

```ts
// src/lib/storage.config.ts (shared by client + server)
export const STORAGE = {
  keyPrefix: "assets",                 // every object lives under this prefix
  defaultFolder: "uploads",
  directThreshold: 3 * 1024 * 1024,    // above this → presigned direct upload
  presignTtlSeconds: 900,              // 15 min to complete the PUT
  types: {
    image:    { mimes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/svg+xml"], maxBytes: 25 * 1024 * 1024 },
    video:    { mimes: ["video/mp4", "video/webm", "video/quicktime"],                                        maxBytes: 500 * 1024 * 1024 },
    font:     { mimes: ["font/woff2", "font/woff", "font/ttf", "font/otf", "application/font-woff2", "application/x-font-ttf"], maxBytes: 5 * 1024 * 1024 },
    document: { mimes: ["application/pdf"],                                                                     maxBytes: 50 * 1024 * 1024 },
  },
  fontProxyPath: "/brandfonts",        // same-origin proxy for @font-face (§8)
} as const;

export type AssetKind = keyof typeof STORAGE.types;

export function kindOf(mime: string): AssetKind | null {
  for (const [kind, t] of Object.entries(STORAGE.types)) if ((t.mimes as readonly string[]).includes(mime)) return kind as AssetKind;
  return null;
}
```

Fonts often arrive with an empty or wrong MIME type from the browser. Fall back on
extension for fonts only: `.woff2 → font/woff2`, `.woff → font/woff`, `.ttf → font/ttf`,
`.otf → font/otf`.

---

## 4. Provider setup (Cloudflare R2)

Any S3-compatible store works (R2, AWS S3, Backblaze B2, MinIO). R2 has no egress fees.

### 4.1 Bucket and public access

1. Create a bucket (e.g. `acme-site`).
2. **Public access — pick one:**
   - **Custom domain** (`assets.acme.com`) — *recommended for production.* Bucket CORS
     applies, caching is under your control, URLs are on-brand.
   - **`r2.dev` URL** — fine to start, but **ignores bucket CORS for GET** (§10.1), is
     rate-limited, and isn't meant for production traffic.

### 4.2 API tokens — two, with different scopes

| Token | Permission | Where it lives | Used for |
|---|---|---|---|
| **App token** | Object Read & Write, this bucket only | Vercel env (server) | Uploads, HEAD, delete |
| **Admin token** | Admin Read & Write | Nowhere — use once, then delete | Setting bucket CORS |

An **object-scoped** token returns `AccessDenied` on `PutBucketCors`/`GetBucketCors` even
though it can read and write files (§10.3). Setting CORS in the dashboard needs no token at all.

### 4.3 Bucket CORS — required for direct uploads

Dashboard → R2 → bucket → Settings → CORS Policy:

```json
[
  {
    "AllowedOrigins": [
      "https://acme.com",
      "https://www.acme.com",
      "https://acme-site.vercel.app",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**`PUT` is the one people forget.** Without it the browser's preflight is refused and large
uploads fail with an error message that explains nothing.

### 4.4 Environment

| Variable | Scope | Example |
|---|---|---|
| `R2_ENDPOINT` | server | `https://<accountid>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | server, **secret** | app token key id |
| `R2_SECRET_ACCESS_KEY` | server, **secret** | app token secret |
| `R2_BUCKET` | server | `acme-site` |
| `R2_PUBLIC_URL` | server | `https://assets.acme.com` (no trailing slash) |
| `VITE_ASSETS_BASE_URL` | client | same as `R2_PUBLIC_URL` — used by `resolveAsset()` |

---

## 5. Data model

```sql
create table public.assets (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,     -- object key in storage: assets/<folder>/<ts>-<rand>-<name>
  filename     text not null,            -- sanitized original name
  url          text not null,            -- public URL
  type         text,                     -- image | video | font | document
  content_type text,                     -- MIME, from STORAGE metadata
  folder       text,
  size_bytes   bigint,                   -- from STORAGE metadata
  width        integer,                  -- images/videos, best effort from the client
  height       integer,
  alt          text,                     -- accessibility + SEO (edited in Module 03)
  uploaded_by  text,
  created_at   timestamptz not null default now()
);
create index assets_created on public.assets (created_at desc);
create index assets_folder  on public.assets (folder);
alter table public.assets enable row level security;
create policy p_assets on public.assets for all using (is_admin()) with check (is_admin());
```

The server writes with the service role; the admin UI reads under RLS.

---

## 6. Server — `POST /api/upload`

One function, four modes, selected by body shape. Multiplexing keeps the function count
down (plans cap it).

### 6.1 Contracts

| Mode | Request body | Response |
|---|---|---|
| **small** | `{ filename, contentType, dataBase64, folder?, width?, height? }` | `{ key, url }` |
| **presign** | `{ presign: { filename, contentType, size, folder? } }` | `{ uploadUrl, key, contentType, url, expiresIn }` |
| **register** | `{ register: { key, filename, folder?, width?, height? } }` | `{ key, url, asset }` |
| **delete** | `{ delete: { key } }` | `{ ok: true }` |

All modes: `Authorization: Bearer <admin access token>`. Errors: `{ error: "<actionable sentence>" }`
with 400 / 401 / 403 / 413 / 415 / 503.

### 6.2 Reference implementation (hardened)

Differences from the reference build, all deliberate:
- uses the shared `requireAdmin()` (the original had a second, case-sensitive check);
- MIME allowlist and per-type size caps;
- `register` trusts **storage** metadata (HEAD), not what the client claims;
- random suffix in keys;
- a `delete` mode gated to owner/admin.

```ts
// api/upload.ts
import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAdmin } from "./_lib/admin.js";
import { logActivity, reqMeta } from "./_lib/activity.js";
import { STORAGE, kindOf } from "../src/lib/storage.config.js";

const safeName = (name: string) => String(name).replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "file";
const safeFolder = (f: unknown) => String(f || STORAGE.defaultFolder).toLowerCase().replace(/[^a-z0-9/_-]/g, "").replace(/\/{2,}/g, "/").replace(/^\/|\/$/g, "") || STORAGE.defaultFolder;
const rand = () => Math.random().toString(36).slice(2, 8);
const newKey = (folder: string, filename: string) => `${STORAGE.keyPrefix}/${safeFolder(folder)}/${Date.now()}-${rand()}-${safeName(filename)}`;

function fontMime(filename: string, given: string): string {
  if (given && kindOf(given)) return given;
  const ext = filename.toLowerCase().split(".").pop();
  return ({ woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" } as Record<string, string>)[ext ?? ""] ?? given;
}

function policyError(mime: string, size: number): { status: number; error: string } | null {
  const kind = kindOf(mime);
  if (!kind) return { status: 415, error: `That file type (${mime || "unknown"}) isn't allowed. Images, videos, fonts and PDFs only.` };
  const max = STORAGE.types[kind].maxBytes;
  if (size > max) return { status: 413, error: `That ${kind} is ${(size / 1048576).toFixed(1)} MB — the limit is ${Math.round(max / 1048576)} MB.` };
  return null;
}

function env() {
  const e = process.env;
  const ok = e.R2_ENDPOINT && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY && e.R2_BUCKET && e.R2_PUBLIC_URL;
  return ok ? {
    bucket: e.R2_BUCKET!, publicUrl: e.R2_PUBLIC_URL!.replace(/\/$/, ""),
    s3: new S3Client({ region: "auto", endpoint: e.R2_ENDPOINT, credentials: { accessKeyId: e.R2_ACCESS_KEY_ID!, secretAccessKey: e.R2_SECRET_ACCESS_KEY! } }),
  } : null;
}

async function insertAsset(row: Record<string, unknown>) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/assets?on_conflict=key`, {
    method: "POST",
    headers: { apikey: SUPABASE_SERVICE_ROLE!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
               "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([row]),
  });
  if (!res.ok) throw new Error(`Couldn't record the asset (${res.status}).`);
  return (await res.json())[0];
}

async function isManager(token: string): Promise<boolean> {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin_manager`, {
    method: "POST", headers: { apikey: SUPABASE_SERVICE_ROLE!, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: "{}",
  });
  return r.ok && (await r.json().catch(() => false)) === true;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = await requireAdmin(req);
  if ("error" in auth) return res.status(auth.status).json({ error: auth.error });

  const cfg = env();
  if (!cfg) return res.status(503).json({ error: "Storage isn't configured — set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL." });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
  const meta = reqMeta(req);

  // ── presign: browser → storage directly, any size ───────────────────────
  if (body.presign) {
    const { filename, size } = body.presign;
    if (!filename) return res.status(400).json({ error: "Missing filename." });
    const mime = fontMime(filename, String(body.presign.contentType || ""));
    const bad = policyError(mime, Number(size) || 0);          // early check for UX; enforced again at register
    if (bad) return res.status(bad.status).json({ error: bad.error });
    const key = newKey(body.presign.folder, filename);
    const uploadUrl = await getSignedUrl(cfg.s3, new PutObjectCommand({
      Bucket: cfg.bucket, Key: key, ContentType: mime,          // signed: the PUT must send this exact type
      CacheControl: "public, max-age=31536000, immutable",
    }), { expiresIn: STORAGE.presignTtlSeconds });
    // Return the (possibly normalized) type: the browser MUST PUT with exactly this.
    return res.status(200).json({ uploadUrl, key, contentType: mime, url: `${cfg.publicUrl}/${key}`, expiresIn: STORAGE.presignTtlSeconds });
  }

  // ── register: only what actually landed, validated from storage ─────────
  if (body.register) {
    const { key, filename, width, height } = body.register;
    if (!key || !String(key).startsWith(`${STORAGE.keyPrefix}/`)) return res.status(400).json({ error: "Missing or invalid key." });
    let head;
    try { head = await cfg.s3.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key })); }
    catch { return res.status(400).json({ error: "That upload never reached storage — try again." }); }

    const mime = String(head.ContentType || "");
    const size = Number(head.ContentLength || 0);
    const bad = policyError(mime, size);
    if (bad) {
      await cfg.s3.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key })).catch(() => {});
      return res.status(bad.status).json({ error: bad.error });
    }
    const asset = await insertAsset({
      key, url: `${cfg.publicUrl}/${key}`, filename: safeName(filename || key.split("/").pop()!),
      type: kindOf(mime), content_type: mime, size_bytes: size,
      folder: safeFolder(body.register.folder), width: Number(width) || null, height: Number(height) || null,
      uploaded_by: auth.email,
    });
    await logActivity({ actor: auth.email, action: "asset.upload", category: "assets", target: asset.filename, targetType: "asset",
      summary: `Uploaded ${asset.filename}`, metadata: { key, size, mime, direct: true }, ...meta });
    return res.status(200).json({ key, url: asset.url, asset });
  }

  // ── delete: owner/admin only; the Asset Hub checks usage first ───────────
  if (body.delete) {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!(await isManager(token))) return res.status(403).json({ error: "Only owners and admins can delete assets." });
    const key = String(body.delete.key || "");
    if (!key.startsWith(`${STORAGE.keyPrefix}/`)) return res.status(400).json({ error: "Invalid key." });
    await cfg.s3.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
    await fetch(`${SUPABASE_URL}/rest/v1/assets?key=eq.${encodeURIComponent(key)}`, {
      method: "DELETE", headers: { apikey: SUPABASE_SERVICE_ROLE!, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` },
    });
    await logActivity({ actor: auth.email, action: "asset.delete", category: "assets", target: key, targetType: "asset", summary: `Deleted ${key.split("/").pop()}`, ...meta });
    return res.status(200).json({ ok: true });
  }

  // ── small: ≤ threshold, base64 through the function ──────────────────────
  const { filename, dataBase64, folder, width, height } = body;
  if (!filename || !dataBase64) return res.status(400).json({ error: "Missing file." });
  const buf = Buffer.from(dataBase64, "base64");
  if (buf.length > STORAGE.directThreshold * 1.1) return res.status(413).json({ error: "Too large for this route — the uploader should have used a direct upload. Refresh and retry." });
  const mime = fontMime(filename, String(body.contentType || ""));
  const bad = policyError(mime, buf.length);
  if (bad) return res.status(bad.status).json({ error: bad.error });

  const key = newKey(folder, filename);
  await cfg.s3.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: buf, ContentType: mime, CacheControl: "public, max-age=31536000, immutable" }));
  const asset = await insertAsset({
    key, url: `${cfg.publicUrl}/${key}`, filename: safeName(filename), type: kindOf(mime), content_type: mime,
    size_bytes: buf.length, folder: safeFolder(folder), width: Number(width) || null, height: Number(height) || null, uploaded_by: auth.email,
  });
  await logActivity({ actor: auth.email, action: "asset.upload", category: "assets", target: asset.filename, targetType: "asset",
    summary: `Uploaded ${asset.filename}`, metadata: { key, size: buf.length, mime }, ...meta });
  return res.status(200).json({ key, url: asset.url, asset });
}
```

**Vercel config:** the small path needs the default body parser (≈4.5 MB request limit —
base64 inflates files by ~33%, which is why the threshold is 3 MB, not 4.5).

---

## 7. Client — the upload engine

**Every uploader in the app imports this one function.** The reference build grew a second
upload path inside the editor's image picker that always used base64 — so a 76 MB video died
with a bare `413` there while the same file worked on the Assets page. One engine, imported
everywhere.

```ts
// src/admin/lib/upload.ts
import { STORAGE } from "@/lib/storage.config";
import { authHeaders } from "./api";

function uploadError(status: number, body: string): string {
  try { const j = JSON.parse(body); if (j?.error) return String(j.error); } catch { /* not JSON */ }
  if (status === 413) return "That file is too large for this route. Refresh and try again.";
  return `Upload failed (${status})`;
}

/** Pixel dimensions for images and videos, best effort. */
export function readDimensions(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (d: { width?: number; height?: number }) => { URL.revokeObjectURL(url); resolve(d); };
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
    } else done({});
  });
}

/** XHR, not fetch: fetch has no upload progress events. */
function putWithProgress(url: string, file: File, contentType: string, onProgress: (f: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);      // MUST match the signed type
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage answered ${xhr.status}.`)));
    xhr.onerror = () => reject(new Error(
      "Couldn't reach storage. For files over 3 MB the bucket's CORS rules must allow PUT from this site — ask an owner."));
    xhr.send(file);
  });
}

/** Upload one file; resolves to the stored asset key. */
export async function uploadOne(file: File, folder: string, onProgress: (f: number) => void = () => {}): Promise<string> {
  const dims = await readDimensions(file);

  if (file.size <= STORAGE.directThreshold) {
    onProgress(-1);   // indeterminate on this path
    const dataBase64 = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1] ?? "");
      r.onerror = () => rej(new Error("Couldn't read the file."));
      r.readAsDataURL(file);
    });
    const resp = await fetch("/api/upload", { method: "POST", headers: await authHeaders(),
      body: JSON.stringify({ filename: file.name, contentType: file.type, folder, dataBase64, ...dims }) });
    if (!resp.ok) throw new Error(uploadError(resp.status, await resp.text().catch(() => "")));
    return String((await resp.json()).key);
  }

  const pre = await fetch("/api/upload", { method: "POST", headers: await authHeaders(),
    body: JSON.stringify({ presign: { filename: file.name, contentType: file.type, size: file.size, folder } }) });
  if (!pre.ok) throw new Error(uploadError(pre.status, await pre.text().catch(() => "")));
  // Use the server's content type, not file.type: the server may have normalized it
  // (browsers often report fonts as ""), and the signature covers it.
  const { uploadUrl, key, contentType } = await pre.json();
  await putWithProgress(uploadUrl, file, contentType, onProgress);

  const reg = await fetch("/api/upload", { method: "POST", headers: await authHeaders(),
    body: JSON.stringify({ register: { key, filename: file.name, folder, ...dims } }) });
  if (!reg.ok) throw new Error(uploadError(reg.status, await reg.text().catch(() => "")));
  return key;
}

export async function deleteAsset(key: string): Promise<void> {
  const r = await fetch("/api/upload", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ delete: { key } }) });
  if (!r.ok) throw new Error(uploadError(r.status, await r.text().catch(() => "")));
}
```

**Content-Type must match between presign and PUT.** The signature covers it; a mismatch
returns `403 SignatureDoesNotMatch`. That's why `presign` returns the `contentType` it
signed and the client PUTs with that value rather than `file.type`.

---

## 8. Font proxy — making custom fonts load

`@font-face` requests are CORS-restricted. A public storage URL that ignores bucket CORS
(`r2.dev`) will never send `Access-Control-Allow-Origin`, so uploaded fonts silently fall
back to the system font. Serve them from your own origin instead.

```json
// vercel.json — before the SPA catch-all
{ "source": "/brandfonts/:path*", "destination": "https://<public-storage-host>/assets/fonts/:path*" }
```

```ts
// vite.config.ts — mirror the production rewrite in dev
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const base = loadEnv(mode, process.cwd(), "").VITE_ASSETS_BASE_URL;
  return {
    plugins: [react()],
    server: {
      proxy: base
        ? { "/brandfonts": { target: `${base.replace(/\/+$/, "")}/assets/fonts`, changeOrigin: true, rewrite: (p: string) => p.replace(/^\/brandfonts/, "") } }
        : undefined,
    },
  };
});
```

```ts
// used by Module 05 when writing @font-face
export function fontSrc(url: string): string {
  const m = url.match(/\/assets\/fonts\/([^?#]+)/);
  return m ? `/brandfonts/${m[1]}` : url;
}
```

Upload fonts to the `fonts` folder so they land under `assets/fonts/`. With a **custom
domain** that honours bucket CORS (and `GET` allowed for your origin), the proxy becomes
optional — keep it anyway; it costs nothing and removes a failure mode.

---

## 9. Security

- **Storage credentials never reach the browser** — not in any mode. Only a signed URL,
  scoped to one key, one method, one content type, 15 minutes.
- **Every mode requires an admin session** via the shared `requireAdmin()`.
- **Delete requires owner/admin** (`is_admin_manager()`).
- **Server-side validation from storage metadata.** Client claims about size or type are
  never trusted for the record.
- **Keys are server-generated.** The client cannot choose where an object lands; the
  `register` and `delete` modes reject keys outside the prefix.
- **SVG** can carry script. Served from a *separate* storage origin it can't touch your
  site's cookies or DOM, which is acceptable for most brands. If assets are served from
  your main domain, either drop `image/svg+xml` from the allowlist or sanitize on upload.
- **CORS lists exact origins**, never `*`.
- **Logs are non-blocking** and include actor, key, size, type, IP.

---

## 10. Nuances & hard-won lessons

1. **Public `r2.dev` URLs ignore bucket CORS** for reads — no `Access-Control-Allow-Origin`
   is ever sent. It breaks `@font-face` and any `fetch()` of an asset. Use a custom domain,
   or proxy same-origin (§8).
2. **Presigned uploads need `PUT` in the bucket's `AllowedMethods`.** Otherwise the preflight
   fails with an opaque network error.
3. **Setting bucket CORS needs an admin-scoped token.** An object-scoped token returns
   `AccessDenied` on `Put/GetBucketCors` while reads and writes work fine — easy to
   misdiagnose as "wrong credentials."
4. **One upload engine, imported everywhere** (§7).
5. **Use XHR for progress.** `fetch` exposes download progress, not upload progress.
6. **base64 inflates by ~33%** — size the small-file threshold below the platform's body limit
   accordingly.
7. **Verify an upload end to end with the exact headers a browser sends** (`Origin`,
   `Content-Type`). A CORS rule that looks right in the dashboard is not proof.
8. **Scripts uploading very large files from Node should use `curl` or streams** — Node's
   `fetch` hits its headers timeout on slow uplinks for multi-hundred-MB bodies.
9. **Content-Type is part of the signature** (§7).

---

## 11. Productization upgrades

| Upgrade | Why | Sketch |
|---|---|---|
| **Custom asset domain** | CORS works, on-brand URLs, cache control | Connect `assets.<brand>.com` to the bucket |
| **Image variants** | Serve a 400px thumbnail, not a 4000px original | Cloudflare Image Resizing / Images, or generate `-thumb.webp` on register |
| **Multipart uploads** | Files > 5 GB, resumable on flaky networks | `CreateMultipartUpload` + presigned `UploadPart` URLs + `Complete` |
| **Content hashing & dedupe** | Same file uploaded twice | SHA-256 in the browser (`crypto.subtle`), unique index on hash |
| **Orphan sweeper** | Abandoned presigned uploads never registered | Nightly job: list objects older than 1 day with no `assets` row → delete |
| **Malware scanning** | Untrusted uploads | Scan on register before inserting the row |
| **Signed private assets** | Gated downloads | Separate private bucket + presigned GET URLs |

---

## 12. Acceptance tests

- [ ] 1 MB image uploads through the small path; row has correct `type`, `size_bytes`, dimensions.
- [ ] 80 MB video uploads through presign with a moving progress bar; row created only after upload completes.
- [ ] Calling `register` for a key never uploaded returns "never reached storage" and creates no row.
- [ ] Uploading `.exe` or `.html` returns 415 with a readable message.
- [ ] Presigning an over-limit file returns 413 before any upload starts.
- [ ] A PUT with a different `Content-Type` than presigned is rejected by storage.
- [ ] No request from the browser contains `R2_ACCESS_KEY_ID` or the secret (check DevTools network).
- [ ] Unauthenticated `POST /api/upload` → 401; non-admin → 403.
- [ ] An editor calling `delete` → 403; an owner → object and row both gone; activity logged.
- [ ] `OPTIONS` preflight from `https://<brand>` with `Access-Control-Request-Method: PUT` → 204 and `Allow-Methods` includes PUT.
- [ ] An uploaded `.woff2` renders in the site via `/brandfonts/…` (DevTools shows a same-origin request, 200).
- [ ] Objects are served with `cache-control: public, max-age=31536000, immutable`.

---

## 13. Build plan

1. Create the bucket, public access (custom domain preferred), app token, CORS (§4).
2. Add env vars to Vercel and `.env.local`; add `storage.config.ts`.
3. Create the `assets` table + RLS (§5).
4. Build `api/upload.ts` (§6.2) — presign, register, small, delete.
5. Build the client engine `src/admin/lib/upload.ts` (§7).
6. Add the font proxy rewrite and the Vite dev proxy (§8).
7. Wire a minimal test UI (file input → `uploadOne`) and run §12.
8. Hand off to Module 03 for the library and picker UI.
