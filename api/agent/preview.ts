// AIREA Agent — build a PREVIEW of the staged edits before publishing. Commits
// them to a throwaway `agent-preview` branch (= production + edits), which makes
// Vercel spin up a preview deployment. Production (main) is untouched. Admin-gated.
import { requireAdmin } from "../_lib/admin.js";
import { deployToBranch, githubConfigured } from "../_lib/github.js";

export const config = { maxDuration: 60 };

const PREVIEW_BRANCH = "agent-preview";
// Never let the agent touch secrets, VCS internals, or escape the repo.
const BLOCKED = /(^|\/)(\.env|\.git\/|CREDENTIALS|\.vercel\/)/i;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
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
  const email = auth.email;

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const edits = Array.isArray(body.edits) ? body.edits : [];
    if (!edits.length) {
      res.status(400).json({ error: "No changes to preview" });
      return;
    }
    for (const e of edits) {
      const p = String(e?.path || "");
      if (!p || p.startsWith("/") || p.includes("..") || BLOCKED.test(p)) {
        res.status(400).json({ error: `Blocked or invalid path: ${p}` });
        return;
      }
      if (typeof e.content !== "string") {
        res.status(400).json({ error: `Missing content for ${p}` });
        return;
      }
    }

    const files = edits.map((e: any) => ({ path: String(e.path), content: String(e.content) }));
    const message = `Preview build via AIREA Agent (requested by ${email})\n\nDisposable preview — not production.`;
    const out = await deployToBranch(files, message, PREVIEW_BRANCH);

    res.status(200).json({ sha: out.sha, branch: PREVIEW_BRANCH });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Preview failed" });
  }
}
