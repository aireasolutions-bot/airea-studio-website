import { supabase } from "@/lib/supabase";

export type TeamStatus = "active" | "confirmed" | "invited" | "pending";

export type TeamMember = {
  email: string;
  fullName: string;
  role: string;
  createdAt: string | null;
  lastSignIn: string | null;
  status: TeamStatus;
  isSelf: boolean;
};

async function authHeaders() {
  const { data } = await supabase!.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session?.access_token ?? ""}`,
  };
}

const NOT_DEPLOYED =
  "Team management runs on the deployed site (Vercel), where the serverless functions and service-role key live. Open the admin on your Vercel URL.";

// Vite's dev server returns index.html for /api/* — detect that and show a
// helpful message instead of a JSON parse error.
async function asJson(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) throw new Error(NOT_DEPLOYED);
  return res.json();
}

async function call(path: string, init?: RequestInit): Promise<any> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: await authHeaders() });
  } catch {
    throw new Error(NOT_DEPLOYED);
  }
  const body = await asJson(res); // throws NOT_DEPLOYED when the dev server returns HTML
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

export async function listTeam(): Promise<TeamMember[]> {
  const d = await call("/api/team/list");
  return (d.members || []) as TeamMember[];
}

export type InviteResult = { ok: boolean; email: string; mode: string };

export async function inviteMember(input: {
  email: string;
  fullName?: string;
  password?: string;
}): Promise<InviteResult> {
  return call("/api/team/invite", {
    method: "POST",
    body: JSON.stringify({ ...input, redirectTo: window.location.origin + "/admin" }),
  });
}

export async function removeMember(email: string, deleteAccount = false): Promise<void> {
  await call("/api/team/remove", {
    method: "POST",
    body: JSON.stringify({ email, deleteAccount }),
  });
}
