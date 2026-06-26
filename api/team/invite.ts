// Team & Access — invite a member. Only owners/admins can invite. The inviter
// picks the new member's role (admin or member). Adds them to the allow-list and
// sends the on-brand email (magic-link invite, or a password account + welcome).
import { requireAdmin } from "../_lib/admin.js";
import {
  teamConfigured,
  upsertAdminUser,
  inviteUser,
  createUserWithPassword,
  setUserPassword,
  findAuthUser,
  sendMagicLink,
  serviceRoleHint,
  getRole,
  canManageTeam,
} from "../_lib/team.js";

export const config = { maxDuration: 30 };

const RATE_LIMIT_MSG =
  "Email limit reached — Supabase's built-in sender allows only ~2/hour. Add a custom SMTP provider (e.g. Resend) in Supabase → Auth → SMTP for higher volume.";

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

  // Only owners/admins may invite.
  const callerRole = await getRole(auth.email);
  if (!canManageTeam(callerRole)) {
    res.status(403).json({ error: "You need Admin access to invite teammates. Ask an owner or admin to enable it for you." });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim();
    const password = body.password ? String(body.password) : "";
    const redirectTo = String(body.redirectTo || "").trim() || undefined;
    // A fresh invite sends a role; a bare resend ({email}) omits it so the role is preserved.
    const roleProvided = body.role === "admin" || body.role === "member";
    const role: "admin" | "member" = body.role === "admin" ? "admin" : "member";

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      res.status(400).json({ error: "Enter a valid email address." });
      return;
    }
    if (password && password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }

    // 1) Allow-list them (with the chosen role on a fresh invite).
    await upsertAdminUser(email, fullName, roleProvided ? role : undefined);

    // 2) Create the account + send the branded email.
    let mode = "invited";
    if (password) {
      const c = await createUserWithPassword(email, password, fullName);
      if (!c.ok) {
        if (c.status === 429) throw new Error(RATE_LIMIT_MSG);
        const txt = await c.text();
        if (c.status === 422 || /exist|registered/i.test(txt)) {
          const u = await findAuthUser(email);
          if (u?.id) await setUserPassword(u.id, password);
        } else {
          throw new Error(`Couldn't create the account (${c.status})`);
        }
      }
      const m = await sendMagicLink(email, redirectTo);
      mode = m.ok ? "password" : m.status === 429 ? "password_rate" : "password_no_email";
    } else {
      const inv = await inviteUser(email, fullName, redirectTo);
      if (!inv.ok) {
        if (inv.status === 429) throw new Error(RATE_LIMIT_MSG);
        const txt = await inv.text();
        if (inv.status === 422 || /exist|registered/i.test(txt)) {
          const m = await sendMagicLink(email, redirectTo); // already invited → resend a sign-in link
          if (m.status === 429) throw new Error(RATE_LIMIT_MSG);
          mode = m.ok ? "resent" : "exists";
        } else {
          throw new Error(`Couldn't send the invite (${inv.status})`);
        }
      }
    }

    res.status(200).json({ ok: true, email, mode, role: roleProvided ? role : undefined });
  } catch (e: any) {
    res.status(500).json({ error: serviceRoleHint(e?.message || "Invite failed") });
  }
}
