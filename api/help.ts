// Public read-only help-center feed — the "one source of truth" answer to
// managing marketing-site FAQs and in-app contextual help separately.
//
//   GET /api/help                 → { categories, items } (published only)
//   GET /api/help?category=tokens → items tagged with that category
//   GET /api/help?q=credits       → simple text search
//
// CORS is open on purpose: app.aireastudio.ai (or anything else we ship)
// renders contextual help straight from here, while the content itself is
// edited once, in the admin's Help Center. Answers are markdown.
import type { VercelRequest, VercelResponse } from "@vercel/node";

async function sb<T>(path: string): Promise<T[]> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(4000),
  });
  return res.ok ? ((await res.json()) as T[]) : [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const category = typeof req.query.category === "string" ? req.query.category : "";
  const q = typeof req.query.q === "string" ? req.query.q.toLowerCase() : "";

  let itemPath = "faq_items?status=eq.published&select=slug,question,answer,categories,top&order=sort";
  if (category) itemPath += `&categories=cs.%7B${encodeURIComponent(category)}%7D`;

  const [categories, itemsRaw] = await Promise.all([
    sb<{ slug: string; name: string; description: string | null; sort: number }>(
      "faq_categories?select=slug,name,description,sort&order=sort"
    ),
    sb<{ slug: string; question: string; answer: string; categories: string[]; top: boolean }>(itemPath),
  ]);

  const items = q
    ? itemsRaw.filter((i) => (i.question + " " + i.answer).toLowerCase().includes(q))
    : itemsRaw;

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  return res.status(200).json({
    categories,
    items: items.map((i) => ({ ...i, url: `https://aireastudio.ai/faq/${i.slug}` })),
  });
}
