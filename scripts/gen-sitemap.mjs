// Generate public/sitemap.xml at build time. Static routes come from the single
// source of truth (src/lib/pages.ts); blog posts are pulled live from Supabase
// (published only) so every article the agent ships is discoverable by crawlers.
// Excludes throwaway test routes. Canonical host is the production domain.
import fs from "node:fs";
import path from "node:path";

const SITE_URL = "https://aireastudio.ai";
const root = process.cwd();

let pages = [];
try {
  const src = fs.readFileSync(path.join(root, "src/lib/pages.ts"), "utf8");
  const re = /slug:\s*"([^"]+)",\s*path:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) pages.push({ slug: m[1], path: m[2] });
} catch {
  /* fall back below */
}
if (!pages.length) {
  pages = [
    { slug: "home", path: "/" },
    { slug: "pricing", path: "/pricing" },
    { slug: "small-business", path: "/small-business" },
    { slug: "ecommerce", path: "/ecommerce" },
    { slug: "how-it-works", path: "/how-it-works" },
    { slug: "faq", path: "/faq" },
  ];
}
pages = pages.filter((p) => !/^test/.test(p.slug));
// The blog index isn't in the page manifest (it's dynamic) — always include it.
if (!pages.some((p) => p.path === "/blog")) pages.push({ slug: "blog", path: "/blog" });

const today = new Date().toISOString().slice(0, 10);
const meta = (p) => {
  if (p.path === "/") return { pr: "1.0", cf: "weekly" };
  if (p.path === "/pricing") return { pr: "0.9", cf: "weekly" };
  if (p.path === "/blog") return { pr: "0.8", cf: "daily" };
  if (p.path === "/faq") return { pr: "0.7", cf: "monthly" };
  return { pr: "0.8", cf: "monthly" };
};

const entry = (loc, lastmod, cf, pr) =>
  `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${cf}</changefreq>\n    <priority>${pr}</priority>\n  </url>`;

const staticUrls = pages.map((p) => {
  const { pr, cf } = meta(p);
  const loc = p.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${p.path}`;
  return entry(loc, today, cf, pr);
});

// Live blog posts (best-effort — never fail the build if Supabase is unreachable).
let blogUrls = [];
const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE;
if (SB_URL && SB_KEY) {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/blog_posts?select=slug,updated_at,published_at&status=eq.published&order=published_at.desc`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
    );
    if (res.ok) {
      const rows = await res.json();
      blogUrls = (rows || []).map((r) => {
        const lastmod = (r.updated_at || r.published_at || `${today}T00:00:00Z`).slice(0, 10);
        return entry(`${SITE_URL}/blog/${r.slug}`, lastmod, "monthly", "0.7");
      });
      console.log(`[gen-sitemap] +${blogUrls.length} blog posts from Supabase`);
    } else {
      console.log(`[gen-sitemap] blog fetch skipped (HTTP ${res.status})`);
    }
  } catch (e) {
    console.log(`[gen-sitemap] blog fetch skipped (${e?.message || "error"})`);
  }
} else {
  console.log("[gen-sitemap] no Supabase env — static pages only");
}

const urls = [...staticUrls, ...blogUrls].join("\n");
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

fs.mkdirSync(path.join(root, "public"), { recursive: true });
fs.writeFileSync(path.join(root, "public/sitemap.xml"), xml);
console.log(`[gen-sitemap] wrote ${staticUrls.length + blogUrls.length} URLs → public/sitemap.xml (${today})`);
