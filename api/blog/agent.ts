// AIREA Blog Agent — conversational, streaming. Talks back, does live web research,
// and streams its real working (searches, sources, reasoning, writing) to the UI as
// Server-Sent Events, then saves a draft. POST { messages, draft? }, admin-gated.
import { requireAdmin } from "../_lib/admin.js";
import { openaiConfigured, streamResponses, completeJson } from "../_lib/openai.js";
import {
  blogConfigured,
  research,
  writeArticle,
  uniqueSlug,
  insertPost,
  readingMinutes,
  wordCount,
  getBlogSettings,
  SITE_URL,
  APP_URL,
} from "../_lib/blog-tools.js";
import { logActivity, reqMeta } from "../_lib/activity.js";

export const config = { maxDuration: 300 };

const META_SCHEMA = {
  name: "blog_meta",
  schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      slug: { type: "string" },
      seoTitle: { type: "string" },
      seoDescription: { type: "string" },
      excerpt: { type: "string" },
      category: { type: "string" },
      keywords: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
    },
    required: ["title", "slug", "seoTitle", "seoDescription", "excerpt", "category", "keywords", "tags"],
    additionalProperties: false,
  },
};

function sse(res: any, event: string, data?: any) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!openaiConfigured() || !blogConfigured()) {
    res.status(503).json({ error: "Blog agent isn't configured (OpenAI + Supabase env)." });
    return;
  }
  const admin = await requireAdmin(req);
  if ("error" in admin) {
    res.status(admin.status).json({ error: admin.error });
    return;
  }
  const email = admin.email;

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  const started = Date.now();
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const messages: { role: string; content: string }[] = Array.isArray(body.messages) ? body.messages : [];
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content?.slice(0, 2000) || "";
    const priorDraft = body.draft ? String(body.draft).slice(0, 9000) : "";
    if (!lastUser) {
      sse(res, "error", { error: "Say what you'd like me to write or research." });
      res.end();
      return;
    }

    const settings = await getBlogSettings();
    const minWords = Number(settings.min_words) || 1200;

    sse(res, "step", { label: "Reading your request + planning the angle", kind: "plan" });

    const convo = messages
      .slice(-8)
      .map((m) => `${m.role === "user" ? "User" : "AIREA"}: ${m.content}`)
      .join("\n\n");
    const input = `Conversation so far:\n${convo}\n\n${
      priorDraft ? `Current draft to revise:\n${priorDraft}\n\n` : ""
    }Act on the latest User message. If it asks for a blog post (or a change to one), do thorough LIVE web research (use web_search across several queries) and write/rewrite the COMPLETE article in Markdown. Ground every claim in a real source and cite inline as [text](url). Output only the article body (start at the intro — no H1 title line).`;

    const instructions = `You are AIREA, an expert AI-marketing content strategist and writer for AIREA Studio — "the AI marketing OS" for small businesses and e-commerce. Cover ONLY AI + marketing, and keep it current (2025–2026). NEVER fabricate stats, quotes, or sources — search the web and cite real ones. Write ${minWords}+ words that are genuinely useful, engaging, and on-brand (educational, confident, not hypey), with a hooky intro and logical ## sections. Add 2–3 natural internal links to AIREA on descriptive anchors: ${SITE_URL}, ${SITE_URL}/how-it-works, ${SITE_URL}/pricing, and a sign-up CTA ${APP_URL}/sign-up.`;

    let searches = 0;
    let liveBody = "";
    let finalBody = "";
    let citations: { url: string; title?: string }[] = [];
    let meta: any = null;

    try {
      // --- streaming path: real working surfaced live ---
      const searchIds = new Set<string>();
      const noteSearch = (id: any, query: string) => {
        const key = id != null ? String(id) : `n${searches + 1}`;
        if (searchIds.has(key)) return;
        searchIds.add(key);
        searches++;
        sse(res, "search", { query: query || "", n: searches });
      };
      const out = await streamResponses(input, { instructions, reasoning: true, maxOutputTokens: 7000 }, (evt) => {
        const t = evt?.type || "";
        // web_search shows up as an added output item and/or status events — dedupe by id
        if (t === "response.output_item.added" && evt.item?.type === "web_search_call") {
          noteSearch(evt.item?.id, evt.item?.action?.query || evt.item?.query || "");
        } else if (t === "response.web_search_call.searching" || t === "response.web_search_call.in_progress" || t === "response.web_search_call.completed") {
          noteSearch(evt.item_id, "");
        } else if (t === "response.reasoning_summary_text.delta" && evt.delta) {
          sse(res, "reasoning", { delta: evt.delta });
        } else if (t === "response.output_text.delta" && typeof evt.delta === "string") {
          liveBody += evt.delta;
          sse(res, "delta", { delta: evt.delta });
        } else if (t === "response.output_text.annotation.added" && evt.annotation?.url) {
          sse(res, "source", { url: evt.annotation.url, title: evt.annotation.title || "" });
        }
      });
      finalBody = (out.text || liveBody).trim();
      citations = out.citations;
      if (!finalBody) throw new Error("empty stream");

      sse(res, "step", { label: "Structuring + optimizing for SEO", kind: "seo" });
      meta = await completeJson(
        [
          {
            role: "system",
            content: `Extract publish metadata for this AI-marketing blog article. category ∈ ["AI Marketing","SEO","Content","Paid Ads","Email","Social","E-commerce","Small Business"]. seoTitle ≤ 60 chars; seoDescription 140–160; excerpt 1–2 sentences; keywords comma-separated; tags 3–5; slug short-lowercase-hyphenated.`,
          },
          { role: "user", content: `Article:\n${finalBody.slice(0, 9000)}` },
        ],
        META_SCHEMA
      );
    } catch (streamErr: any) {
      // --- fallback: proven non-streaming pipeline (still saves a draft) ---
      sse(res, "step", { label: "Researching the web", kind: "research" });
      const r = await research(lastUser);
      citations = r.sources;
      searches = citations.length;
      for (const s of citations) sse(res, "source", { url: s.url, title: s.title || "" });
      sse(res, "step", { label: "Writing the article", kind: "write" });
      const art = await writeArticle(r.brief, r.sources, minWords);
      finalBody = art.body;
      sse(res, "delta", { delta: art.body });
      meta = art;
    }

    if (!finalBody || !meta) throw new Error("The agent couldn't produce content — try rephrasing your request.");

    const slug = await uniqueSlug(meta.slug || meta.title);
    const post: Record<string, any> = {
      slug,
      title: meta.title,
      excerpt: meta.excerpt,
      body: finalBody,
      status: "draft",
      seo_title: meta.seoTitle,
      seo_description: meta.seoDescription,
      keywords: meta.keywords || null,
      category: meta.category || null,
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      sources: citations,
      research: { searches, sources: citations.length, via: "agent" },
      author: "The AIREA Team",
      reading_minutes: readingMinutes(finalBody),
      word_count: wordCount(finalBody),
      published_at: null,
    };
    const saved = await insertPost(post);

    await logActivity({
      actor: email,
      action: "blog.agent",
      category: "content",
      target: slug,
      targetType: "blog",
      summary: `AIREA drafted: ${meta.title}`,
      durationMs: Date.now() - started,
      metadata: { searches, sources: citations.length, words: post.word_count },
      ...reqMeta(req),
    });

    sse(res, "draft", { post: saved });
    sse(res, "message", {
      content: `Done — I ran ${searches} web ${searches === 1 ? "search" : "searches"}, drew on ${citations.length} ${
        citations.length === 1 ? "source" : "sources"
      }, and drafted **${meta.title}** (${post.word_count.toLocaleString()} words). It's saved as a draft. Tell me what to change — tone, a new angle, add or cut a section — or say "publish it" and open it from the card to go live.`,
    });
    sse(res, "done", { slug });
    res.end();
  } catch (e: any) {
    sse(res, "error", { error: e?.message || "The agent hit a problem." });
    try {
      await logActivity({
        actor: email,
        action: "blog.agent",
        category: "content",
        status: "error",
        summary: `AIREA agent error: ${e?.message || "error"}`,
        durationMs: Date.now() - started,
        ...reqMeta(req),
      });
    } catch {
      /* best-effort */
    }
    res.end();
  }
}
