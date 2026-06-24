// Upload public/assets/** to Cloudflare R2 (S3-compatible).
// Reads creds from .env.r2.local (git-ignored) or process.env.
// Usage: node scripts/upload-r2.mjs
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const env = {};
try {
  for (const line of readFileSync(".env.r2.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
  }
} catch {
  /* fall back to process.env */
}
const get = (k) => process.env[k] || env[k];

const required = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];
for (const k of required) {
  if (!get(k)) {
    console.error(`Missing ${k}. Add it to .env.r2.local`);
    process.exit(1);
  }
}

const client = new S3Client({
  region: "auto",
  endpoint: get("R2_ENDPOINT"),
  credentials: {
    accessKeyId: get("R2_ACCESS_KEY_ID"),
    secretAccessKey: get("R2_SECRET_ACCESS_KEY"),
  },
});
const BUCKET = get("R2_BUCKET");
const PUBLIC = (get("R2_PUBLIC_URL") || "").replace(/\/$/, "");

const TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".json": "application/json",
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const ROOT = "public";
const files = walk("public/assets").filter((f) => !f.endsWith(".DS_Store"));
console.log(`Uploading ${files.length} files to r2://${BUCKET} ...`);

let done = 0;
for (const f of files) {
  const key = relative(ROOT, f).split("\\").join("/"); // assets/...
  const ct = TYPES[extname(f).toLowerCase()] || "application/octet-stream";
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: readFileSync(f),
      ContentType: ct,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  done++;
  if (done % 10 === 0 || done === files.length) console.log(`  ${done}/${files.length}`);
}

console.log("Done ✓");
if (PUBLIC) console.log(`Verify: ${PUBLIC}/assets/brand/logo.png`);
