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
