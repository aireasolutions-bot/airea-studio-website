import { supabase } from "@/lib/supabase";

export type AgentEdit = {
  path: string;
  content: string;
  summary: string;
  oldContent: string;
  isNew?: boolean;
};

export type AgentStep = { type: string; label: string };

export type AgentMode = "build" | "reason";

export type AgentResult = {
  reply: string;
  transcript: AgentStep[];
  edits: AgentEdit[];
  model: string;
  mode: AgentMode;
};

export type ChatAttachment = { url: string; name?: string };
export type ChatMsg = { role: "user" | "assistant"; content: string; attachments?: ChatAttachment[] };

async function headers() {
  const { data } = await supabase!.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session?.access_token ?? ""}`,
  };
}

const NOT_DEPLOYED = "__airea_not_deployed__";

function friendly(e: unknown): string {
  const msg = (e as Error)?.message || String(e);
  if (msg === NOT_DEPLOYED || msg.includes("Failed to fetch") || msg.includes("Unexpected token")) {
    return "The agent runs on the deployed site (Vercel), where its serverless functions and keys live. Open the admin on your Vercel URL to use it.";
  }
  return msg;
}

// Vite's dev server returns index.html for /api/* — detect that so we show a
// helpful message instead of a JSON parse error.
async function asJson(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) throw new Error(NOT_DEPLOYED);
  return res.json();
}

// Upload an image to Cloudflare R2 (under assets/uploads/) via the secure
// serverless endpoint, returning its public URL + key. Used by the chat composer
// so the agent can place real, live-on-CDN images.
export async function uploadImage(file: File): Promise<{ url: string; key: string }> {
  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Couldn't read that file."));
    r.readAsDataURL(file);
  });
  const { data: s } = await supabase!.auth.getSession();
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token ?? ""}` },
    body: JSON.stringify({ filename: file.name, contentType: file.type, folder: "uploads", dataBase64 }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => null);
    throw new Error(
      b?.error ||
        (res.status === 404 || res.status === 405
          ? "Image upload runs on the deployed site (needs the serverless function + R2 keys)."
          : `Upload failed (${res.status})`)
    );
  }
  return res.json();
}

export async function runAgent(
  messages: ChatMsg[],
  pendingEdits: { path: string; content: string }[],
  mode: AgentMode = "build"
): Promise<AgentResult> {
  try {
    const res = await fetch("/api/agent/run", {
      method: "POST",
      headers: await headers(),
      body: JSON.stringify({ messages, pendingEdits, mode }),
    });
    if (!res.ok) {
      const body = await asJson(res).catch(() => null);
      if (body?.error) throw new Error(body.error);
      if (res.status >= 500) throw new Error(`The agent hit a server error (${res.status}). Check the Vercel function logs for /api/agent/run.`);
      throw new Error(NOT_DEPLOYED);
    }
    return asJson(res);
  } catch (e) {
    throw new Error(friendly(e));
  }
}

// Build a disposable preview deployment of the staged edits (Vercel preview
// branch). Returns the commit sha to poll for status.
export async function requestPreview(
  edits: { path: string; content: string }[]
): Promise<{ sha: string; branch: string }> {
  try {
    const res = await fetch("/api/agent/preview", {
      method: "POST",
      headers: await headers(),
      body: JSON.stringify({ edits }),
    });
    if (!res.ok) {
      const body = await asJson(res).catch(() => null);
      if (body?.error) throw new Error(body.error);
      if (res.status >= 500) throw new Error(`Preview hit a server error (${res.status}). Check the Vercel logs for /api/agent/preview.`);
      throw new Error(NOT_DEPLOYED);
    }
    return asJson(res);
  } catch (e) {
    throw new Error(friendly(e));
  }
}

export type PreviewStatus = { state: string; url: string | null };

// Poll the Vercel build state + URL for a preview commit.
export async function getPreviewStatus(sha: string): Promise<PreviewStatus> {
  const res = await fetch(`/api/agent/preview?sha=${encodeURIComponent(sha)}`, {
    headers: await headers(),
  });
  if (!res.ok) {
    const body = await asJson(res).catch(() => null);
    if (body?.error) throw new Error(body.error);
    throw new Error(NOT_DEPLOYED);
  }
  return asJson(res);
}

export async function publishEdits(
  edits: { path: string; content: string }[],
  message: string
): Promise<{ sha: string; url: string; repo: string; branch: string; files: number }> {
  try {
    const res = await fetch("/api/agent/publish", {
      method: "POST",
      headers: await headers(),
      body: JSON.stringify({ edits, message }),
    });
    if (!res.ok) {
      const body = await asJson(res).catch(() => null);
      if (body?.error) throw new Error(body.error);
      if (res.status >= 500) throw new Error(`Publish hit a server error (${res.status}). Check the Vercel function logs for /api/agent/publish.`);
      throw new Error(NOT_DEPLOYED);
    }
    return asJson(res);
  } catch (e) {
    throw new Error(friendly(e));
  }
}
