// Public blog data + schema. Reads come straight from Supabase via the anon client
// (RLS returns only published posts), so no serverless function is needed to render
// /blog — it works the moment a post is published.
import { supabase } from "./supabase";
import { SITE_URL, SITE_NAME, OG_IMAGE } from "./seo";

export type BlogSource = { url: string; title?: string };

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: string;
  cover_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  keywords: string | null;
  category: string | null;
  tags: string[] | null;
  sources: BlogSource[] | null;
  author: string | null;
  reading_minutes: number | null;
  word_count: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

// Card-sized fields for the index (skips the heavy body).
export type BlogCard = Pick<
  BlogPost,
  "id" | "slug" | "title" | "excerpt" | "category" | "tags" | "cover_image" | "author" | "reading_minutes" | "published_at" | "created_at"
>;

const CARD_COLS = "id,slug,title,excerpt,category,tags,cover_image,author,reading_minutes,published_at,created_at";

export async function fetchPublishedPosts(): Promise<BlogCard[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("blog_posts")
    .select(CARD_COLS)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data as BlogCard[]) || [];
}

export async function fetchPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return (data as BlogPost) || null;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

export const blogUrl = (slug: string) => `${SITE_URL}/blog/${slug}`;

// schema.org BlogPosting — the structured data Google + AI answer engines read to
// understand (and cite) each article.
export function articleSchema(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${blogUrl(post.slug)}#article`,
    headline: (post.seo_title || post.title || "").slice(0, 110),
    description: post.seo_description || post.excerpt || "",
    image: post.cover_image || OG_IMAGE,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    author: { "@type": "Organization", name: post.author || SITE_NAME, url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: { "@type": "WebPage", "@id": blogUrl(post.slug) },
    articleSection: post.category || "AI Marketing",
    keywords: post.keywords || (post.tags || []).join(", "),
    wordCount: post.word_count || undefined,
    inLanguage: "en-US",
    isAccessibleForFree: true,
  };
}

// schema.org Blog for the index page.
export function blogListSchema(posts: BlogCard[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/blog#blog`,
    name: `${SITE_NAME} — AI Marketing Insights`,
    description: "Practical, current guides on AI marketing, content, ads, SEO, and growth for small businesses and e-commerce brands.",
    url: `${SITE_URL}/blog`,
    publisher: { "@id": `${SITE_URL}/#organization` },
    blogPost: posts.slice(0, 20).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: blogUrl(p.slug),
      datePublished: p.published_at || p.created_at,
      author: { "@type": "Organization", name: p.author || SITE_NAME },
    })),
  };
}
