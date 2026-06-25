// AIREA Agent — one agent run. Verifies the admin, gives the model a map of the
// repo + tools to read it, runs a tool-calling loop, and returns the assistant's
// reply, a transcript of what it did, and any staged file edits (with old content
// for diffing). Stateless: the client re-sends the conversation + pending edits.
import { verifyAdmin } from "../_lib/admin";
import { chat, openaiConfigured, getModel, getReasoningModel, getReasoningEffort } from "../_lib/openai";
import { listTree, readFile, githubConfigured } from "../_lib/github";
import { buildSystemPrompt, TOOLS } from "../_lib/knowledge";

// Architecture work (gpt-5.5) can take several reasoning-heavy tool rounds; give
// it room. (Requires a Vercel plan that allows >60s; drops to plan max otherwise.)
export const config = { maxDuration: 300 };

const MAX_STEPS = 12;

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
  const email = await verifyAdmin(req);
  if (!email) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const userMessages = Array.isArray(body.messages) ? body.messages : [];
    const pendingEdits = Array.isArray(body.pendingEdits) ? body.pendingEdits : [];
    if (!userMessages.length) {
      res.status(400).json({ error: "No messages" });
      return;
    }

    // Mode picks the model: "build" → architecture model (gpt-5.5),
    // "reason" → high-reasoning model for bugs / algorithmic code (o3-mini).
    const mode = body.mode === "reason" ? "reason" : "build";
    const model = mode === "reason" ? getReasoningModel() : getModel();
    const reasoningEffort = mode === "reason" ? getReasoningEffort() : undefined;

    let tree: string[] = [];
    try {
      tree = await listTree();
    } catch {
      /* tree is best-effort */
    }

    const messages: any[] = [
      { role: "system", content: buildSystemPrompt(tree, pendingEdits) },
      ...userMessages.map((m: any) => ({ role: m.role, content: String(m.content ?? "") })),
    ];

    // Seed the read cache with pending edits so the model sees unpublished work.
    const fileCache: Record<string, string | null> = {};
    for (const e of pendingEdits) if (e?.path) fileCache[e.path] = String(e.content ?? "");

    const edits: Record<string, any> = {};
    const transcript: { type: string; label: string }[] = [];
    let reply = "";

    for (let step = 0; step < MAX_STEPS; step++) {
      const data = await chat(messages, TOOLS, { model, reasoningEffort });
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

    res.status(200).json({ reply, transcript, edits: Object.values(edits), model, mode });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Agent run failed" });
  }
}
