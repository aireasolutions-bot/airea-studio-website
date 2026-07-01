import { supabase } from "@/lib/supabase";

export type Commit = { sha: string; message: string; body: string; author: string; date: string; url: string };

async function headers() {
  const { data } = await supabase!.auth.getSession();
  return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` };
}

async function asJson(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) throw new Error("__not_deployed__");
  return res.json();
}

function friendly(e: unknown): string {
  const msg = (e as Error)?.message || String(e);
  if (msg === "__not_deployed__" || msg.includes("Failed to fetch") || msg.includes("Unexpected token")) {
    return "Version history runs on the deployed site (Vercel), where the GitHub key lives. Open the admin on your Vercel URL to use it.";
  }
  return msg;
}

export async function getHistory(): Promise<Commit[]> {
  try {
    const res = await fetch("/api/deploy", { headers: await headers() });
    if (!res.ok) {
      const body = await asJson(res).catch(() => null);
      throw new Error(body?.error || "__not_deployed__");
    }
    return (await asJson(res)).commits;
  } catch (e) {
    throw new Error(friendly(e));
  }
}

export async function rollback(sha: string, label: string): Promise<{ sha: string; url: string }> {
  try {
    const res = await fetch("/api/deploy", {
      method: "POST",
      headers: await headers(),
      body: JSON.stringify({ sha, label }),
    });
    if (!res.ok) {
      const body = await asJson(res).catch(() => null);
      throw new Error(body?.error || "__not_deployed__");
    }
    return asJson(res);
  } catch (e) {
    throw new Error(friendly(e));
  }
}
