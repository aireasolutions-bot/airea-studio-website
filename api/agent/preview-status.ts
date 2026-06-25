// AIREA Agent — poll the preview build's status. Reads the Vercel deployment
// state + URL that the Vercel↔GitHub integration records for the commit (so no
// Vercel token is needed). Admin-gated.
import { requireAdmin } from "../_lib/admin.js";
import { previewStatus, githubConfigured } from "../_lib/github.js";

export const config = { maxDuration: 30 };

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
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

  try {
    const sha = String(req.query?.sha || "");
    if (!/^[0-9a-f]{7,40}$/i.test(sha)) {
      res.status(400).json({ error: "Invalid commit SHA" });
      return;
    }
    const status = await previewStatus(sha);
    res.status(200).json(status);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to read preview status" });
  }
}
