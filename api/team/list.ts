// Team & Access — list members: the admin_users allow-list joined with each
// account's auth status, each member's role, plus the caller's own permissions
// ("me") so the UI can show/hide invite + role controls. Admin-gated (any member
// can view the team; only owners/admins can act on it).
import { requireAdmin } from "../_lib/admin.js";
import { teamConfigured, listAdminUsers, listAuthUsers, normalizeRole, isSuperAdmin, canManageTeam } from "../_lib/team.js";

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
    const meEmail = auth.email.toLowerCase();

    const members = admins.map((a: any) => {
      const key = (a.email || "").toLowerCase();
      const u = byEmail.get(key);
      const confirmed = !!(u && (u.email_confirmed_at || u.confirmed_at));
      const signedIn = !!(u && u.last_sign_in_at);
      const status = !u ? "pending" : signedIn ? "active" : confirmed ? "confirmed" : "invited";
      return {
        email: a.email,
        fullName: a.full_name || u?.user_metadata?.full_name || "",
        role: normalizeRole(a.email, a.role),
        isSuperAdmin: isSuperAdmin(a.email),
        createdAt: a.created_at || null,
        lastSignIn: u?.last_sign_in_at || null,
        status,
        isSelf: key === meEmail,
      };
    });

    const myRow = members.find((m) => m.isSelf);
    const myRole = isSuperAdmin(meEmail) ? "owner" : myRow?.role || "member";

    res.status(200).json({
      members,
      me: { email: auth.email, role: myRole, canManage: canManageTeam(myRole) },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to load the team" });
  }
}
