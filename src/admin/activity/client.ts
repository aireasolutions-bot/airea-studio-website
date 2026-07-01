import { supabase } from "@/lib/supabase";

export type ActivityEvent = {
  id: string;
  created_at: string;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  category: string;
  target: string | null;
  target_type: string | null;
  summary: string | null;
  status: string;
  duration_ms: number | null;
  metadata: any;
  ip: string | null;
  user_agent: string | null;
};

export type ActivityFilters = { category?: string; status?: string; actor?: string; q?: string; limit?: number };

// Read the log directly (RLS: is_admin() can select). Works in dev + prod.
export async function listActivity(f: ActivityFilters = {}): Promise<ActivityEvent[]> {
  if (!supabase) return [];
  let q = supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(f.limit || 250);
  if (f.category) q = q.eq("category", f.category);
  if (f.status) q = q.eq("status", f.status);
  if (f.actor) q = q.eq("actor_email", f.actor.toLowerCase());
  if (f.q) q = q.or(`summary.ilike.%${f.q}%,action.ilike.%${f.q}%,target.ilike.%${f.q}%,actor_email.ilike.%${f.q}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data as ActivityEvent[]) || [];
}

// Log a client-side event. Best-effort — the server sets the actor from the
// verified session, so entries can't be forged. Never throws.
export async function logEvent(entry: {
  action: string;
  category?: string;
  target?: string;
  targetType?: string;
  summary?: string;
  status?: "success" | "error";
  durationMs?: number;
  metadata?: any;
}): Promise<void> {
  try {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(entry),
    });
  } catch {
    /* best-effort */
  }
}
