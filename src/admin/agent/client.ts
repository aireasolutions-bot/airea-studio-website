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

export type ChatMsg = { role: "user" | "assistant"; content: string };

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
