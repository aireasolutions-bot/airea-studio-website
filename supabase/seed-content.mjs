// Seed public.content_blocks from src/content/blocks.json (defaults).
// Only inserts missing keys — never clobbers edited content. Idempotent.
// Usage: node supabase/seed-content.mjs
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.supabase.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
}
const URL = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE;

const blocks = JSON.parse(readFileSync("src/content/blocks.json", "utf8"));
const rows = blocks.map((b, i) => ({
  key: b.key,
  page: b.page,
  section: b.section,
  label: b.label,
  type: b.type,
  draft_value: b.value,
  published_value: b.value,
  sort: i,
  updated_by: "system",
}));

const res = await fetch(`${URL}/rest/v1/content_blocks?on_conflict=key`, {
  method: "POST",
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    Prefer: "resolution=ignore-duplicates,return=minimal",
  },
  body: JSON.stringify(rows),
});

if (!res.ok) {
  console.error("seed failed:", res.status, await res.text());
  process.exit(1);
}
console.log(`✓ seeded ${rows.length} content blocks (existing keys left untouched)`);
