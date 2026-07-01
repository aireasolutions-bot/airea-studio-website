// SEO agent knowledge + tools. Reads/writes per-page SEO overrides (seo_meta) and
// reads page copy (content_blocks) with the service role, so the agent can audit
// and optimize titles, descriptions, keywords, and structured data.
const URL = process.env.SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE || "";
const H: Record<string, string> = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

export const SITE_URL = "https://aireastudio.ai";

export function seoConfigured(): boolean {
  return !!(URL && KEY);
}

// Known marketing pages + baseline meta (mirrors src/lib/seo.ts PAGE_SEO). The
// agent writes overrides to seo_meta, which take precedence on the live site.
export const PAGES = [
  {
    path: "/",
    slug: "home",
    label: "Home",
    title: "AIREA Studio — One source. Every channel. On brand.",
    description:
      "AIREA Studio is the AI marketing OS. Turn one photo or one brief into a full, on-brand campaign across every channel — and ship it in minutes. Start your 14-day free trial.",
  },
  {
    path: "/pricing",
    slug: "pricing",
    label: "Pricing",
    title: "Pricing — AIREA Studio | AI Marketing Plans from $39/mo",
    description:
      "Simple plans for AIREA Studio, the AI marketing OS: Starter $39, Studio $99, Scale $249 per month. 14-day free trial, no credit card required.",
  },
  {
    path: "/small-business",
    slug: "small-business",
    label: "Small business",
    title: "AI Marketing for Small Business — AIREA Studio",
    description:
      "Look like a national brand on a neighborhood budget. AIREA Studio plans, designs, and ships on-brand campaigns across every channel for small businesses — in minutes.",
  },
  {
    path: "/ecommerce",
    slug: "ecommerce",
    label: "E-commerce",
    title: "AI Marketing for E-commerce — AIREA Studio",
    description:
      "Turn one product photo into every ad, in every ratio. AIREA Studio creates catalog-scale, on-brand creative across Meta, Google, email, and the web.",
  },
  {
    path: "/how-it-works",
    slug: "how-it-works",
    label: "How it works",
    title: "How AIREA Studio Works — From One Brief to a Full Campaign",
    description:
      "Train your Brand DNA, brief a goal, pick channels, set creative direction, review with AI, and deploy everywhere. See how AIREA Studio turns one source into a full campaign.",
  },
  {
    path: "/faq",
    slug: "faq",
    label: "FAQ",
    title: "AIREA Studio FAQ — AI Marketing for Small Business",
    description:
      "Answers about AIREA Studio, the AI marketing platform for small businesses: how it works, channels, Brand DNA training, pricing, security, and getting started.",
  },
];

export async function readSeoMeta(): Promise<Record<string, any>> {
  try {
    const r = await fetch(`${URL}/rest/v1/seo_meta?select=*`, { headers: H });
    if (!r.ok) return {};
    const rows = await r.json();
    const map: Record<string, any> = {};
    for (const row of rows || []) map[row.path] = row;
    return map;
  } catch {
    return {};
  }
}

export async function upsertSeoMeta(path: string, patch: Record<string, any>, email: string): Promise<void> {
  const row: Record<string, any> = { path, ...patch, updated_at: new Date().toISOString(), updated_by: email };
  const r = await fetch(`${URL}/rest/v1/seo_meta?on_conflict=path`, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`Couldn't save SEO for ${path} (${r.status})`);
}

// Page copy (current editable text) so the agent can optimize around what the page actually says.
export async function readPageContent(slug: string): Promise<Record<string, string>> {
  try {
    const r = await fetch(`${URL}/rest/v1/content_blocks?page=eq.${encodeURIComponent(slug)}&select=key,draft_value`, {
      headers: H,
    });
    if (!r.ok) return {};
    const rows = await r.json();
    const out: Record<string, string> = {};
    for (const row of rows || []) {
      const v = row.draft_value;
      const text = typeof v === "string" ? v : v == null ? "" : String(v);
      if (text) out[row.key] = text.length > 300 ? text.slice(0, 300) + "…" : text;
    }
    return out;
  } catch {
    return {};
  }
}

export type Effective = { path: string; label: string; title: string; description: string; keywords?: string; noindex?: boolean; ogImage?: string; hasOverride: boolean };

export function effectiveFor(page: (typeof PAGES)[number], meta: Record<string, any>): Effective {
  const o = meta[page.path] || {};
  return {
    path: page.path,
    label: page.label,
    title: o.title || page.title,
    description: o.description || page.description,
    keywords: o.keywords || undefined,
    noindex: o.noindex ?? false,
    ogImage: o.og_image || undefined,
    hasOverride: !!meta[page.path],
  };
}

export function auditOne(e: Effective): { severity: "high" | "med" | "low"; msg: string }[] {
  const issues: { severity: "high" | "med" | "low"; msg: string }[] = [];
  const t = e.title || "";
  const d = e.description || "";
  if (!t) issues.push({ severity: "high", msg: "Missing title tag" });
  else {
    if (t.length > 60) issues.push({ severity: "med", msg: `Title is ${t.length} chars (>60 may truncate in search)` });
    if (t.length < 30) issues.push({ severity: "low", msg: `Title is ${t.length} chars (<30 is short)` });
  }
  if (!d) issues.push({ severity: "high", msg: "Missing meta description" });
  else {
    if (d.length > 160) issues.push({ severity: "med", msg: `Description is ${d.length} chars (>160 may truncate)` });
    if (d.length < 70) issues.push({ severity: "low", msg: `Description is ${d.length} chars (<70 is thin)` });
  }
  if (!e.keywords) issues.push({ severity: "low", msg: "No focus keyword set" });
  if (e.noindex) issues.push({ severity: "high", msg: "Page is set to noindex — it won't be indexed" });
  return issues;
}

export const SEO_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_pages",
      description:
        "List every page with its current effective SEO (title, description, keywords, noindex) and a quick rule-based audit. Call this first to understand the current state.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_page_content",
      description:
        "Read the actual on-page copy (headlines, body) for a page, so you can write titles/descriptions grounded in what the page really says. Provide the page slug (e.g. 'pricing').",
      parameters: {
        type: "object",
        properties: { slug: { type: "string", description: "Page slug, e.g. home, pricing, small-business, ecommerce, how-it-works, faq" } },
        required: ["slug"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_page_seo",
      description:
        "Apply optimized SEO to a page. Only include fields you want to change; omit others to leave them at their current value. Changes go live immediately on the site.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Route path, e.g. / or /pricing" },
          title: { type: "string", description: "Title tag, ideally ≤ 60 characters with the primary keyword near the front." },
          description: { type: "string", description: "Meta description, ideally 140–160 characters, benefit-led, with the keyword and a soft CTA." },
          keywords: { type: "string", description: "Primary focus keyword (and close variants), comma-separated." },
          og_image: { type: "string", description: "Absolute URL of the social share image (optional)." },
          noindex: { type: "boolean", description: "Set true to keep this page out of search (rare)." },
          summary: { type: "string", description: "One short sentence on what you changed and why." },
        },
        required: ["path", "summary"],
        additionalProperties: false,
      },
    },
  },
];

export function buildSeoSystemPrompt(pages: Effective[]): string {
  const table = pages
    .map((p) => {
      const audit = auditOne(p);
      const flags = audit.length ? ` — ⚠️ ${audit.map((a) => a.msg).join("; ")}` : " — ✓ ok";
      return `- ${p.path} (${p.label}) | title(${(p.title || "").length}): "${p.title}" | desc(${(p.description || "").length}): "${p.description}" | keyword: ${p.keywords || "—"} | ${p.hasOverride ? "override set" : "default"}${flags}`;
    })
    .join("\n");

  return `You are the **AIREA SEO Agent** — a world-class technical + on-page SEO and generative-engine-optimization (GEO) specialist working inside the admin of **AIREA Studio** (aireastudio.ai), an AI marketing SaaS for small businesses and lean teams.

Your job: audit the site's SEO, then optimize titles, meta descriptions, focus keywords, and structured data — and APPLY the improvements with the set_page_seo tool. Changes go live on the site immediately.

# How you work
1. Start with \`list_pages\` to see current state + the quick audit.
2. When optimizing a page, call \`get_page_content\` first so your copy reflects what the page actually says (never invent features).
3. Write the improved meta, then call \`set_page_seo\` to apply it. Do one page per call; you may optimize several pages in a turn.
4. In your final message, summarize what you changed (or recommend) in clear, confident language a founder understands. Show before → after when useful.

# On-page SEO rules (what "good" means)
- **Title tag**: ≤ 60 characters, primary keyword near the front, brand at the end ("… — AIREA Studio"). Unique per page. Compelling for click-through, not keyword-stuffed.
- **Meta description**: 140–160 characters, benefit-led, includes the primary keyword naturally and a soft call to action. Unique per page. It shapes both click-through and how AI answer engines summarize the page.
- **Focus keyword**: one primary phrase per page that matches real search intent (informational vs commercial). Prefer specific, winnable long-tail phrases over vague head terms.
- **Match search intent**: pricing pages target commercial ("… pricing", "… cost", "… plans"); how-it-works targets informational ("how to …", "how … works"); category pages target "AI marketing for [X]".

# GEO — get cited by AI answer engines (ChatGPT, Perplexity, Google AI Overviews)
- Favor clarity, specific numbers, and factual, authoritative phrasing (these measurably increase AI citation).
- Descriptions that read like a crisp, self-contained answer get pulled into AI summaries. Avoid fluff and superlatives with no substance.
- Never keyword-stuff — it actively hurts AI visibility.

# Brand facts (never contradict these)
- AIREA Studio = "the AI marketing OS". It learns a brand's DNA, then plans, designs, writes, and ships on-brand campaigns across social, paid ads, email, and web — in minutes.
- Audience: small businesses, solo founders, service providers, e-commerce brands.
- Pricing: Starter $39/mo, Studio $99/mo, Scale $249/mo. 14-day free trial, no credit card.
- Never invent competitors, fake stats, testimonials, or features the product doesn't have.

# Guardrails
- Only set \`noindex\` if the user explicitly asks. Default pages must stay indexable.
- Keep titles/descriptions truthful and on-brand. If a request would be misleading or off-brand, say so and propose a better version.

# Current pages & SEO
${table}
`;
}
