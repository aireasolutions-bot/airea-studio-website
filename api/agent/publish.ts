// AIREA Agent — publish staged edits. Verifies the admin, blocks dangerous paths,
// and commits all files in one atomic commit to the default branch, which triggers
// a Vercel production deploy.
import { requireAdmin } from "../_lib/admin.js";
import { commitFiles, githubConfigured, REPO, BRANCH } from "../_lib/github.js";
import { logActivity, reqMeta } from "../_lib/activity.js";

export const config = { maxDuration: 60 };

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
    const summary = String(body.message || "Website update via AIREA Agent").slice(0, 100);
    if (!edits.length) {
      res.status(400).json({ error: "No changes to publish" });
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
    const message = `${summary}\n\nPublished via AIREA Agent by ${email}.\n\nCo-Authored-By: AIREA Agent <agent@aireastudio.ai>`;
    const out = await commitFiles(files, message);

    await logActivity({
      actor: email,
      action: "site.publish",
      category: "publish",
      target: out.sha,
      targetType: "commit",
      summary: `Published ${files.length} file${files.length > 1 ? "s" : ""} to ${BRANCH}`,
      metadata: { files: files.length, sha: out.sha, message: summary },
      ...reqMeta(req),
    });

    res.status(200).json({ ...out, repo: REPO, branch: BRANCH, files: files.length });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Publish failed" });
  }
}
