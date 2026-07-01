// Generate public/sitemap.xml from the single source of truth (src/lib/pages.ts).
// Runs at build time so new SITE_PAGES entries appear automatically. Excludes
// throwaway test routes. Canonical host is the production domain.
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

const today = new Date().toISOString().slice(0, 10);
const meta = (p) => {
  if (p.path === "/") return { pr: "1.0", cf: "weekly" };
  if (p.path === "/pricing") return { pr: "0.9", cf: "weekly" };
  if (p.path === "/faq") return { pr: "0.7", cf: "monthly" };
  return { pr: "0.8", cf: "monthly" };
};

const urls = pages
  .map((p) => {
    const { pr, cf } = meta(p);
    const loc = p.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${p.path}`;
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${cf}</changefreq>\n    <priority>${pr}</priority>\n  </url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

fs.mkdirSync(path.join(root, "public"), { recursive: true });
fs.writeFileSync(path.join(root, "public/sitemap.xml"), xml);
console.log(`[gen-sitemap] wrote ${pages.length} URLs → public/sitemap.xml (${today})`);
