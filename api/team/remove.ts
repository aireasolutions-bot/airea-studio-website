// Team & Access — revoke a member. Only owners/admins may remove. The super-admin
// (owner) account can't be removed, and you can't remove yourself. Removing clears
// the allow-list row so is_admin() is false → instant lockout.
import { requireAdmin } from "../_lib/admin.js";
import { logActivity, reqMeta } from "../_lib/activity.js";
import {
  teamConfigured,
  removeAdminUser,
  findAuthUser,
  deleteAuthUser,
  serviceRoleHint,
  getRole,
  canManageTeam,
  isSuperAdmin,
} from "../_lib/team.js";

export const config = { maxDuration: 30 };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
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

  const callerRole = await getRole(auth.email);
  if (!canManageTeam(callerRole)) {
    res.status(403).json({ error: "You need Admin access to remove teammates." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const deleteAccount = body.deleteAccount === true;
    if (!email) {
      res.status(400).json({ error: "No email provided." });
      return;
    }
    if (isSuperAdmin(email)) {
      res.status(400).json({ error: "The owner account can't be removed." });
      return;
    }
    if (email === auth.email.toLowerCase()) {
      res.status(400).json({ error: "You can't remove your own access." });
      return;
    }

    await removeAdminUser(email);
    if (deleteAccount) {
      const u = await findAuthUser(email);
      if (u?.id) await deleteAuthUser(u.id);
    }

    await logActivity({
      actor: auth.email,
      action: "team.remove",
      category: "team",
      target: email,
      targetType: "member",
      summary: `Removed ${email}${deleteAccount ? " (account deleted)" : ""}`,
      metadata: { deleteAccount },
      ...reqMeta(req),
    });

    res.status(200).json({ ok: true, email, deleted: deleteAccount });
  } catch (e: any) {
    res.status(500).json({ error: serviceRoleHint(e?.message || "Remove failed") });
  }
}
