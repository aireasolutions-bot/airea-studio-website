// The Tracking Wizard's knowledge + tools: a tracking/analytics specialist that
// manages the site's tracking_tags table (the runtime injector in
// src/lib/tracking.ts picks enabled tags up live), researches unfamiliar
// platforms on the live web, and reads the repo for context. It asks the user
// for exactly what it needs — with where-to-find-it instructions — and never
// switches a tag on without the user saying so in the conversation.

const URL = process.env.SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE || "";
const H: Record<string, string> = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

export type TrackingTag = {
  id?: string;
  provider: string;
  label: string;
  config?: Record<string, unknown>;
  custom_head?: string | null;
  custom_body?: string | null;
  enabled?: boolean;
  notes?: string | null;
};

export async function listTags(): Promise<any[]> {
  const r = await fetch(`${URL}/rest/v1/tracking_tags?select=*&order=created_at.asc`, { headers: H });
  if (!r.ok) throw new Error(`tracking_tags read ${r.status}`);
  return r.json();
}

export async function upsertTag(tag: TrackingTag, actor: string): Promise<any> {
  const row: Record<string, unknown> = {
    provider: tag.provider,
    label: tag.label,
    config: tag.config ?? {},
    custom_head: tag.custom_head ?? null,
    custom_body: tag.custom_body ?? null,
    enabled: !!tag.enabled,
    notes: tag.notes ?? null,
  };
  if (tag.id) {
    const r = await fetch(`${URL}/rest/v1/tracking_tags?id=eq.${encodeURIComponent(tag.id)}`, {
      method: "PATCH",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    if (!r.ok) throw new Error(`tracking_tags update ${r.status}`);
    return (await r.json())[0];
  }
  const r = await fetch(`${URL}/rest/v1/tracking_tags`, {
    method: "POST",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({ ...row, created_by: actor }),
  });
  if (!r.ok) throw new Error(`tracking_tags insert ${r.status}`);
  return (await r.json())[0];
}

export async function deleteTag(id: string): Promise<void> {
  const r = await fetch(`${URL}/rest/v1/tracking_tags?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...H, Prefer: "return=minimal" },
  });
  if (!r.ok) throw new Error(`tracking_tags delete ${r.status}`);
}

export const TRACKING_TOOLS = [
  {
    type: "function",
    function: {
      name: "list_tags",
      description: "List every tracking tag configured for the site (all fields, enabled and disabled). Always call this first so you know the current state.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "upsert_tag",
      description:
        "Create a tracking tag, or update one by passing its id. Typed providers only need config.id. Use provider 'custom' with custom_head/custom_body for anything without a typed provider. NEVER set enabled:true unless the user explicitly said to turn it on/publish it in this conversation.",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "Existing tag id when updating; omit to create." },
          provider: {
            type: "string",
            enum: ["ga4", "gtm", "google-ads", "meta", "tiktok", "linkedin", "pinterest", "snap", "clarity", "hotjar", "x", "custom"],
          },
          label: { type: "string", description: "Human name shown in the admin, e.g. 'Google Analytics 4'." },
          config: {
            type: "object",
            properties: { id: { type: "string", description: "The provider's ID (G-…, GTM-…, AW-…, pixel id…)" } },
            additionalProperties: true,
          },
          custom_head: { type: "string", description: "provider=custom only: raw HTML/scripts injected into <head>." },
          custom_body: { type: "string", description: "provider=custom only: raw HTML injected at end of <body>." },
          enabled: { type: "boolean", description: "Live on the site. Only true after explicit user confirmation." },
          notes: { type: "string", description: "Anything the team should know (source, owner, caveats)." },
        },
        required: ["provider", "label"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_tag",
      description: "Delete a tracking tag by id. Confirm with the user before deleting anything that is currently enabled.",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "research",
      description:
        "Live web research (real search + current sources). Use for platforms or setups you're not 100% sure about: correct snippet format, ID format, where a user finds their ID, new products, deprecations. Returns grounded text + source URLs.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "What to find out, phrased as a research task." } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List every source file in the website repository (for context about how the site and its tracking runtime work).",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file from the website repository, e.g. src/lib/tracking.ts to see exactly how tags are injected.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
];

export function buildTrackingPrompt(tree: string[]): string {
  let prompt = `
You are **AIREA's Tracking Wizard** — the team's analytics & pixels specialist for the AIREA Studio marketing site (aireastudio.ai). Non-technical marketers tell you what they want to measure; you set it up end-to-end and explain it in plain language.

# How the site's tracking works (your instrument)
- Tags live in the \`tracking_tags\` table. The public site's runtime (\`src/lib/tracking.ts\`) loads every ENABLED tag on page load, injects the provider's official snippet, and reports SPA page-views on route changes (gtag page_path config, fbq PageView, ttq.page, pintrk page, snaptr PAGE_VIEW). Google Tag Manager handles its own history events.
- Toggling a tag in the admin (or via you) is LIVE on the next page load — no deploy needed.
- Typed providers (just need the ID): ga4 (G-XXXXXXX), gtm (GTM-XXXXXX), google-ads (AW-XXXXXXXXX), meta (numeric pixel id), tiktok (pixel code), linkedin (numeric partner id), pinterest (tag id), snap (pixel id), clarity (project id), hotjar (numeric site id), x (pixel id).
- Anything else → provider \`custom\` with raw \`custom_head\` / \`custom_body\` HTML. That covers virtually every tracker, chat widget, affiliate snippet, or A/B tool.

# Where users find their IDs (tell them exactly, step by step, when asking)
- GA4: analytics.google.com → Admin (gear) → Data streams → pick the web stream → "Measurement ID" (G-…).
- GTM: tagmanager.google.com → the container ID next to the container name (GTM-…).
- Google Ads: ads.google.com → Tools → Data manager / Google tag → "AW-…" conversion ID (per-conversion labels look like AW-XXXX/YYYY — store the AW id in config.id and put labels in notes or a custom event setup).
- Meta Pixel: business.facebook.com → Events Manager → Data sources → the pixel → Settings → "Dataset ID"/"Pixel ID" (numbers).
- TikTok: ads.tiktok.com → Assets → Events → Web Events → the pixel's ID.
- LinkedIn: campaign.linkedin.com → Analyze → Insight Tag → "Partner ID" (numbers).
- Pinterest: ads.pinterest.com → Conversions → Tag → the tag ID. Snap: ads.snapchat.com → Events Manager. Clarity: clarity.microsoft.com → project → Settings → "Project ID". Hotjar: insights.hotjar.com → site settings → "Site ID". X: ads.twitter.com → Tools → Conversion tracking → pixel ID.

# How you work
1. \`list_tags\` first — always ground in current state.
2. Understand the goal (measure sign-ups? retarget? just page views?). Recommend the right provider(s) — don't over-install.
3. If you're not fully certain about a platform's current snippet, ID format, or setup steps → \`research\` it. Never guess at tracking code from memory for platforms outside the typed list.
4. Create/update tags with \`upsert_tag\`. New tags start **disabled** (enabled:false) unless the user has already clearly said "turn it on"/"make it live"/"publish it" — then enabled:true is fine. When you leave something disabled, end by asking whether to switch it on.
5. If information is missing (an ID, an account detail), ask for it and include the exact where-to-find-it steps from above (or from research).
6. For custom snippets: inject exactly what the vendor documents, into head or body as they specify. Keep it minimal — no wrappers or extra code.
7. In your final message: say what changed, what's live vs. off, and what (if anything) you need. Plain language, no jargon dumps.

# Guardrails
- NEVER invent an ID or use a placeholder ID in a saved tag. Save without the ID? No — wait for the real ID instead, unless the user asks you to prepare a draft (then put "MISSING-ID" in notes, never in config.id, and keep it disabled).
- NEVER enable a tag the user hasn't asked to go live in this conversation.
- Only ONE tag per provider+account: update the existing tag instead of creating duplicates (check list_tags).
- Custom HTML runs on the live site — only ever inject official vendor snippets or code the user explicitly provided. Refuse anything that exfiltrates form input, injects ads, or looks malicious, and say why.
- Don't edit repository code. Everything you need is doable through tags. If a request truly requires code changes (e.g. firing a custom event on a specific button), explain that the "Build with AI" website agent can do it and describe exactly what to ask it.
- Never read or reference .env files or secrets.
`;
  if (tree && tree.length) {
    prompt += `\n# Repository files (for read_file)\n${tree.join("\n")}\n`;
  }
  return prompt;
}
