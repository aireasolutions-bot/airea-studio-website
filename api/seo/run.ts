// AIREA SEO Agent — audits the site's SEO and applies optimized titles,
// descriptions, keywords, and structured data to seo_meta (live). Admin-gated.
import { requireAdmin } from "../_lib/admin.js";
import { chat, openaiConfigured, getModel } from "../_lib/openai.js";
import {
  seoConfigured,
  PAGES,
  readSeoMeta,
  upsertSeoMeta,
  readPageContent,
  effectiveFor,
  auditOne,
  SEO_TOOLS,
  buildSeoSystemPrompt,
  type Effective,
} from "../_lib/seo-tools.js";

export const config = { maxDuration: 120 };

const MAX_STEPS = 10;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!openaiConfigured()) {
    res.status(503).json({ error: "SEO agent not configured. Set OPENAI_API_KEY (+ model) in Vercel." });
    return;
  }
  if (!seoConfigured()) {
    res.status(503).json({ error: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE in Vercel." });
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
    const userMessages = Array.isArray(body.messages) ? body.messages : [];
    if (!userMessages.length) {
      res.status(400).json({ error: "No messages" });
      return;
    }

    const meta = await readSeoMeta();
    const effective: Effective[] = PAGES.map((p) => effectiveFor(p, meta));

    const messages: any[] = [
      { role: "system", content: buildSeoSystemPrompt(effective) },
      ...userMessages.map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content ?? "") })),
    ];

    const transcript: { type: string; label: string }[] = [];
    const changes: any[] = [];
    let reply = "";

    for (let step = 0; step < MAX_STEPS; step++) {
      const data = await chat(messages, SEO_TOOLS, { model: getModel() });
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

          if (name === "list_pages") {
            result = JSON.stringify(effective.map((e) => ({ ...e, audit: auditOne(e) })));
            transcript.push({ type: "scan", label: "Audited all pages" });
          } else if (name === "get_page_content") {
            const slug = String(args.slug || "");
            const content = await readPageContent(slug);
            result = Object.keys(content).length
              ? JSON.stringify(content)
              : "(no editable copy found for this page)";
            transcript.push({ type: "read", label: `Read ${slug} copy` });
          } else if (name === "set_page_seo") {
            const path = String(args.path || "");
            const known = PAGES.find((p) => p.path === path);
            if (!known) {
              result = `Unknown page path: ${path}. Valid paths: ${PAGES.map((p) => p.path).join(", ")}`;
            } else {
              const patch: Record<string, any> = {};
              if (typeof args.title === "string") patch.title = args.title;
              if (typeof args.description === "string") patch.description = args.description;
              if (typeof args.keywords === "string") patch.keywords = args.keywords;
              if (typeof args.og_image === "string") patch.og_image = args.og_image;
              if (typeof args.noindex === "boolean") patch.noindex = args.noindex;
              try {
                await upsertSeoMeta(path, patch, email);
                const idx = effective.findIndex((e) => e.path === path);
                if (idx >= 0) {
                  effective[idx] = {
                    ...effective[idx],
                    ...(patch.title !== undefined ? { title: patch.title } : {}),
                    ...(patch.description !== undefined ? { description: patch.description } : {}),
                    ...(patch.keywords !== undefined ? { keywords: patch.keywords } : {}),
                    ...(patch.noindex !== undefined ? { noindex: patch.noindex } : {}),
                    hasOverride: true,
                  };
                }
                changes.push({ path, label: known.label, ...patch, summary: String(args.summary || "") });
                result = `Applied SEO to ${path} — live now.`;
                transcript.push({ type: "edit", label: `Optimized ${known.label}` });
              } catch (e: any) {
                result = `Failed to save ${path}: ${e?.message || "error"}`;
              }
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

    res.status(200).json({ reply, transcript, changes });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "SEO agent failed" });
  }
}
