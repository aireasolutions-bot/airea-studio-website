// Tamper-proof activity log. Writes go through the service role (server-side only),
// so the actor + details are trustworthy. logActivity NEVER throws — logging must
// not break the action it records.
const URL = process.env.SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE || "";
const H: Record<string, string> = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

export type ActivityEntry = {
  actor?: string;
  actorRole?: string;
  action: string; // machine key, e.g. "site.publish", "team.invite"
  category?: string; // auth | content | seo | team | agent | publish | assets | system
  target?: string;
  targetType?: string; // page | member | asset | commit | conversation | setting
  summary?: string; // human one-liner
  status?: "success" | "error" | "pending";
  durationMs?: number;
  metadata?: any;
  ip?: string;
  userAgent?: string;
};

// Pull request context (device + IP) for the log entry.
export function reqMeta(req: any): { ip?: string; userAgent?: string } {
  const fwd = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return { ip: fwd || undefined, userAgent: req?.headers?.["user-agent"] || undefined };
}

export async function logActivity(e: ActivityEntry): Promise<void> {
  if (!URL || !KEY || !e?.action) return;
  try {
    await fetch(`${URL}/rest/v1/activity_log`, {
      method: "POST",
      headers: { ...H, Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_email: e.actor || null,
        actor_role: e.actorRole || null,
        action: e.action,
        category: e.category || "system",
        target: e.target || null,
        target_type: e.targetType || null,
        summary: e.summary || null,
        status: e.status || "success",
        duration_ms: e.durationMs ?? null,
        metadata: e.metadata ?? null,
        ip: e.ip || null,
        user_agent: e.userAgent || null,
      }),
    });
  } catch {
    /* logging is best-effort — never surface an error to the caller */
  }
}

// Read the log (service role) with optional filters. Used by GET /api/activity.
export async function listActivity(params: {
  category?: string;
  actor?: string;
  status?: string;
  q?: string;
  limit?: number;
}): Promise<any[]> {
  const qs = new URLSearchParams();
  qs.set("select", "*");
  qs.set("order", "created_at.desc");
  qs.set("limit", String(Math.min(500, Math.max(1, params.limit || 200))));
  if (params.category) qs.set("category", `eq.${params.category}`);
  if (params.status) qs.set("status", `eq.${params.status}`);
  if (params.actor) qs.set("actor_email", `eq.${params.actor.toLowerCase()}`);
  if (params.q) qs.set("or", `(summary.ilike.*${params.q}*,action.ilike.*${params.q}*,target.ilike.*${params.q}*)`);
  const r = await fetch(`${URL}/rest/v1/activity_log?${qs.toString()}`, { headers: H });
  if (!r.ok) throw new Error(`Couldn't read the activity log (${r.status})`);
  return r.json();
}
