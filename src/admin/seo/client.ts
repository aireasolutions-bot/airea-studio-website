import { supabase } from "@/lib/supabase";

export type SeoRow = {
  path: string;
  title?: string | null;
  description?: string | null;
  og_image?: string | null;
  canonical?: string | null;
  noindex?: boolean | null;
  keywords?: string | null;
  priority?: number | null;
  changefreq?: string | null;
  jsonld?: unknown;
  updated_at?: string | null;
  updated_by?: string | null;
};

export async function listSeo(): Promise<Record<string, SeoRow>> {
  if (!supabase) return {};
  const { data, error } = await supabase.from("seo_meta").select("*");
  if (error) throw error;
  const map: Record<string, SeoRow> = {};
  for (const r of (data as SeoRow[]) || []) map[r.path] = r;
  return map;
}

export async function saveSeo(path: string, patch: Partial<SeoRow>): Promise<void> {
  if (!supabase) throw new Error("Not connected.");
  const { data: s } = await supabase.auth.getSession();
  const { error } = await supabase
    .from("seo_meta")
    .upsert({ path, ...patch, updated_at: new Date().toISOString(), updated_by: s.session?.user?.email ?? null }, { onConflict: "path" });
  if (error) throw error;
}

export async function clearSeo(path: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("seo_meta").delete().eq("path", path);
  if (error) throw error;
}

// ---------- SEO agent ----------
export type SeoStep = { type: string; label: string };
export type SeoChange = { path: string; label: string; title?: string; description?: string; keywords?: string; summary?: string };
export type SeoAgentResult = { reply: string; transcript: SeoStep[]; changes: SeoChange[] };
export type ChatMsg = { role: "user" | "assistant"; content: string };

async function authHeaders() {
  const { data } = await supabase!.auth.getSession();
  return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` };
}

const NOT_DEPLOYED =
  "The SEO agent runs on the deployed site (Vercel), where its serverless functions + keys live. Open the admin on your Vercel URL to use it.";

async function asJson(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) throw new Error(NOT_DEPLOYED);
  return res.json();
}

export async function runSeoAgent(messages: ChatMsg[]): Promise<SeoAgentResult> {
  let res: Response;
  try {
    res = await fetch("/api/seo/run", { method: "POST", headers: await authHeaders(), body: JSON.stringify({ messages }) });
  } catch {
    throw new Error(NOT_DEPLOYED);
  }
  if (!res.ok) {
    const body = await asJson(res).catch(() => null);
    if (body?.error) throw new Error(body.error);
    if (res.status >= 500) throw new Error(`The SEO agent hit a server error (${res.status}). Check the Vercel logs for /api/seo/run.`);
    throw new Error(NOT_DEPLOYED);
  }
  return asJson(res);
}
