// AIREA Blog Agent — the research → write → save pipeline.
//   POST  → admin-triggered generation (requireAdmin). Body: { topic?, keyword?, autopublish? }.
//   GET   → cron-triggered autorun (Bearer CRON_SECRET). Paces itself to blog_settings.
// One function serves both paths to stay within Vercel's function limit.
import { requireAdmin } from "../_lib/admin.js";
import { openaiConfigured } from "../_lib/openai.js";
import {
  blogConfigured,
  research,
  writeArticle,
  uniqueSlug,
  readingMinutes,
  wordCount,
  insertPost,
  getBlogSettings,
  setLastRun,
} from "../_lib/blog-tools.js";
import { logActivity, reqMeta } from "../_lib/activity.js";

// Deep research + long-form writing can take a while — give it room.
export const config = { maxDuration: 300 };

const DAY = 24 * 3600 * 1000;

// The full subagent pipeline: Strategist+Researcher (web) → Outliner+Writer+SEO editor
// (structured) → assemble → save as draft or published.
async function generate(opts: { topic?: string; keyword?: string; autopublish: boolean; minWords: number }) {
  const { brief, sources, searchUsed, topic } = await research(opts.topic, opts.keyword);
  const art = await writeArticle(brief, sources, opts.minWords);
  const slug = await uniqueSlug(art.slug || art.title);
  const published = opts.autopublish;

  const post: Record<string, any> = {
    slug,
    title: art.title,
    excerpt: art.excerpt,
    body: art.body,
    status: published ? "published" : "draft",
    seo_title: art.seoTitle,
    seo_description: art.seoDescription,
    keywords: art.keywords || opts.keyword || null,
    category: art.category || null,
    tags: Array.isArray(art.tags) ? art.tags : [],
    sources,
    research: { brief: (brief || "").slice(0, 4000), searchUsed, topic, coverPrompt: art.coverPrompt || null },
    author: "The AIREA Team",
    reading_minutes: readingMinutes(art.body),
    word_count: wordCount(art.body),
    published_at: published ? new Date().toISOString() : null,
  };
  const saved = await insertPost(post);
  return { saved, slug, art, sources, searchUsed, published };
}

export default async function handler(req: any, res: any) {
  // ---------- Cron autorun: GET + Bearer CRON_SECRET ----------
  if (req.method === "GET") {
    const secret = process.env.CRON_SECRET || "";
    const bearer = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "");
    if (!secret || bearer !== secret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!openaiConfigured() || !blogConfigured()) {
      res.status(503).json({ error: "Blog agent isn't configured (OpenAI + Supabase env)." });
      return;
    }
    const started = Date.now();
    try {
      const s = await getBlogSettings();
      if (!s?.enabled) {
        res.status(200).json({ ran: false, reason: "disabled" });
        return;
      }
      // The cron fires daily; pace real posts to the configured weekly cadence.
      const perWeek = Math.max(1, Number(s.frequency_per_week) || 1);
      const minGap = (7 / perWeek) * DAY - 6 * 3600 * 1000; // small slack so a daily cron lands
      const last = s.last_run_at ? new Date(s.last_run_at).getTime() : 0;
      if (last && Date.now() - last < minGap) {
        res.status(200).json({ ran: false, reason: "not_due" });
        return;
      }
      // Rotate through the configured themes so topics don't repeat.
      const themes: string[] = Array.isArray(s.themes) ? s.themes : [];
      const topic = themes.length ? String(themes[Math.floor(Date.now() / DAY) % themes.length]) : undefined;

      const out = await generate({
        topic,
        autopublish: s.autopublish === true,
        minWords: Number(s.min_words) || 1200,
      });
      await setLastRun();
      await logActivity({
        actor: "cron@aireastudio.ai",
        action: "blog.generate",
        category: "content",
        target: out.slug,
        targetType: "blog",
        summary: `${out.published ? "Auto-published" : "Auto-drafted"} blog: ${out.art.title}`,
        durationMs: Date.now() - started,
        metadata: { trigger: "cron", autopublish: out.published, searchUsed: out.searchUsed, sources: out.sources.length, words: out.saved?.word_count },
      });
      res.status(200).json({ ran: true, slug: out.slug, published: out.published });
    } catch (e: any) {
      await logActivity({
        actor: "cron@aireastudio.ai",
        action: "blog.generate",
        category: "content",
        status: "error",
        summary: `Auto blog failed: ${e?.message || "error"}`,
        durationMs: Date.now() - started,
      });
      res.status(500).json({ error: e?.message || "Cron generation failed" });
    }
    return;
  }

  // ---------- Manual generation: POST (admin) ----------
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!openaiConfigured()) {
    res.status(503).json({ error: "OpenAI isn't configured — add OPENAI_API_KEY in Vercel." });
    return;
  }
  if (!blogConfigured()) {
    res.status(503).json({ error: "Supabase isn't configured — add SUPABASE_URL and SUPABASE_SERVICE_ROLE in Vercel." });
    return;
  }
  const admin = await requireAdmin(req);
  if ("error" in admin) {
    res.status(admin.status).json({ error: admin.error });
    return;
  }
  const email = admin.email;
  const started = Date.now();
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const topic = body.topic ? String(body.topic).slice(0, 240) : undefined;
    const keyword = body.keyword ? String(body.keyword).slice(0, 120) : undefined;
    const s = await getBlogSettings();
    const autopublish = body.autopublish === true; // manual defaults to a reviewable draft
    const minWords = Number(body.minWords) || Number(s.min_words) || 1200;

    const out = await generate({ topic, keyword, autopublish, minWords });

    await logActivity({
      actor: email,
      action: "blog.generate",
      category: "content",
      target: out.slug,
      targetType: "blog",
      summary: `${autopublish ? "Published" : "Drafted"} blog: ${out.art.title}`,
      durationMs: Date.now() - started,
      metadata: { trigger: "manual", autopublish, searchUsed: out.searchUsed, sources: out.sources.length, words: out.saved?.word_count, topic: topic || "(agent-selected)" },
      ...reqMeta(req),
    });
    res.status(200).json({ post: out.saved, searchUsed: out.searchUsed, sources: out.sources.length });
  } catch (e: any) {
    await logActivity({
      actor: email,
      action: "blog.generate",
      category: "content",
      status: "error",
      summary: `Blog generation failed: ${e?.message || "error"}`,
      durationMs: Date.now() - started,
      ...reqMeta(req),
    });
    res.status(500).json({ error: e?.message || "Blog generation failed" });
  }
}
