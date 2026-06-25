// Team & Access — list members: the admin_users allow-list joined with each
// account's auth status (active / confirmed / invited / pending). Admin-gated.
import { requireAdmin } from "../_lib/admin.js";
import { teamConfigured, listAdminUsers, listAuthUsers } from "../_lib/team.js";

export const config = { maxDuration: 30 };

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!teamConfigured()) {
    res.status(503).json({ error: "Server not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE in Vercel." });
    return;
  }
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  try {
    const [admins, authUsers] = await Promise.all([listAdminUsers(), listAuthUsers().catch(() => [])]);
    const byEmail = new Map<string, any>(authUsers.map((u: any) => [(u.email || "").toLowerCase(), u]));

    const members = admins.map((a: any) => {
      const key = (a.email || "").toLowerCase();
      const u = byEmail.get(key);
      const confirmed = !!(u && (u.email_confirmed_at || u.confirmed_at));
      const signedIn = !!(u && u.last_sign_in_at);
      const status = !u ? "pending" : signedIn ? "active" : confirmed ? "confirmed" : "invited";
      return {
        email: a.email,
        fullName: a.full_name || u?.user_metadata?.full_name || "",
        role: a.role || "admin",
        createdAt: a.created_at || null,
        lastSignIn: u?.last_sign_in_at || null,
        status,
        isSelf: key === auth.email.toLowerCase(),
      };
    });

    res.status(200).json({ members });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to load the team" });
  }
}
