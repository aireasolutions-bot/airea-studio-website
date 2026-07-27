// AIREA Agent — one agent run. Verifies the admin, gives the model a map of the
// repo + tools to read it, runs a tool-calling loop, and returns the assistant's
// reply, a transcript of what it did, and any staged file edits (with old content
// for diffing). Stateless: the client re-sends the conversation + pending edits.
import { requireAdmin } from "../_lib/admin.js";
import { logActivity, reqMeta } from "../_lib/activity.js";
import { chat, openaiConfigured, getModel, getReasoningModel, getReasoningEffort, respondWithSearch } from "../_lib/openai.js";
import { listTree, readFile, searchCode, commitFiles, githubConfigured } from "../_lib/github.js";
import { buildSystemPrompt, TOOLS } from "../_lib/knowledge.js";
import { buildTrackingPrompt, TRACKING_TOOLS, listTags, upsertTag, deleteTag } from "../_lib/tracking-knowledge.js";

// Architecture work (gpt-5.5) can take several reasoning-heavy tool rounds; give
// it room. (Requires a Vercel plan that allows >60s; drops to plan max otherwise.)
export const config = { maxDuration: 300 };

const MAX_STEPS = 16;

// Fold any attached image URLs into the user message as explicit, copy-exact text
// so the model embeds the real CDN links (text-only keeps it model-agnostic).
function toModelMessage(m: any) {
  const role = m.role === "assistant" ? "assistant" : "user";
  const text = String(m.content ?? "");
  const atts = Array.isArray(m.attachments) ? m.attachments.filter((a: any) => a && a.url) : [];
  if (role !== "user" || !atts.length) return { role, content: text };
  const list = atts.map((a: any) => `- ${a.url}`).join("\n");
  return {
    role,
    content: `${text}\n\n[Attached image URLs — LIVE public CDN links already hosted for this site. Use the EXACT URL(s) in code so the image displays on the live site:]\n${list}`,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!openaiConfigured() || !githubConfigured()) {
    res.status(503).json({
      error: "Agent not configured. Set OPENAI_API_KEY, OPENAI_MODEL, GITHUB_TOKEN, GITHUB_REPO in Vercel.",
    });
    return;
  }
  const auth = await requireAdmin(req);
  if ("error" in auth) {
    res.status(auth.status).json({ error: auth.error });
    return;
  }

  const started = Date.now();
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const userMessages = Array.isArray(body.messages) ? body.messages : [];
    const pendingEdits = Array.isArray(body.pendingEdits) ? body.pendingEdits : [];
    if (!userMessages.length) {
      res.status(400).json({ error: "No messages" });
      return;
    }

    // Agent picks the persona/tools: "website" (default) edits the repo,
    // "tracking" manages tracking_tags + live research (no code edits).
    const agent = body.agent === "tracking" ? "tracking" : "website";

    // Mode picks the model: "build" → architecture model (gpt-5.5),
    // "reason" → high-reasoning model for bugs / algorithmic code (o3-mini).
    const mode = body.mode === "reason" ? "reason" : "build";
    const model = mode === "reason" ? getReasoningModel() : getModel();
    const reasoningEffort = mode === "reason" ? getReasoningEffort() : undefined;

    let tree: string[] = [];
    try {
      tree = await listTree();
    } catch (e: any) {
      // For the website agent the repo is its whole world — fail fast with a
      // fixable message instead of letting the model shrug "can't reach the
      // repo". (The tracking agent works fine without the tree.)
      if (agent === "website") {
        const status = String(e?.message || "").match(/(\d{3})/)?.[1] ?? "error";
        res.status(502).json({
          error:
            status === "401" || status === "403"
              ? `GitHub rejected the site's access token (HTTP ${status}) — it has likely expired. An owner needs to create a new GitHub personal access token with repo access and update GITHUB_TOKEN in Vercel → Project → Settings → Environment Variables, then redeploy. Content editing (Site editor, Pricing, Design, Tracking) is unaffected.`
              : `Couldn't reach the site's GitHub repository (${e?.message || "unknown error"}). Try again in a minute; if it persists, check GITHUB_TOKEN in Vercel.`,
        });
        return;
      }
    }

    const messages: any[] = [
      {
        role: "system",
        content: agent === "tracking" ? buildTrackingPrompt(tree) : buildSystemPrompt(tree, pendingEdits),
      },
      ...userMessages.map(toModelMessage),
    ];
    const tools = agent === "tracking" ? TRACKING_TOOLS : TOOLS;

    // Seed the read cache with pending edits so the model sees unpublished work.
    const fileCache: Record<string, string | null> = {};
    for (const e of pendingEdits) if (e?.path) fileCache[e.path] = String(e.content ?? "");

    const edits: Record<string, any> = {};
    const tagChanges: { op: string; label: string; enabled: boolean }[] = [];
    const transcript: { type: string; label: string }[] = [];
    let published: { sha: string; url: string; files: number } | null = null;
    let reply = "";

    for (let step = 0; step < MAX_STEPS; step++) {
      const data = await chat(messages, tools, { model, reasoningEffort });
      const msg = data?.choices?.[0]?.message;
      if (!msg) break;
      messages.push(msg);

      if (msg.tool_calls?.length) {
        for (const tc of msg.tool_calls) {
          const name = tc.function?.name;
          let args: any = {};
          try {
            args = JSON.parse(tc.function?.arguments || "{}");
          } catch {
            /* ignore */
          }
          let result = "";

          if (name === "list_files") {
            result = tree.join("\n") || "(repository tree unavailable)";
            transcript.push({ type: "scan", label: "Scanned the codebase" });
          } else if (name === "read_file") {
            const p = String(args.path || "");
            if (fileCache[p] === undefined) {
              try {
                fileCache[p] = await readFile(p);
              } catch {
                fileCache[p] = null;
              }
            }
            const c = fileCache[p];
            result =
              c === null ? `File not found: ${p}` : c.length > 60000 ? c.slice(0, 60000) + "\n…(truncated)" : c;
            transcript.push({ type: "read", label: `Read ${p}` });
          } else if (name === "propose_edit") {
            const p = String(args.path || "");
            if (fileCache[p] === undefined) {
              try {
                fileCache[p] = await readFile(p);
              } catch {
                fileCache[p] = null;
              }
            }
            edits[p] = {
              path: p,
              content: String(args.content ?? ""),
              summary: String(args.summary || ""),
              oldContent: fileCache[p] || "",
              isNew: fileCache[p] === null || fileCache[p] === undefined,
            };
            // Update cache so further edits to the same file build on this one.
            fileCache[p] = String(args.content ?? "");
            result = `Staged edit to ${p}.`;
            transcript.push({ type: "edit", label: `Proposed changes to ${p}` });
          } else if (name === "search_code") {
            const q = String(args.query || "");
            try {
              const hits = await searchCode(q);
              result = hits.length
                ? hits.map((h) => `${h.path}\n  ${h.snippet.replace(/\n/g, " ").trim()}`).join("\n")
                : "No matches.";
            } catch (e: any) {
              result = `Search failed: ${e?.message}`;
            }
            transcript.push({ type: "scan", label: `Searched code for “${q.slice(0, 40)}”` });
          } else if (name === "list_assets") {
            try {
              const q = String(args.query || "").replace(/[%_]/g, "");
              const filter = q ? `&or=(filename.ilike.*${encodeURIComponent(q)}*,folder.ilike.*${encodeURIComponent(q)}*,key.ilike.*${encodeURIComponent(q)}*)` : "";
              const r = await fetch(
                `${process.env.SUPABASE_URL}/rest/v1/assets?select=filename,url,type,folder,width,height&order=created_at.desc&limit=60${filter}`,
                { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE || "", Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE || ""}` } }
              );
              const rows = r.ok ? await r.json() : [];
              result = Array.isArray(rows) && rows.length
                ? rows.map((a: any) => `${a.filename} (${a.type}${a.width ? `, ${a.width}×${a.height}` : ""}, folder: ${a.folder || "-"})\n  ${a.url}`).join("\n")
                : "The asset hub is empty (or no matches).";
            } catch (e: any) {
              result = `Couldn't read the asset hub: ${e?.message}`;
            }
            transcript.push({ type: "scan", label: "Browsed the Asset hub" });
          } else if (name === "publish_site") {
            // Merge earlier unpublished staged edits with this run's, current run winning.
            const byPath = new Map<string, { path: string; content: string }>();
            for (const e of pendingEdits) if (e?.path) byPath.set(e.path, { path: e.path, content: String(e.content ?? "") });
            for (const e of Object.values(edits) as any[]) byPath.set(e.path, { path: e.path, content: e.content });
            const files = Array.from(byPath.values());
            if (!files.length) {
              result = "Nothing is staged — make edits first.";
            } else {
              try {
                const msg = String(args.message || "Website agent update").slice(0, 120);
                const commit = await commitFiles(files, `${msg}\n\nPublished by the AIREA website agent for ${auth.email}`);
                published = { sha: commit.sha, url: commit.url, files: files.length };
                result = `Published ${files.length} file(s) to production: ${commit.url}. Vercel is deploying — live in ~1-2 minutes.`;
                transcript.push({ type: "publish", label: `Published ${files.length} file${files.length > 1 ? "s" : ""} to production` });
              } catch (e: any) {
                result = `Publish failed: ${e?.message}`;
              }
            }
          } else if (name === "list_tags") {
            try {
              result = JSON.stringify(await listTags());
            } catch (e: any) {
              result = `Error listing tags: ${e?.message}`;
            }
            transcript.push({ type: "scan", label: "Checked the site's tracking tags" });
          } else if (name === "upsert_tag") {
            try {
              const saved = await upsertTag(args, auth.email);
              tagChanges.push({ op: args.id ? "updated" : "created", label: String(args.label || args.provider), enabled: !!args.enabled });
              result = `Saved: ${JSON.stringify(saved)}`;
              transcript.push({
                type: "edit",
                label: `${args.id ? "Updated" : "Added"} ${args.label || args.provider}${args.enabled ? " (LIVE)" : " (off)"}`,
              });
            } catch (e: any) {
              result = `Error saving tag: ${e?.message}`;
            }
          } else if (name === "delete_tag") {
            try {
              await deleteTag(String(args.id || ""));
              tagChanges.push({ op: "deleted", label: String(args.id), enabled: false });
              result = "Deleted.";
              transcript.push({ type: "edit", label: "Deleted a tracking tag" });
            } catch (e: any) {
              result = `Error deleting tag: ${e?.message}`;
            }
          } else if (name === "research") {
            const q = String(args.query || "");
            transcript.push({ type: "scan", label: `Researched: ${q.slice(0, 80)}` });
            try {
              const r = await respondWithSearch(q, {
                instructions:
                  "You are researching for a web-analytics implementation. Return current, factual setup details (snippet, ID format, where a user finds their ID in the platform UI). Cite sources.",
                maxOutputTokens: 1200,
              });
              result = `${r.text}\n\nSources:\n${r.citations.map((c) => `- ${c.url}`).join("\n")}`;
            } catch (e: any) {
              result = `Research failed: ${e?.message}`;
            }
          } else {
            result = `Unknown tool: ${name}`;
          }

          messages.push({ role: "tool", tool_call_id: tc.id, content: String(result) });
        }
        continue;
      }

      reply = msg.content || "";
      break;
    }

    const editCount = Object.keys(edits).length;
    await logActivity({
      actor: auth.email,
      action: agent === "tracking" ? "tracking.agent" : "agent.run",
      category: agent === "tracking" ? "tracking" : "agent",
      summary:
        agent === "tracking"
          ? tagChanges.length
            ? `Tracking Wizard: ${tagChanges.map((t) => `${t.op} ${t.label}${t.enabled ? " (live)" : ""}`).join(", ")}`
            : "Ran the Tracking Wizard"
          : editCount
            ? `Website agent staged ${editCount} edit${editCount > 1 ? "s" : ""} (${mode})`
            : `Ran the website agent (${mode})`,
      durationMs: Date.now() - started,
      metadata: { model, mode, edits: editCount, tagChanges, published },
      ...reqMeta(req),
    });
    if (published) {
      await logActivity({
        actor: auth.email,
        action: "agent.publish",
        category: "publish",
        summary: `Website agent published ${published.files} file${published.files > 1 ? "s" : ""} to production`,
        metadata: { sha: published.sha, url: published.url },
        ...reqMeta(req),
      });
    }

    res.status(200).json({ reply, transcript, edits: Object.values(edits), tagChanges, published, model, mode });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Agent run failed" });
  }
}
