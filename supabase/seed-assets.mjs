// Seed the public.assets table from public/assets/** (R2 mirror).
// Usage: node supabase/seed-assets.mjs
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname, dirname, basename } from "node:path";

const env = {};
for (const line of readFileSync(".env.supabase.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
}
const URL = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE;
const R2 = (env.R2_PUBLIC_URL || "").replace(/\/$/, "");

const IMG = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico"]);
const VID = new Set([".mp4", ".webm", ".mov"]);
const CT = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".mp4": "video/mp4", ".webm": "video/webm",
};

function walk(d, out = []) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk("public/assets").filter((f) => !f.endsWith(".DS_Store"));
const rows = files.map((f) => {
  const key = relative("public", f).split("\\").join("/"); // assets/...
  const ext = extname(f).toLowerCase();
  const folder = relative("public/assets", dirname(f)).split("\\").join("/") || "root";
  return {
    key,
    filename: basename(f),
    url: `${R2}/${key}`,
    type: VID.has(ext) ? "video" : IMG.has(ext) ? "image" : "file",
    content_type: CT[ext] || "application/octet-stream",
    folder,
    size_bytes: statSync(f).size,
  };
});

const res = await fetch(`${URL}/rest/v1/assets?on_conflict=key`, {
  method: "POST",
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(rows),
});

if (!res.ok) {
  console.error("seed failed:", res.status, await res.text());
  process.exit(1);
}
console.log(`✓ upserted ${rows.length} assets into public.assets`);
