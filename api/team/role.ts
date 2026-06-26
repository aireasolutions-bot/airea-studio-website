// Team & Access — change a member's role (the Admin on/off toggle). Only owners/
// admins may change roles. The super-admin (owner) is locked and can't be changed,
// and no one can be promoted to 'owner' through here.
import { requireAdmin } from "../_lib/admin.js";
import { teamConfigured, setRole, serviceRoleHint, getRole, canManageTeam, isSuperAdmin } from "../_lib/team.js";

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
    res.status(403).json({ error: "You need Admin access to change roles." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const role: "admin" | "member" = body.role === "admin" ? "admin" : "member";
    if (!email) {
      res.status(400).json({ error: "No email provided." });
      return;
    }
    if (isSuperAdmin(email)) {
      res.status(400).json({ error: "The owner's access is locked and can't be changed." });
      return;
    }

    await setRole(email, role);
    res.status(200).json({ ok: true, email, role });
  } catch (e: any) {
    res.status(500).json({ error: serviceRoleHint(e?.message || "Couldn't update the role") });
  }
}
