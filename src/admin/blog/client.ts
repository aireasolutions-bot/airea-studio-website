import { supabase } from "@/lib/supabase";

export type BlogStatus = "draft" | "published" | "scheduled";

export type AdminBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  status: BlogStatus;
  cover_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  keywords: string | null;
  category: string | null;
  tags: string[] | null;
  sources: { url: string; title?: string }[] | null;
  research: any;
  author: string | null;
  reading_minutes: number | null;
  word_count: number | null;
  created_at: string;
  updated_at: string | null;
  published_at: string | null;
  scheduled_for: string | null;
};

export type BlogSettings = {
  id: number;
  enabled: boolean;
  autopublish: boolean;
  cadence: string | null;
  frequency_per_week: number;
  themes: string[] | null;
  tone: string | null;
  min_words: number;
  last_run_at: string | null;
};

export const BLOG_CATEGORIES = [
  "AI Marketing",
  "SEO",
  "Content",
  "Paid Ads",
  "Email",
  "Social",
  "E-commerce",
  "Small Business",
];

// Admins see every post (RLS: is_admin() → all rows); the public only sees published.
export async function listPosts(): Promise<AdminBlogPost[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as AdminBlogPost[]) || [];
}

export async function updatePost(id: string, patch: Partial<AdminBlogPost>): Promise<AdminBlogPost> {
  if (!supabase) throw new Error("Not connected.");
  const { data, error } = await supabase
    .from("blog_posts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminBlogPost;
}

export async function deletePost(id: string): Promise<void> {
  if (!supabase) throw new Error("Not connected.");
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function setStatus(id: string, status: BlogStatus): Promise<AdminBlogPost> {
  const patch: Partial<AdminBlogPost> = { status };
  if (status === "published") patch.published_at = new Date().toISOString();
  if (status === "draft") patch.published_at = null;
  return updatePost(id, patch);
}

export async function getSettings(): Promise<BlogSettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("blog_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return (data as BlogSettings) || null;
}

export async function saveSettings(patch: Partial<BlogSettings>): Promise<void> {
  if (!supabase) throw new Error("Not connected.");
  const { error } = await supabase.from("blog_settings").update(patch).eq("id", 1);
  if (error) throw error;
}

// ---------- generation (serverless pipeline) ----------
async function authHeaders() {
  const { data } = await supabase!.auth.getSession();
  return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` };
}

const NOT_DEPLOYED =
  "The blog agent runs on the deployed site (Vercel), where its serverless functions + OpenAI key live. Open the admin on your Vercel URL to generate posts.";

async function asJson(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) throw new Error(NOT_DEPLOYED);
  return res.json();
}

export async function generateBlog(opts: {
  topic?: string;
  keyword?: string;
  autopublish?: boolean;
}): Promise<{ post: AdminBlogPost; searchUsed: boolean; sources: number }> {
  let res: Response;
  try {
    res = await fetch("/api/blog/generate", { method: "POST", headers: await authHeaders(), body: JSON.stringify(opts) });
  } catch {
    throw new Error(NOT_DEPLOYED);
  }
  if (!res.ok) {
    const body = await asJson(res).catch(() => null);
    if (body?.error) throw new Error(body.error);
    if (res.status >= 500)
      throw new Error(`The blog agent hit a server error (${res.status}). Check the Vercel logs for /api/blog/generate.`);
    throw new Error(NOT_DEPLOYED);
  }
  return asJson(res);
}
