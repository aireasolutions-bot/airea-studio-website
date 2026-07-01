// Activity log API. GET = admin-gated list (with filters). POST = log a client-side
// event; the actor is taken from the verified session (not the client), so entries
// can't be forged.
import { requireAdmin } from "../_lib/admin.js";
import { logActivity, listActivity, reqMeta } from "../_lib/activity.js";

export const config = { maxDuration: 30 };

export default async function handler(req: any, res: any) {
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  if (req.method === "GET") {
    try {
      const q = req.query || {};
      const events = await listActivity({
        category: q.category ? String(q.category) : undefined,
        actor: q.actor ? String(q.actor) : undefined,
        status: q.status ? String(q.status) : undefined,
        q: q.q ? String(q.q) : undefined,
        limit: q.limit ? Number(q.limit) : 200,
      });
      res.status(200).json({ events });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed to read activity" });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      if (!body.action) {
        res.status(400).json({ error: "Missing action" });
        return;
      }
      await logActivity({
        actor: auth.email,
        action: String(body.action).slice(0, 80),
        category: body.category ? String(body.category).slice(0, 40) : "content",
        target: body.target ? String(body.target).slice(0, 300) : undefined,
        targetType: body.targetType ? String(body.targetType).slice(0, 40) : undefined,
        summary: body.summary ? String(body.summary).slice(0, 300) : undefined,
        status: body.status === "error" ? "error" : "success",
        durationMs: typeof body.durationMs === "number" ? body.durationMs : undefined,
        metadata: body.metadata ?? undefined,
        ...reqMeta(req),
      });
      res.status(200).json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed to log" });
    }
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
