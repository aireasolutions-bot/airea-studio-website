// Blog agent knowledge + pipeline: brand context, the research + writing
// subagents, the strict article schema, and Supabase writes (service role).
import { respondWithSearch, completeJson, chat, getModel } from "./openai.js";

const URL = process.env.SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE || "";
const H: Record<string, string> = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

export const SITE_URL = "https://aireastudio.ai";
export const APP_URL = "https://app.aireastudio.ai";

export function blogConfigured(): boolean {
  return !!(URL && KEY);
}

const BRAND = `AIREA Studio is "the AI marketing OS" — it learns a brand's DNA, then plans, designs, writes, and ships on-brand marketing campaigns across social, paid ads, email, and web in minutes. Audience: small businesses, solo founders, service providers, and e-commerce brands. Pricing: Starter $39/mo, Studio $99/mo, Scale $249/mo, 14-day free trial (no card).`;

const GUARDRAILS = `STRICT TOPIC SCOPE: only AI + marketing (AI marketing, content, ads, SEO, email, social, marketing automation, small-business growth, e-commerce marketing). Never write about anything outside AI/marketing. Be CURRENT — reflect 2025–2026 reality; never reference outdated tools or dates. NEVER invent statistics, quotes, studies, or sources — only use facts you actually found. Voice: educational, confident, benefit-led, and genuinely enjoyable to read — like a smart marketer friend. Not hypey, not keyword-stuffed.`;

// --- Subagent 1+2: Strategist + Researcher (live web search) ---
export type Research = { brief: string; sources: { url: string; title?: string }[]; searchUsed: boolean; topic: string };

export async function research(topic?: string, keyword?: string): Promise<Research> {
  const ask = topic
    ? `Research this blog topic for AIREA Studio: "${topic}"${keyword ? ` (target keyword: "${keyword}")` : ""}.`
    : `Pick ONE high-value, currently-relevant blog topic that AIREA Studio's audience is actively searching for (AI marketing for small businesses / e-commerce). Then research it.`;
  const input = `${ask}

Search the web for CURRENT, accurate information. Produce a research brief containing:
- The exact topic + a compelling, specific angle
- The primary keyword + 3–5 secondary keywords + the search intent (informational / commercial)
- 6–10 concrete, current facts / stats / examples — each with the source you found it in
- Notable current trends or news (2025–2026) relevant to the topic
- 2–3 natural places to reference an AI marketing platform like AIREA
Be thorough and specific, and cite real sources.`;

  try {
    const r = await respondWithSearch(input, {
      instructions: `You are AIREA's senior SEO content strategist and researcher. ${BRAND}\n${GUARDRAILS}`,
      maxOutputTokens: 3500,
    });
    if (!r.text) throw new Error("empty");
    return { brief: r.text, sources: r.citations, searchUsed: true, topic: topic || "(agent-selected)" };
  } catch {
    // Fallback: research from the model's own knowledge (no live sources).
    const data = await chat(
      [
        { role: "system", content: `You are AIREA's senior SEO content strategist. ${BRAND}\n${GUARDRAILS}` },
        { role: "user", content: input + "\n\n(No web access right now — use your best current knowledge; do NOT fabricate specific stats or named sources.)" },
      ],
      [],
      { model: getModel() }
    );
    return { brief: data?.choices?.[0]?.message?.content || "", sources: [], searchUsed: false, topic: topic || "(agent-selected)" };
  }
}

// --- Subagent 3+4+5: Outliner + Writer + SEO editor (structured output) ---
const ARTICLE_SCHEMA = {
  name: "blog_article",
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
      body: { type: "string" },
      coverPrompt: { type: "string" },
    },
    required: ["title", "slug", "seoTitle", "seoDescription", "excerpt", "category", "keywords", "tags", "body", "coverPrompt"],
    additionalProperties: false,
  },
};

export async function writeArticle(brief: string, sources: { url: string; title?: string }[], minWords: number): Promise<any> {
  const sourceList = sources.length
    ? "Sources you may cite — use inline markdown links to these where they support a claim:\n" +
      sources.map((s) => `- ${s.title || s.url}: ${s.url}`).join("\n")
    : "No external sources were provided — do not invent any; write from the brief.";

  const system = `You are AIREA's award-winning SEO content writer and editor. ${BRAND}\n${GUARDRAILS}

Write a complete, publish-ready blog post in MARKDOWN from the research brief. Requirements:
- ${minWords}+ words. Genuinely engaging, educational, and aspirational — great for a real reader, not just for SEO.
- Structure: a hooky intro (no "In today's world" clichés), logical ## H2 and ### H3 sections matched to search intent, short paragraphs, bullet lists where useful, and a strong conclusion with a soft CTA.
- Weave the researched facts in naturally; add inline markdown source links [anchor](url) to the provided sources where they back a claim.
- Include 2–3 natural INTERNAL links to AIREA on descriptive anchor text (never spammy): homepage ${SITE_URL}, ${SITE_URL}/how-it-works, ${SITE_URL}/pricing, ${SITE_URL}/small-business, ${SITE_URL}/ecommerce, and a sign-up CTA ${APP_URL}/sign-up.
- Field rules: slug = short, lowercase, hyphenated. seoTitle ≤ 60 chars. seoDescription 140–160 chars. excerpt = 1–2 sentences. keywords = comma-separated. tags = 3–5. category = one of "AI Marketing","SEO","Content","Paid Ads","Email","Social","E-commerce","Small Business". coverPrompt = a vivid on-brand cover-image prompt (brand blue #0047FF, modern, editorial, NO text).
- Do NOT include the H1/title inside "body" (title is a separate field). Start "body" with the intro paragraph.`;

  return completeJson(
    [
      { role: "system", content: system },
      { role: "user", content: `RESEARCH BRIEF:\n${brief}\n\n${sourceList}` },
    ],
    ARTICLE_SCHEMA
  );
}

// ---- helpers + Supabase ----
export function slugify(s: string): string {
  return (
    (s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "post"
  );
}
export function readingMinutes(md: string): number {
  return Math.max(1, Math.round((md || "").split(/\s+/).filter(Boolean).length / 220));
}
export function wordCount(md: string): number {
  return (md || "").split(/\s+/).filter(Boolean).length;
}

export async function uniqueSlug(base: string): Promise<string> {
  const slug = slugify(base);
  const r = await fetch(`${URL}/rest/v1/blog_posts?select=slug&slug=like.${encodeURIComponent(slug)}*`, { headers: H });
  const taken = new Set<string>(r.ok ? ((await r.json()) || []).map((x: any) => x.slug) : []);
  if (!taken.has(slug)) return slug;
  for (let i = 2; i < 60; i++) if (!taken.has(`${slug}-${i}`)) return `${slug}-${i}`;
  return `${slug}-x`;
}

export async function insertPost(post: any): Promise<any> {
  const r = await fetch(`${URL}/rest/v1/blog_posts`, {
    method: "POST",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify(post),
  });
  if (!r.ok) throw new Error(`Couldn't save the post (${r.status}): ${(await r.text()).slice(0, 200)}`);
  const rows = await r.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function getBlogSettings(): Promise<any> {
  const r = await fetch(`${URL}/rest/v1/blog_settings?id=eq.1&select=*`, { headers: H });
  if (!r.ok) return {};
  const rows = await r.json();
  return (Array.isArray(rows) ? rows[0] : rows) || {};
}

// Stamp the autorun clock so the cron paces posts to the configured cadence.
export async function setLastRun(): Promise<void> {
  await fetch(`${URL}/rest/v1/blog_settings?id=eq.1`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=minimal" },
    body: JSON.stringify({ last_run_at: new Date().toISOString() }),
  }).catch(() => {});
}
