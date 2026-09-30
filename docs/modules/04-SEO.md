# Module 04 — SEO & AI Discoverability

> Everything that makes the site findable, previewable, and citable: per-page titles and
> descriptions the team can edit, a schema.org entity graph, real link previews in Slack /
> LinkedIn / iMessage, crawlable HTML for bots that don't run JavaScript, a sitemap that is
> never stale, robots and `llms.txt` for AI crawlers — plus an SEO console with live audit
> checks and an SEO agent.

| | |
|---|---|
| **Depends on** | 00 Foundation |
| **Integrates with** | 01 Website Builder (content, `useSeo`) · 03 Asset Hub (OG images) · any content type (blog, help centre) via resolvers |
| **Provides** | `seo_meta` · `<Seo>` · JSON-LD builders · crawler middleware · `/sitemap.xml` · `robots.txt` · `llms.txt` · SEO Console · SEO agent |
| **Reference build** | AIREA Studio — verified live against Slack, LinkedIn, WhatsApp, Discord, GPTBot, ClaudeBot, Googlebot UAs |

---

## 1. What it does

| Capability | Detail |
|---|---|
| Per-page metadata | Title, description, canonical, OG image, keywords, noindex — defaults in code, overrides from the admin, live instantly |
| Structured data | A linked schema.org graph (Organization → WebSite → Product/Software) plus per-page FAQPage, Article, BreadcrumbList |
| Link previews | Every URL shares with *its own* title, description, and image — not the homepage's |
| Crawlable content | Bots that don't run JS receive real HTML for content pages (help answers, posts) |
| Always-current sitemap | Generated at request time from live content, with real `lastmod` dates |
| AI crawler policy | `robots.txt` explicitly welcoming answer engines; `llms.txt` summary; machine-readable pricing |
| SEO Console | Every page's effective metadata, per-page editor, live audit checks, reset to default |
| SEO agent | "Audit the whole site", "sharpen the pricing page" — it reads pages and writes metadata |
| Host consolidation | One canonical host; preview hosts 308 to it |

---

## 2. How it works — four layers

```
LAYER 1 · Per-route metadata          LAYER 2 · Structured data
  PAGE_SEO (code defaults)              Organization ─┐  @id graph, linked by
    ▲ overridden by                     WebSite ──────┤  "@id": "<site>/#organization"
  seo_meta (admin, live)                Software/Product ┘
    ▼                                   + per page: FAQPage · Article · BreadcrumbList
  <Seo path=… /> sets <head> in the browser

LAYER 3 · Crawler layer (edge middleware)            LAYER 4 · Discovery files
  bot UA? ─ no ─► normal SPA (humans untouched)        /sitemap.xml  → runtime function
          └ yes ─► fetch index.html (loop-guarded)     /robots.txt   → static, AI-welcoming
                   resolveMeta(path)  ◄─ resolvers     /llms.txt     → static summary
                   inject head tags + JSON-LD          /pricing.md   → machine-readable
                   inject body HTML into #root
                   fail open on ANY error
```

**Why layer 3 exists.** A client-rendered SPA serves every URL the same `index.html`. Social
scrapers and most AI crawlers don't execute JavaScript — so every shared link previews as
the homepage, and help/blog content is invisible to answer engines. The middleware serves
those bots the same shell with the page's real metadata and content already in it. This is
Google's documented **dynamic rendering** pattern, not cloaking: every value comes from the
same source the browser renders from. (On Next.js with SSR, skip layer 3 entirely.)

---

## 3. Brand configuration

```ts
// src/lib/seo.ts
import { BRAND } from "../../brand.config";

export const SITE_URL = BRAND.siteUrl;
export const SITE_NAME = BRAND.name;
export const OG_IMAGE = BRAND.ogImage;                 // 1200×630
export const DEFAULT_TITLE = `${BRAND.name} — ${BRAND.tagline}`;
export const DEFAULT_DESCRIPTION = BRAND.description;

export type PageSeo = { title: string; description: string; priority: number; changefreq: "daily" | "weekly" | "monthly" | "yearly" };

// 🔁 BRAND: per-route defaults. Titles ≤ ~60 chars, descriptions ~140–160.
export const PAGE_SEO: Record<string, PageSeo> = {
  "/":        { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, priority: 1.0, changefreq: "weekly" },
  "/pricing": { title: `Pricing — ${SITE_NAME}`, description: "…", priority: 0.9, changefreq: "monthly" },
  "/faq":     { title: `Help Center — ${SITE_NAME}`, description: "…", priority: 0.8, changefreq: "weekly" },
};

export const pageSeo = (path: string): PageSeo =>
  PAGE_SEO[path] ?? { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, priority: 0.5, changefreq: "monthly" };

export const canonical = (path: string) => (path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path.replace(/\/+$/, "")}`);
```

`PAGE_SEO` must be importable by **both** the browser bundle and the edge middleware — keep
it free of React and browser APIs.

---

## 4. Data model

```sql
create table public.seo_meta (
  path        text primary key,          -- '/pricing'
  title       text,
  description text,
  og_image    text,
  canonical   text,                      -- only when different from the default
  noindex     boolean not null default false,
  keywords    text,                      -- comma-separated; first = focus keyword
  priority    numeric,
  changefreq  text,
  jsonld      jsonb,                     -- extra structured data for this page
  updated_at  timestamptz not null default now(),
  updated_by  text
);
alter table public.seo_meta enable row level security;
create policy p_seo_read  on public.seo_meta for select using (true);        -- the site renders it
create policy p_seo_write on public.seo_meta for all using (is_admin()) with check (is_admin());
```

SEO overrides go **live instantly** (no draft stage) — a deliberate choice: metadata edits
are low-risk, and SEO work is iterative. If a brand wants review first, add
`draft_*` columns mirroring Module 01's pattern.

### Resolution order (identical in browser and middleware)

```
seo_meta override  →  component props  →  PAGE_SEO[path]  →  site defaults
```

---

## 5. Browser layer — `<Seo>`

Load `seo_meta` once, alongside content, and expose it by path:

```ts
// in ContentProvider (Module 01): fetch seo_meta?select=* once, then
const SeoCtx = createContext<(path: string) => SeoOverride>(() => ({}));
export const useSeo = () => useContext(SeoCtx);
```

```tsx
// src/components/Seo.tsx — dependency-free head manager
type Props = { path: string; title?: string; description?: string; image?: string;
               type?: "website" | "article" | "product"; noindex?: boolean; jsonLd?: object[] };

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute("content", content);
}
function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
  el.setAttribute("href", href);
}

export function Seo({ path, title, description, image, type = "website", noindex, jsonLd }: Props) {
  const o = useSeo()(path);
  const fb = pageSeo(path);
  const t = o.title || title || fb.title;
  const d = o.description || description || fb.description;
  const url = o.canonical || canonical(path);
  const img = o.ogImage || image || OG_IMAGE;
  const noidx = o.noindex ?? noindex ?? false;
  const all = [...(jsonLd ?? []), ...(o.jsonld ? [o.jsonld as object] : [])];
  const ldKey = JSON.stringify(all);

  useEffect(() => {
    document.title = t;
    upsertMeta("name", "description", d);
    upsertLink("canonical", url);
    upsertMeta("name", "robots", noidx ? "noindex, nofollow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
    upsertMeta("property", "og:title", t);
    upsertMeta("property", "og:description", d);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:image", img);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", BRAND.locale);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", t);
    upsertMeta("name", "twitter:description", d);
    upsertMeta("name", "twitter:image", img);

    // Page JSON-LD, removed on route change (SPA — otherwise it accumulates).
    const nodes = all.map((obj) => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.setAttribute("data-seo-jsonld", "");
      s.textContent = JSON.stringify(obj);
      document.head.appendChild(s);
      return s;
    });
    return () => nodes.forEach((n) => n.remove());
  }, [t, d, url, img, type, noidx, ldKey]);

  return null;
}
```

Every page renders exactly one `<Seo path="/…" />`. Content pages pass their own title,
description, image, `type="article"`, and JSON-LD.

---

## 6. Structured data — a linked entity graph

Entities reference each other by `@id`, so search engines build one coherent picture of
the brand instead of disconnected fragments.

```ts
// src/lib/seo.ts (continued)
export const organizationSchema = () => ({
  "@context": "https://schema.org", "@type": "Organization", "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME, legalName: BRAND.legalName, url: SITE_URL,
  logo: { "@type": "ImageObject", url: BRAND.logo.full || OG_IMAGE },
  description: DEFAULT_DESCRIPTION, slogan: BRAND.tagline,
  sameAs: Object.values(BRAND.social).filter(Boolean),     // strengthens entity recognition
});

export const websiteSchema = () => ({
  "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE_URL}/#website`,
  url: SITE_URL, name: SITE_NAME, description: DEFAULT_DESCRIPTION, inLanguage: BRAND.language,
  publisher: { "@id": `${SITE_URL}/#organization` },
});

// 🔁 BRAND: SoftwareApplication for SaaS, Product for goods, LocalBusiness for venues.
export const softwareSchema = (plans: { name: string; price: string; blurb: string }[]) => ({
  "@context": "https://schema.org", "@type": "SoftwareApplication", "@id": `${SITE_URL}/#software`,
  name: SITE_NAME, applicationCategory: "BusinessApplication", operatingSystem: "Web-based", url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  offers: {
    "@type": "AggregateOffer", priceCurrency: BRAND.currency, offerCount: plans.length,
    lowPrice: Math.min(...plans.map((p) => +p.price.replace(/[^0-9.]/g, ""))),
    highPrice: Math.max(...plans.map((p) => +p.price.replace(/[^0-9.]/g, ""))),
    offers: plans.map((p) => ({ "@type": "Offer", name: p.name, price: p.price.replace(/[^0-9.]/g, ""),
                                priceCurrency: BRAND.currency, url: `${SITE_URL}/pricing`, description: p.blurb })),
  },
  publisher: { "@id": `${SITE_URL}/#organization` },
});

export const faqSchema = (items: { q: string; a: string }[]) => ({
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: items.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })),
});

export const breadcrumbSchema = (trail: { name: string; path: string }[]) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: canonical(t.path) })),
});

export const articleSchema = (p: { title: string; description: string; image?: string; path: string; published?: string; modified?: string; author?: string }) => ({
  "@context": "https://schema.org", "@type": "Article", headline: p.title, description: p.description,
  image: p.image ? [p.image] : undefined, mainEntityOfPage: canonical(p.path),
  datePublished: p.published, dateModified: p.modified ?? p.published,
  author: { "@type": p.author ? "Person" : "Organization", name: p.author ?? SITE_NAME },
  publisher: { "@id": `${SITE_URL}/#organization` },
});
```

| Page | JSON-LD |
|---|---|
| Every page (static, in `index.html`) | Organization · WebSite |
| Home | + Software/Product |
| Pricing | + Software/Product with offers |
| Help hub / category / question | FAQPage + BreadcrumbList |
| Blog post | Article + BreadcrumbList |

FAQ answers in JSON-LD must be **plain text** — strip markdown first.

---

## 7. Static baseline — `index.html`

The shell every request receives. It carries sitewide defaults so that even a crawler the
middleware doesn't recognize sees *something* correct:

```html
<title>Acme — The one-line promise.</title>
<meta name="description" content="…default description…" />
<meta name="theme-color" content="#FAFAFA" />
<link rel="icon" href="/favicon.png" /><link rel="apple-touch-icon" href="/favicon.png" />
<meta property="og:site_name" content="Acme" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="en_US" />
<meta property="og:url" content="https://acme.com/" />
<meta property="og:title" content="…" />
<meta property="og:description" content="…" />
<meta property="og:image" content="https://assets.acme.com/og.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="…" /><meta name="twitter:description" content="…" />
<meta name="twitter:image" content="https://assets.acme.com/og.png" />
<script type="application/ld+json">[ …Organization…, …WebSite… ]</script>
```

`<Seo>` replaces these per route in browsers; the middleware replaces them per route for bots.
**Keep `<div id="root"></div>` empty and exactly in that form** — the middleware injects
into it (§8).

---

## 8. Crawler middleware

### 8.1 Reference implementation — pluggable resolvers

Each content type registers a **resolver**: given a path, return that page's metadata (and
optionally JSON-LD and body HTML), or `null` to pass. The static-route resolver runs last.

```ts
// middleware.ts
import { next } from "@vercel/edge";
import { PAGE_SEO, SITE_URL, SITE_NAME, OG_IMAGE, DEFAULT_TITLE, DEFAULT_DESCRIPTION } from "./src/lib/seo";

export const config = {
  // Skip the API, the admin, hashed build assets, proxies, and anything with an extension.
  matcher: ["/((?!api/|admin|build/|assets/|brandfonts/|.*\\.).*)"],
};

const BOTS = /(facebookexternalhit|facebookcatalog|facebot|twitterbot|linkedinbot|slackbot|slack-imgproxy|whatsapp|telegrambot|discordbot|pinterest(bot)?|redditbot|applebot|skypeuripreview|vkshare|embedly|iframely|quora link preview|bitlybot|flipboard|tumblr|mastodon|bluesky|googlebot|google-inspectiontool|bingbot|duckduckbot|yandex(bot)?|baiduspider|gptbot|chatgpt-user|oai-searchbot|perplexitybot|claudebot|claude-web|anthropic-ai|google-extended|ccbot|bytespider|amazonbot|meta-externalagent|cohere-ai|diffbot)/i;

const LOOP_HEADER = "x-cms-prerender";

export type Meta = {
  title: string; description: string; url: string; image: string;
  type: "website" | "article"; noindex?: boolean;
  jsonLd?: object[];
  bodyHtml?: string;          // crawlable content, injected into #root
};
type Resolver = (pathname: string, canonical: string) => Promise<Meta | null>;

export const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const trim = (s: string, n: number) => { const v = String(s ?? "").replace(/\s+/g, " ").trim(); return v.length <= n ? v : `${v.slice(0, n - 1).trimEnd()}…`; };

/** Tiny, timeout-bound Supabase REST read. Never throws. */
export async function sb<T>(path: string): Promise<T[]> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(2500) });
    return r.ok ? ((await r.json()) as T[]) : [];
  } catch { return []; }
}

/** Markdown → safe HTML for crawler bodies. Escapes FIRST, then applies a small grammar. */
export function mdHtml(md: string): string {
  const inl = (t: string) => esc(t)
    .replace(/!\[[^\]]*\]\s*\([^)]*\)/g, "")                                   // drop images
    .replace(/\[([^\]]+)\]\s*\(([^)\s]+)\)/g, '<a href="$2">$1</a>')           // tolerate "] ("
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return md.split(/\n{2,}/).map((b) => {
    const t = b.trim();
    if (!t) return "";
    if (/^#{1,3}\s/.test(t)) return `<h2>${inl(t.replace(/^#{1,3}\s+/, ""))}</h2>`;
    if (/^https?:\/\/\S+$/.test(t) && /(youtube\.com|youtu\.be|vimeo\.com|loom\.com)/i.test(t)) return `<p><a href="${esc(t)}">${esc(t)}</a></p>`;
    if (/^[-*]\s/m.test(t)) return `<ul>${t.split("\n").filter((l) => /^[-*]\s/.test(l.trim())).map((l) => `<li>${inl(l.trim().replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
    if (/^\d+[.)]\s/m.test(t)) return `<ol>${t.split("\n").filter((l) => /^\d+[.)]\s/.test(l.trim())).map((l) => `<li>${inl(l.trim().replace(/^\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`;
    return `<p>${inl(t.replace(/\n/g, " "))}</p>`;
  }).filter(Boolean).join("\n");
}

export const plain = (md: string, max: number) =>
  trim(md.replace(/!\[[^\]]*\]\s*\([^)]*\)/g, "").replace(/\[([^\]]+)\]\s*\([^)]*\)/g, "$1").replace(/[#>*`_-]+/g, " "), max);

// ── Resolvers. Content modules add theirs; order matters; static routes last. ──
const RESOLVERS: Resolver[] = [
  // Blog post — example of a content-type resolver
  async (pathname, url) => {
    const m = pathname.match(/^\/blog\/([^/]+)\/?$/);
    if (!m) return null;
    const [p] = await sb<Record<string, string | null>>(
      `blog_posts?slug=eq.${encodeURIComponent(decodeURIComponent(m[1]))}&status=eq.published&select=title,excerpt,seo_title,seo_description,cover_image,body&limit=1`);
    if (!p) return null;
    return {
      title: `${p.seo_title || p.title} — ${SITE_NAME}`,
      description: trim(p.seo_description || p.excerpt || DEFAULT_DESCRIPTION, 200),
      url, image: p.cover_image || OG_IMAGE, type: "article",
      bodyHtml: `<main><h1>${esc(p.title!)}</h1>${mdHtml(p.body || "")}</main>`,
    };
  },
  // (Help-centre resolvers: hub / category / question — each returns FAQPage + BreadcrumbList
  //  JSON-LD and real Q&A HTML. Pattern identical to the blog resolver.)

  // Static routes + admin overrides — ALWAYS LAST
  async (pathname, url) => {
    const base = PAGE_SEO[pathname] ?? { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
    const meta: Meta = { title: base.title, description: base.description, url, image: OG_IMAGE, type: "website" };
    const [o] = await sb<Record<string, string | boolean | null>>(
      `seo_meta?path=eq.${encodeURIComponent(pathname)}&select=title,description,og_image,canonical,noindex&limit=1`);
    if (o) {
      if (o.title) meta.title = String(o.title);
      if (o.description) meta.description = String(o.description);
      if (o.og_image) meta.image = String(o.og_image);
      if (o.canonical) meta.url = String(o.canonical);
      if (o.noindex) meta.noindex = true;
    }
    return meta;
  },
];

async function resolveMeta(pathname: string): Promise<Meta> {
  const url = pathname === "/" ? `${SITE_URL}/` : `${SITE_URL}${pathname.replace(/\/+$/, "")}`;
  for (const r of RESOLVERS) { const m = await r(pathname, url); if (m) return m; }
  return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, url, image: OG_IMAGE, type: "website" };
}

/** Replace the managed head tags with this page's, add JSON-LD, inject crawlable body. */
function inject(html: string, m: Meta): string {
  const managed = /<title[^>]*>[\s\S]*?<\/title>|<meta[^>]*(?:name|property)=["'](?:description|og:title|og:description|og:url|og:image|og:type|twitter:title|twitter:description|twitter:image)["'][^>]*>|<link[^>]*rel=["']canonical["'][^>]*>/gi;
  const block = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<link rel="canonical" href="${esc(m.url)}" />`,
    `<meta property="og:type" content="${m.type}" />`,
    `<meta property="og:url" content="${esc(m.url)}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:image" content="${esc(m.image)}" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:image" content="${esc(m.image)}" />`,
    m.noindex ? `<meta name="robots" content="noindex, nofollow" />` : "",
    // `<` escaped so content can never close the script tag
    ...(m.jsonLd ?? []).map((ld) => `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`),
  ].filter(Boolean).join("\n    ");

  let out = html.replace(managed, "");
  out = out.includes("</head>") ? out.replace("</head>", `    ${block}\n  </head>`) : out;
  // Inside #root: JS-capable crawlers (Googlebot) replace it with the live app;
  // non-JS bots read it as the page. Humans never reach this code path.
  if (m.bodyHtml) out = out.replace(/<div id="root">\s*<\/div>/, `<div id="root">${m.bodyHtml}</div>`);
  return out;
}

export default async function middleware(request: Request) {
  if (request.headers.get(LOOP_HEADER)) return next();              // our own fetch below
  if (!BOTS.test(request.headers.get("user-agent") || "")) return next();   // humans: untouched

  try {
    const url = new URL(request.url);
    const [shell, meta] = await Promise.all([
      fetch(new URL("/index.html", url.origin), { headers: { [LOOP_HEADER]: "1" }, signal: AbortSignal.timeout(3000) })
        .then((r) => (r.ok ? r.text() : "")),
      resolveMeta(url.pathname),
    ]);
    if (!shell) return next();
    return new Response(inject(shell, meta), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",        // bot-specific body: never in a shared cache
        vary: "user-agent",
        "x-cms-prerendered": "1",           // handy for debugging with curl
      },
    });
  } catch {
    return next();                           // fail open — a preview is never worth an outage
  }
}
```

Include `middleware.ts` in `tsconfig.json`'s `include` — the reference build left it out and
type errors in it went unnoticed.

### 8.2 og:type

`article` for blog posts only. Everything else `website`. (The reference build briefly sent
`article` for static pages; some scrapers render those as news cards.)

---

## 9. Discovery files

### 9.1 `/sitemap.xml` — generated at request time

A build-time sitemap goes stale the moment the team publishes anything from the admin — and
because static files take precedence over rewrites, a stale `public/sitemap.xml` (or a
build script that writes one) **silently shadows** the dynamic route. The reference build hit
exactly this. Delete any static sitemap and any generator script.

```json
// vercel.json — before the SPA catch-all
{ "source": "/sitemap.xml", "destination": "/api/seo/sitemap" }
```

```ts
// api/seo/sitemap.ts
import { PAGE_SEO, SITE_URL } from "../../src/lib/seo.js";

type Url = { loc: string; lastmod?: string; changefreq: string; priority: string };
type Source = () => Promise<Url[]>;

async function sb<T>(path: string): Promise<T[]> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(4000) });
    return r.ok ? ((await r.json()) as T[]) : [];
  } catch { return []; }
}
const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : undefined);

// 🔁 Each content module contributes a source.
const SOURCES: Source[] = [
  async () => Object.entries(PAGE_SEO).map(([path, s]) => ({
    loc: path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`, changefreq: s.changefreq, priority: s.priority.toFixed(1) })),
  async () => (await sb<{ slug: string; updated_at: string }>("blog_posts?status=eq.published&select=slug,updated_at"))
    .map((p) => ({ loc: `${SITE_URL}/blog/${p.slug}`, lastmod: day(p.updated_at), changefreq: "monthly", priority: "0.6" })),
  // help centre categories + questions, etc.
];

export default async function handler(_req: any, res: any) {
  // noindex pages must not appear in the sitemap
  const hidden = new Set((await sb<{ path: string }>("seo_meta?noindex=eq.true&select=path")).map((r) => `${SITE_URL}${r.path === "/" ? "/" : r.path}`));
  const urls = (await Promise.all(SOURCES.map((s) => s().catch(() => [])))).flat().filter((u) => !hidden.has(u.loc));
  const seen = new Set<string>();
  const unique = urls.filter((u) => (seen.has(u.loc) ? false : (seen.add(u.loc), true)));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    unique.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ""}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`).join("\n") +
    `\n</urlset>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(xml);
}
```

Hidden pages (Module 01 §11.1) should also be filtered out: read `page.<slug>.visible` from
`published_content` and drop those paths.

### 9.2 `/robots.txt` — static

```
# <Brand> — https://acme.com
# Humans, search engines, and AI answer engines are welcome. Being cited by an AI
# assistant IS distribution, so the answer-engine crawlers are allowed explicitly.

User-agent: *
Allow: /
Disallow: /admin

User-agent: GPTBot
User-agent: ChatGPT-User
User-agent: OAI-SearchBot
User-agent: ClaudeBot
User-agent: Claude-Web
User-agent: anthropic-ai
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: Bingbot
User-agent: Amazonbot
User-agent: DuckAssistBot
Allow: /
Disallow: /admin

# Bulk training-only scrapers with no citation benefit (brand's choice)
User-agent: CCBot
Disallow: /

Sitemap: https://acme.com/sitemap.xml
```

Whether to allow training crawlers (`Google-Extended`, `CCBot`) is a **brand decision** —
surface it, don't assume.

### 9.3 `/llms.txt` — a plain summary for AI assistants

```markdown
# Acme

> One-paragraph description of what the product is and who it's for.

## What it does
- **Capability**: one line.
- …

## Who it's for
- …

## Pricing
- **Plan — $X/mo**: what's included.
- Machine-readable pricing: https://acme.com/pricing.md

## Key pages
- [Pricing](https://acme.com/pricing)
- [Help Center](https://acme.com/faq)
```

### 9.4 `/pricing.md` — machine-readable pricing

A markdown table of plans served as `text/plain` so assistants quote prices accurately:

```json
// vercel.json → headers
{ "source": "/pricing.md", "headers": [{ "key": "Content-Type", "value": "text/plain; charset=utf-8" }] }
```

If pricing is data-driven (a `pricing.data` content block), generate `llms.txt` and
`pricing.md` from a function too, so they can't drift from the pricing page.

---

## 10. SEO Console (admin)

### 10.1 Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ SEO   [Agent | Manual]         9 pages · 3 issues · 4 customized │
├──────────────┬───────────────────────────────────────────────────┤
│ PAGES        │  /pricing                          [Reset default] │
│ ● Home    ✓  │  Title        [……………………………]   52 ▓▓▓▓▓▓░ 30–60   │
│ ● Pricing ⚠2 │  Description  [……………………………]  148 ▓▓▓▓▓▓▓ 70–160  │
│ ● About   ✓  │  Keywords     [……]  (first = focus keyword)        │
│ …            │  OG image     [pick from Asset Hub]  [preview]     │
│              │  ☐ Hide from search (noindex)                      │
│              │  ── Checks ──────────────────────────────────────  │
│              │  ✓ Title length   ⚠ Keyword in title   ✓ Indexable │
│              │  ── Google preview ───────────────────────────────  │
│              │  acme.com › pricing                                │
│              │  Pricing — Acme                                    │
│              │  Description as it will appear…                    │
│              │                                     [Save — live]  │
└──────────────┴───────────────────────────────────────────────────┘
```

### 10.2 Audit checks — the reference rules

```ts
function pageChecks(title: string, description: string, keywords: string, noindex: boolean) {
  const kw = (keywords || "").split(",")[0].trim().toLowerCase();
  const t = title.trim(), d = description.trim();
  return [
    { label: "Title length (30–60)",       ok: t.length >= 30 && t.length <= 60, warn: t.length > 60, note: `${t.length}` },
    { label: "Description length (70–160)", ok: d.length >= 70 && d.length <= 160, warn: d.length > 160, note: `${d.length}` },
    { label: "Focus keyword set",          ok: !!kw, note: kw ? "✓" : "add one" },
    { label: "Keyword in title",           ok: !kw || t.toLowerCase().includes(kw), note: kw ? (t.toLowerCase().includes(kw) ? "✓" : "missing") : "—" },
    { label: "Indexable",                  ok: !noindex, note: noindex ? "noindex" : "index" },
  ];
}
```

Checks run on the **effective** values (override ?? default), so an unedited page still
gets audited. The header totals issues across all pages.

### 10.3 Behaviour

- **Save** upserts `seo_meta` (live immediately), logs `seo.update`.
- **Reset to default** deletes the row.
- Changes appear in link previews immediately for bots (middleware reads live), and in
  browsers on next load.
- Social platforms cache previews — link to the official debuggers (Facebook Sharing
  Debugger, LinkedIn Post Inspector) to force a re-scrape.

---

## 11. SEO agent

Same loop architecture as Module 01 §15, smaller toolset, writes straight to `seo_meta`.

| Tool | Does |
|---|---|
| `list_pages` | Every route with its effective title/description/keywords/noindex |
| `get_page_content(slug)` | The page's published copy (from content keys) — so it writes metadata grounded in what's actually on the page |
| `set_page_seo({ path, title, description, keywords, og_image?, noindex? })` | Upserts `seo_meta`; returns the change for the UI to show |

Prompt essentials: titles ≤ 60 chars with the primary keyword near the front; descriptions
140–160, benefit-led, with a soft CTA; never keyword-stuff; never set `noindex` unless
asked; explain every change. Suggested starters: *Audit the whole site · Sharpen the pricing
page · Refresh all meta descriptions · Fill keyword gaps.*

The console's Agent tab shows the transcript and a list of applied changes, and reloads
the page list after a run.

---

## 12. Security

- `seo_meta` is public-read by design (the site renders it); writes are admin-only.
- The middleware uses the **anon** key only; it reads nothing the public can't already see
  (published rows, `seo_meta`).
- Everything injected is escaped; JSON-LD escapes `<` to block `</script>` breakout.
- Bot responses are `no-store` + `vary: user-agent` so they can never be served to humans
  from a cache.
- Fail open everywhere: a Supabase outage degrades previews, never the page.

---

## 13. Nuances & hard-won lessons

1. **An SPA shows every link as the homepage** to scrapers. Layer 3 is not optional for a
   Vite/CRA site.
2. **Loop-break the middleware** — it fetches `index.html`, which re-enters the middleware.
3. **Fail open.** Every error path returns `next()`.
4. **Exclude `api/`, `admin`, build assets, proxies, and dotted paths** from the matcher.
5. **Never cache bot responses in a shared cache.**
6. **Runtime sitemap only.** Delete static sitemaps and generator scripts — they shadow the rewrite.
7. **Consolidate hosts, but exclude `/api/`** from the redirect so crons keep working.
8. **`og:type=article` for posts only.**
9. **FAQ JSON-LD answers are plain text** — strip markdown.
10. **Tolerate `[label] (url)`** in the crawler's markdown renderer too (Module 01's renderer
    does) — or the HTML bots index differs from what humans see.
11. **Link your entities with `@id`.**
12. **Social previews are cached by the platform** — re-scrape with their debuggers after changes.
13. **Test with real bot user-agents via `curl`**, not a browser (§15).

---

## 14. Productization upgrades

| Upgrade | Why | Sketch |
|---|---|---|
| **Dynamic OG images** | A branded 1200×630 card per page beats one logo | `@vercel/og` function: title + brand tokens → PNG; default `og_image` to it |
| **Redirect manager** | Renamed pages keep their ranking | `redirects(from, to, code)` table; middleware checks it first |
| **hreflang** | Multi-language brands | Emit alternates per locale |
| **Search Console link** | See real impressions in the admin | GSC API: clicks/impressions per page in the console |
| **IndexNow** | Faster indexing on Bing/Yandex | Ping on publish |
| **Broken-link check** | Hidden pages, deleted assets | Nightly crawl of published content links |
| **Draft SEO** | Review before live | `draft_*` columns + publish, per Module 01 |

---

## 15. Acceptance tests

Run against production with real user-agents:

```bash
curl -s -A "Slackbot" https://acme.com/pricing | grep -o '<title>[^<]*'
curl -s -A "GPTBot" https://acme.com/blog/some-post | grep -c '<p>'
curl -sI -A "Mozilla/5.0" https://acme.com/pricing | grep -i x-cms-prerendered   # must be absent
curl -s https://acme.com/sitemap.xml | grep -c '<loc>'
```

- [ ] Slackbot / LinkedInBot / WhatsApp / Discordbot receive the page's own title, description, and image.
- [ ] GPTBot / ClaudeBot receive real body HTML for content pages (headings, paragraphs, lists).
- [ ] A normal browser UA gets the untouched SPA (no `x-cms-prerendered` header).
- [ ] With Supabase unreachable, bot requests still return 200 (defaults) — fail-open verified.
- [ ] Editing a title in the console changes the bot response on the next request.
- [ ] `og:type` is `article` on posts and `website` elsewhere.
- [ ] JSON-LD validates in Google's Rich Results Test (Organization, FAQPage, Article, BreadcrumbList).
- [ ] The sitemap includes a post published one minute ago, with its `lastmod`; excludes noindex and hidden pages; no duplicates.
- [ ] No static `sitemap.xml` exists in `public/` or the build output.
- [ ] `robots.txt` disallows `/admin` and references the sitemap.
- [ ] The console flags a 75-char title as a warning and a missing focus keyword as an issue.
- [ ] "Audit the whole site" in the SEO agent returns ranked fixes; applying one updates `seo_meta`.
- [ ] `*.vercel.app/pricing` 308s to the canonical host; `/api/*` does not.

---

## 16. Build plan

1. `seo.ts` config + schema builders; `seo_meta` table (§3–4, §6).
2. Load `seo_meta` in the content provider; build `<Seo>`; add one per page (§5).
3. Static baseline in `index.html` (§7).
4. Crawler middleware with the static resolver (§8); add to `tsconfig` include; test with curl.
5. Add a resolver per content type (blog, help centre).
6. Runtime sitemap + rewrite; delete any static sitemap (§9.1).
7. `robots.txt`, `llms.txt`, `pricing.md` (§9.2–9.4).
8. SEO Console with checks and Google preview (§10).
9. SEO agent (§11).
10. Host consolidation redirect; run §15.
