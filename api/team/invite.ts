// Team & Access — invite a member. Adds them to the admin allow-list (everyone is
// admin) and sends the on-brand email: a magic-link invite by default, or — if a
// starting password is provided — a confirmed password account + a magic-link welcome.
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

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim();
    const password = body.password ? String(body.password) : "";
    const redirectTo = String(body.redirectTo || "").trim() || undefined;

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      res.status(400).json({ error: "Enter a valid email address." });
      return;
    }
    if (password && password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters." });
      return;
    }

    // 1) Allow-list them (everyone is admin).
    await upsertAdminUser(email, fullName);

    // 2) Create the account + send the branded email.
    let mode = "invited";
    if (password) {
      const c = await createUserWithPassword(email, password, fullName);
      if (!c.ok) {
        const txt = await c.text();
        if (c.status === 422 || /exist|registered/i.test(txt)) {
          const u = await findAuthUser(email); // already has an account → just (re)set the password
          if (u?.id) await setUserPassword(u.id, password);
        } else {
          throw new Error(`Couldn't create the account (${c.status})`);
        }
      }
      const m = await sendMagicLink(email, redirectTo); // branded welcome email
      mode = m.ok ? "password" : "password_no_email";
    } else {
      const inv = await inviteUser(email, fullName, redirectTo);
      if (!inv.ok) {
        const txt = await inv.text();
        if (inv.status === 422 || /exist|registered/i.test(txt)) {
          const m = await sendMagicLink(email, redirectTo); // already invited → resend a sign-in link
          mode = m.ok ? "resent" : "exists";
        } else {
          throw new Error(`Couldn't send the invite (${inv.status})`);
        }
      }
    }

    res.status(200).json({ ok: true, email, mode });
  } catch (e: any) {
    res.status(500).json({ error: serviceRoleHint(e?.message || "Invite failed") });
  }
}
