// GitHub REST helpers for the AIREA Agent. Reads the repo and commits changes
// via the Git Data API (atomic multi-file commit on the default branch).
// Server-only env: GITHUB_TOKEN (required), GITHUB_REPO (owner/name), GITHUB_BRANCH.
const API = "https://api.github.com";

export const REPO = process.env.GITHUB_REPO || "aireasolutions-bot/airea-studio-website";
export const BRANCH = process.env.GITHUB_BRANCH || "main";

export function githubConfigured(): boolean {
  return !!process.env.GITHUB_TOKEN;
}

function gh(path: string, init: any = {}) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "airea-agent",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

const enc = (p: string) => p.split("/").map(encodeURIComponent).join("/");

// All blob paths in the repo (recursive). Used to give the model a map.
export async function listTree(): Promise<string[]> {
  const r = await gh(`/repos/${REPO}/git/trees/${BRANCH}?recursive=1`);
  if (!r.ok) throw new Error(`GitHub tree ${r.status}`);
  const data = await r.json();
  return (data.tree || []).filter((t: any) => t.type === "blob").map((t: any) => t.path);
}

// File contents as UTF-8, or null if it doesn't exist.
export async function readFile(path: string): Promise<string | null> {
  const r = await gh(`/repos/${REPO}/contents/${enc(path)}?ref=${BRANCH}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub read ${r.status} for ${path}`);
  const data = await r.json();
  if (data.encoding === "base64") return Buffer.from(data.content, "base64").toString("utf-8");
  return data.content ?? "";
}

// Commit several files in one atomic commit, then move the branch ref.
export async function commitFiles(
  files: { path: string; content: string }[],
  message: string
): Promise<{ sha: string; url: string }> {
  const refRes = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
  if (!refRes.ok) throw new Error(`GitHub ref ${refRes.status}`);
  const latest = (await refRes.json()).object.sha;

  const commitRes = await gh(`/repos/${REPO}/git/commits/${latest}`);
  const baseTree = (await commitRes.json()).tree.sha;

  const tree: any[] = [];
  for (const f of files) {
    const blobRes = await gh(`/repos/${REPO}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
    });
    if (!blobRes.ok) throw new Error(`GitHub blob ${blobRes.status} for ${f.path}`);
    tree.push({ path: f.path, mode: "100644", type: "blob", sha: (await blobRes.json()).sha });
  }

  const treeRes = await gh(`/repos/${REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTree, tree }),
  });
  if (!treeRes.ok) throw new Error(`GitHub tree create ${treeRes.status}`);
  const newTree = (await treeRes.json()).sha;

  const newCommitRes = await gh(`/repos/${REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree, parents: [latest] }),
  });
  if (!newCommitRes.ok) throw new Error(`GitHub commit ${newCommitRes.status}`);
  const newSha = (await newCommitRes.json()).sha;

  const patchRes = await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newSha }),
  });
  if (!patchRes.ok) throw new Error(`GitHub ref update ${patchRes.status}`);

  return { sha: newSha, url: `https://github.com/${REPO}/commit/${newSha}` };
}

// Build the staged edits on a throwaway branch (= production HEAD + edits) so
// Vercel creates a PREVIEW deployment, WITHOUT touching production. Force-updates
// the branch each time so every preview is a clean "main + current edits".
export async function deployToBranch(
  files: { path: string; content: string }[],
  message: string,
  branch: string
): Promise<{ sha: string }> {
  const refRes = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
  if (!refRes.ok) throw new Error(`GitHub ref ${refRes.status}`);
  const baseSha = (await refRes.json()).object.sha;

  const commitRes = await gh(`/repos/${REPO}/git/commits/${baseSha}`);
  const baseTree = (await commitRes.json()).tree.sha;

  const tree: any[] = [];
  for (const f of files) {
    const blobRes = await gh(`/repos/${REPO}/git/blobs`, {
      method: "POST",
      body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
    });
    if (!blobRes.ok) throw new Error(`GitHub blob ${blobRes.status} for ${f.path}`);
    tree.push({ path: f.path, mode: "100644", type: "blob", sha: (await blobRes.json()).sha });
  }

  const treeRes = await gh(`/repos/${REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTree, tree }),
  });
  if (!treeRes.ok) throw new Error(`GitHub tree create ${treeRes.status}`);
  const newTree = (await treeRes.json()).sha;

  const newCommitRes = await gh(`/repos/${REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree, parents: [baseSha] }),
  });
  if (!newCommitRes.ok) throw new Error(`GitHub commit ${newCommitRes.status}`);
  const newSha = (await newCommitRes.json()).sha;

  // Create the branch, or force-update it if it already exists.
  const createRes = await gh(`/repos/${REPO}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: newSha }),
  });
  if (!createRes.ok) {
    const patchRes = await gh(`/repos/${REPO}/git/refs/heads/${branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: newSha, force: true }),
    });
    if (!patchRes.ok) throw new Error(`GitHub ref update ${patchRes.status}`);
  }

  return { sha: newSha };
}

// Read the Vercel preview deployment's state + URL for a commit, via the GitHub
// Deployments the Vercel integration creates (no Vercel token needed). State is
// one of: queued | pending | in_progress | success | failure | error.
export async function previewStatus(sha: string): Promise<{ state: string; url: string | null }> {
  const depRes = await gh(`/repos/${REPO}/deployments?sha=${sha}&per_page=10`);
  if (!depRes.ok) throw new Error(`GitHub deployments ${depRes.status}`);
  const deps = await depRes.json();
  if (!Array.isArray(deps) || deps.length === 0) return { state: "queued", url: null };

  const dep = deps.find((d: any) => (d.creator?.login || "").includes("vercel")) || deps[0];
  const stRes = await gh(`/repos/${REPO}/deployments/${dep.id}/statuses?per_page=10`);
  if (!stRes.ok) throw new Error(`GitHub statuses ${stRes.status}`);
  const statuses = await stRes.json();
  if (!Array.isArray(statuses) || statuses.length === 0) return { state: "pending", url: null };

  const latest = statuses[0]; // most-recent first
  return { state: latest.state || "pending", url: latest.environment_url || null };
}

// Recent commits on the branch — each push is a Vercel deploy, so this is the
// version history the team can roll back to.
export async function listCommits(
  limit = 20
): Promise<{ sha: string; message: string; body: string; author: string; date: string; url: string }[]> {
  const r = await gh(`/repos/${REPO}/commits?sha=${BRANCH}&per_page=${limit}`);
  if (!r.ok) throw new Error(`GitHub commits ${r.status}`);
  const data = await r.json();
  return (data || []).map((c: any) => {
    const msg = c.commit?.message || "";
    return {
      sha: c.sha,
      message: msg.split("\n")[0],
      body: msg.split("\n").slice(1).join("\n").trim(),
      author: c.commit?.author?.name || c.author?.login || "unknown",
      date: c.commit?.author?.date || "",
      url: c.html_url,
    };
  });
}

// Roll the branch back to a previous commit's exact file tree, as a NEW commit on
// top of HEAD. History is preserved, repo + live stay in sync, and it's itself
// reversible. Triggers a fresh Vercel deploy of that snapshot.
export async function rollbackTo(sha: string, message: string): Promise<{ sha: string; url: string }> {
  const targetRes = await gh(`/repos/${REPO}/git/commits/${sha}`);
  if (!targetRes.ok) throw new Error(`GitHub target commit ${targetRes.status}`);
  const targetTree = (await targetRes.json()).tree.sha;

  const refRes = await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
  if (!refRes.ok) throw new Error(`GitHub ref ${refRes.status}`);
  const head = (await refRes.json()).object.sha;

  const commitRes = await gh(`/repos/${REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: targetTree, parents: [head] }),
  });
  if (!commitRes.ok) throw new Error(`GitHub rollback commit ${commitRes.status}`);
  const newSha = (await commitRes.json()).sha;

  const patchRes = await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newSha }),
  });
  if (!patchRes.ok) throw new Error(`GitHub ref update ${patchRes.status}`);

  return { sha: newSha, url: `https://github.com/${REPO}/commit/${newSha}` };
}
