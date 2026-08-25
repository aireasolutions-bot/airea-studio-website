// Help Center data layer. Categories + question/answer items live in Supabase
// (faq_categories / faq_items — managed in the admin's Help Center page), so
// the team can add, tag, and reorder without code. Reads go through the anon
// client: RLS returns published items only. The old hardcoded content ships as
// a fallback so the page still renders if the network is down.
import { supabase } from "./supabase";
import { FAQ_CATEGORIES as FALLBACK } from "./faqFallback";

export type FaqCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort: number;
};

export type FaqItem = {
  id: string;
  slug: string;
  question: string;
  answer: string; // markdown — supports images/videos via the shared renderer
  categories: string[]; // category slugs; one question can live in several
  top: boolean;
  sort: number;
  status: string;
  updated_at: string;
};

export type FaqData = { categories: FaqCategory[]; items: FaqItem[] };

function slugify(s: string): string {
  return s.toLowerCase().replace(/[’'"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}

// The pre-CMS content, shaped like the live tables — used only when Supabase
// is unreachable so the help center never renders empty.
function fallbackData(): FaqData {
  const categories: FaqCategory[] = FALLBACK.map((c, i) => ({
    id: c.id, slug: c.id, name: c.title, description: null, sort: i,
  }));
  const items: FaqItem[] = FALLBACK.flatMap((c, ci) =>
    c.items.map((it, i) => ({
      id: `${c.id}-${i}`, slug: slugify(it.q), question: it.q, answer: it.a.join("\n\n"),
      categories: [c.id], top: false, sort: ci * 100 + i, status: "published", updated_at: "",
    }))
  );
  return { categories, items };
}

/** Everything published, one round trip — the help center is small enough to
 *  fetch whole, which makes search instant and category pages free. */
export async function fetchFaq(): Promise<FaqData> {
  if (!supabase) return fallbackData();
  try {
    const [cats, items] = await Promise.all([
      supabase.from("faq_categories").select("*").order("sort"),
      supabase.from("faq_items").select("*").eq("status", "published").order("sort"),
    ]);
    if (cats.error || items.error) throw cats.error || items.error;
    const data = { categories: (cats.data as FaqCategory[]) || [], items: (items.data as FaqItem[]) || [] };
    return data.items.length ? data : fallbackData();
  } catch {
    return fallbackData();
  }
}

/** One question by slug — drafts included when the admin previews (their JWT
 *  passes RLS); everyone else sees published only. */
export async function fetchFaqItem(slug: string): Promise<FaqItem | null> {
  if (!supabase) {
    return fallbackData().items.find((i) => i.slug === slug) ?? null;
  }
  const { data } = await supabase.from("faq_items").select("*").eq("slug", slug).maybeSingle();
  return (data as FaqItem) ?? null;
}

export const itemsInCategory = (data: FaqData, catSlug: string): FaqItem[] =>
  data.items.filter((i) => i.categories.includes(catSlug)).sort((a, b) => a.sort - b.sort);

export const topItems = (data: FaqData): FaqItem[] =>
  data.items.filter((i) => i.top).sort((a, b) => a.sort - b.sort);

/** Plain-text preview of a markdown answer (search results, meta descriptions). */
export function answerText(md: string, max = 200): string {
  const t = md
    .replace(/!\[[^\]]*\]\s*\([^)]*\)/g, "")   // images/videos
    .replace(/\[([^\]]+)\]\s*\([^)]*\)/g, "$1") // links → label
    .replace(/[#>*`_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}
