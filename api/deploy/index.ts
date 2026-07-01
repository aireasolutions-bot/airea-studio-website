// Deploy history + rollback (one function to stay within Vercel's limit).
//   GET   → recent commits on the branch (each is a Vercel deploy).
//   POST  → roll the live site back to a previous commit's snapshot.
// Admin-gated.
import { requireAdmin } from "../_lib/admin.js";
import { listCommits, rollbackTo, githubConfigured } from "../_lib/github.js";
import { logActivity, reqMeta } from "../_lib/activity.js";

export const config = { maxDuration: 60 };

export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!githubConfigured()) {
    res.status(503).json({ error: "GitHub not configured. Set GITHUB_TOKEN, GITHUB_REPO in Vercel." });
    return;
  }
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  // --- GET: version history ---
  if (req.method === "GET") {
    try {
      const commits = await listCommits(25);
      res.status(200).json({ commits });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed to load history" });
    }
    return;
  }

  // --- POST: roll back to a commit ---
  const email = auth.email;
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const sha = String(body.sha || "");
    if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
      res.status(400).json({ error: "Invalid commit SHA" });
      return;
    }
    const label = String(body.label || sha.slice(0, 7)).slice(0, 80);
    const message = `Roll back to "${label}" (${sha.slice(0, 7)})\n\nReverted via the admin by ${email}.\n\nCo-Authored-By: AIREA Agent <agent@aireastudio.ai>`;
    const out = await rollbackTo(sha, message);
    await logActivity({
      actor: email,
      action: "site.rollback",
      category: "publish",
      target: out.sha,
      targetType: "commit",
      summary: `Rolled back to "${label}"`,
      metadata: { restoredFrom: sha, newSha: out.sha, label },
      ...reqMeta(req),
    });
    res.status(200).json(out);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Rollback failed" });
  }
}
