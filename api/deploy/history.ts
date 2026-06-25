// Version history — recent commits on the branch (each is a Vercel deploy).
import { requireAdmin } from "../_lib/admin.js";
import { listCommits, githubConfigured } from "../_lib/github.js";

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
    const commits = await listCommits(25);
    res.status(200).json({ commits });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to load history" });
  }
}
