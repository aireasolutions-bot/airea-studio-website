// Dynamic sitemap — replaces the hand-maintained public/sitemap.xml, which
// went stale the moment the team published a blog post or FAQ. Serves every
// static page plus live published blog posts, help-center categories, and
// standalone question pages, with real lastmod dates.
import type { VercelRequest, VercelResponse } from "@vercel/node";

const SITE = "https://aireastudio.ai";

const STATIC: { path: string; priority: string; changefreq: string }[] = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/pricing", priority: "0.9", changefreq: "weekly" },
  { path: "/small-business", priority: "0.8", changefreq: "monthly" },
  { path: "/ecommerce", priority: "0.8", changefreq: "monthly" },
  { path: "/how-it-works", priority: "0.8", changefreq: "monthly" },
  { path: "/faq", priority: "0.8", changefreq: "weekly" },
  { path: "/blog", priority: "0.7", changefreq: "daily" },
  { path: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms-of-service", priority: "0.3", changefreq: "yearly" },
];

async function sb<T>(path: string): Promise<T[]> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(4000),
    });
    return res.ok ? ((await res.json()) as T[]) : [];
  } catch {
    return [];
  }
}

const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : undefined);

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const [posts, cats, items] = await Promise.all([
    sb<{ slug: string; published_at: string | null; updated_at: string }>(
      "blog_posts?status=eq.published&select=slug,published_at,updated_at"
    ),
    sb<{ slug: string }>("faq_categories?select=slug&order=sort"),
    sb<{ slug: string; updated_at: string }>("faq_items?status=eq.published&select=slug,updated_at"),
  ]);

  const urls: { loc: string; lastmod?: string; changefreq: string; priority: string }[] = [
    ...STATIC.map((p) => ({ loc: `${SITE}${p.path === "/" ? "/" : p.path}`, changefreq: p.changefreq, priority: p.priority })),
    ...cats.map((c) => ({ loc: `${SITE}/faq/${c.slug}`, changefreq: "weekly", priority: "0.7" })),
    ...items.map((i) => ({ loc: `${SITE}/faq/${i.slug}`, lastmod: day(i.updated_at), changefreq: "monthly", priority: "0.6" })),
    ...posts.map((p) => ({ loc: `${SITE}/blog/${p.slug}`, lastmod: day(p.updated_at || p.published_at), changefreq: "monthly", priority: "0.6" })),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n` +
          (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : "") +
          `    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
}
