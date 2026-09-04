import { next } from "@vercel/edge";
import { PAGE_SEO, SITE_URL, SITE_NAME, OG_IMAGE, DEFAULT_TITLE, DEFAULT_DESCRIPTION } from "./src/lib/seo";

/* ─── Link previews for a client-rendered SPA ──────────────────────────────
 * Social scrapers (Slack, LinkedIn, iMessage, WhatsApp…) and most AI crawlers
 * don't run JavaScript, so every URL used to show the homepage's Open Graph
 * card. This middleware serves those crawlers the SAME index.html with the
 * page's real <title>/description/OG/Twitter/canonical already in the <head>.
 *
 * Not cloaking: the values come from the exact same sources the client-side
 * <Seo> component uses (PAGE_SEO → seo_meta overrides → blog_posts), so a
 * crawler sees precisely what a browser sees once React hydrates. This is
 * Google's documented "dynamic rendering" pattern.
 *
 * Humans are never touched — they fall straight through to the normal SPA.
 * Every failure path also falls through: a preview is never worth an outage.
 */

export const config = {
  // Skip /api, the admin, hashed build assets, and anything with a file
  // extension (robots.txt, sitemap.xml, images…).
  matcher: ["/((?!api/|admin|build/|assets/|brandfonts/|.*\\.).*)"],
};

const BOTS =
  /(facebookexternalhit|facebookcatalog|facebot|twitterbot|linkedinbot|slackbot|slack-imgproxy|whatsapp|telegrambot|discordbot|pinterest(bot)?|redditbot|applebot|skypeuripreview|vkshare|embedly|iframely|quora link preview|nuzzel|bitlybot|flipboard|tumblr|mastodon|bluesky|googlebot|google-inspectiontool|bingbot|duckduckbot|yandex(bot)?|baiduspider|gptbot|chatgpt-user|oai-searchbot|perplexitybot|claudebot|claude-web|anthropic-ai|google-extended|ccbot|bytespider|amazonbot|meta-externalagent|cohere-ai|diffbot|w3c_validator)/i;

const LOOP_HEADER = "x-airea-prerender";

const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const trim = (s: string, n: number) => {
  const v = String(s ?? "").replace(/\s+/g, " ").trim();
  return v.length <= n ? v : `${v.slice(0, n - 1).trimEnd()}…`;
};

type Meta = { title: string; description: string; url: string; image: string; type: string; noindex?: boolean; jsonLd?: unknown[]; bodyHtml?: string };

/** Small, dependency-free Supabase REST read. Never throws. */
async function sb<T>(path: string): Promise<T[]> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(2500),
    });
    return res.ok ? ((await res.json()) as T[]) : [];
  } catch {
    return [];
  }
}


/* Minimal markdown → HTML for crawler bodies. Escapes everything first, then
 * applies just the transforms help answers use (paragraphs, headings, lists,
 * bold, links). Non-JS crawlers — most AI bots — read THIS, so FAQ answers
 * are genuinely indexable instead of an empty SPA shell. */
function mdHtml(md: string): string {
  const inlined = (t: string) =>
    esc(t)
      .replace(/!\[[^\]]*\]\s*\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\s*\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return md
    .split(/\n{2,}/)
    .map((b) => {
      const t = b.trim();
      if (!t) return "";
      if (/^###\s/.test(t)) return `<h3>${inlined(t.replace(/^###\s+/, ""))}</h3>`;
      if (/^##\s/.test(t)) return `<h2>${inlined(t.replace(/^##\s+/, ""))}</h2>`;
      if (/^#\s/.test(t)) return `<h2>${inlined(t.replace(/^#\s+/, ""))}</h2>`;
      if (/^[-*]\s/m.test(t))
        return `<ul>${t.split(/\n/).filter((l) => /^[-*]\s/.test(l.trim())).map((l) => `<li>${inlined(l.trim().replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
      if (/^\d+[.)]\s/m.test(t))
        return `<ol>${t.split(/\n/).filter((l) => /^\d+[.)]\s/.test(l.trim())).map((l) => `<li>${inlined(l.trim().replace(/^\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`;
      return `<p>${inlined(t.replace(/\n/g, " "))}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

const answerPlain = (md: string, max: number) =>
  trim(md.replace(/!\[[^\]]*\]\s*\([^)]*\)/g, "").replace(/\[([^\]]+)\]\s*\([^)]*\)/g, "$1").replace(/[#>*`_-]+/g, " "), max);

const crumbLd = (trail: { name: string; path: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map((t, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: t.name,
    item: `${SITE_URL}${t.path}`,
  })),
});

const faqLd = (items: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((it) => ({
    "@type": "Question",
    name: it.question,
    acceptedAnswer: { "@type": "Answer", text: answerPlain(it.answer, 1200) },
  })),
});

type FaqRow = { slug: string; question: string; answer: string; categories: string[] };
type FaqCatRow = { slug: string; name: string; description: string | null };

async function resolveMeta(pathname: string): Promise<Meta> {
  const canonical = pathname === "/" ? `${SITE_URL}/` : `${SITE_URL}${pathname.replace(/\/+$/, "")}`;

  // ── a blog post: title/excerpt/cover come from the post itself
  const blog = pathname.match(/^\/blog\/([^/]+)\/?$/);
  if (blog) {
    const slug = decodeURIComponent(blog[1]);
    const [post] = await sb<Record<string, string | null>>(
      `blog_posts?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=title,excerpt,seo_title,seo_description,cover_image&limit=1`
    );
    if (post) {
      return {
        title: `${post.seo_title || post.title} — ${SITE_NAME}`,
        description: trim(post.seo_description || post.excerpt || DEFAULT_DESCRIPTION, 200),
        url: canonical,
        image: post.cover_image || OG_IMAGE,
        type: "article",
      };
    }
  }


  // ── help center: hub, category pages, and standalone question pages all
  // carry FAQPage JSON-LD plus a real HTML body — the "help pages for LLMs"
  // requirement. Content comes from the same tables the site renders.
  if (pathname === "/faq") {
    const tops = await sb<FaqRow>(`faq_items?top=eq.true&status=eq.published&select=slug,question,answer,categories&order=sort`);
    if (tops.length) {
      const base = PAGE_SEO[pathname] ?? { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
      return {
        title: base.title,
        description: base.description,
        url: canonical,
        image: OG_IMAGE,
        type: "website",
        jsonLd: [faqLd(tops), crumbLd([{ name: "Home", path: "/" }, { name: "Help Center", path: "/faq" }])],
        bodyHtml:
          `<main><h1>AIREA Studio Help Center</h1>` +
          tops.map((t) => `<h2><a href="${esc(`${SITE_URL}/faq/${t.slug}`)}">${esc(t.question)}</a></h2>${mdHtml(t.answer)}`).join("") +
          `</main>`,
      };
    }
  }
  const faq = pathname.match(/^\/faq\/([^/]+)\/?$/);
  if (faq) {
    const slug = decodeURIComponent(faq[1]);
    const [cat] = await sb<FaqCatRow>(`faq_categories?slug=eq.${encodeURIComponent(slug)}&select=slug,name,description&limit=1`);
    if (cat) {
      const items = await sb<FaqRow>(
        `faq_items?categories=cs.%7B${encodeURIComponent(cat.slug)}%7D&status=eq.published&select=slug,question,answer,categories&order=sort`
      );
      return {
        title: `${cat.name} — ${SITE_NAME} Help Center`,
        description: trim(cat.description || `Answers about ${cat.name.toLowerCase()} from the ${SITE_NAME} help center.`, 200),
        url: canonical,
        image: OG_IMAGE,
        type: "website",
        jsonLd: [faqLd(items), crumbLd([{ name: "Home", path: "/" }, { name: "Help Center", path: "/faq" }, { name: cat.name, path: `/faq/${cat.slug}` }])],
        bodyHtml:
          `<main><h1>${esc(cat.name)}</h1>` +
          (cat.description ? `<p>${esc(cat.description)}</p>` : "") +
          `<ul>` + items.map((it) => `<li><a href="${esc(`${SITE_URL}/faq/${it.slug}`)}">${esc(it.question)}</a></li>`).join("") + `</ul></main>`,
      };
    }
    const [item] = await sb<FaqRow>(
      `faq_items?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=slug,question,answer,categories&limit=1`
    );
    if (item) {
      return {
        title: `${item.question} — ${SITE_NAME}`,
        description: answerPlain(item.answer, 200),
        url: canonical,
        image: OG_IMAGE,
        type: "website",
        jsonLd: [faqLd([item]), crumbLd([{ name: "Home", path: "/" }, { name: "Help Center", path: "/faq" }, { name: item.question, path: `/faq/${item.slug}` }])],
        bodyHtml:
          `<main><p><a href="${esc(`${SITE_URL}/faq`)}">Help Center</a></p>` +
          `<h1>${esc(item.question)}</h1>${mdHtml(item.answer)}</main>`,
      };
    }
  }

  // ── a known route, plus any override the team set in the SEO console
  const base = PAGE_SEO[pathname] ?? { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
  const meta: Meta = {
    title: base.title,
    description: base.description,
    url: canonical,
    image: OG_IMAGE,
    type: "website",
  };
  const [ov] = await sb<Record<string, string | boolean | null>>(
    `seo_meta?path=eq.${encodeURIComponent(pathname)}&select=title,description,og_image,canonical,noindex&limit=1`
  );
  if (ov) {
    if (ov.title) meta.title = String(ov.title);
    if (ov.description) meta.description = String(ov.description);
    if (ov.og_image) meta.image = String(ov.og_image);
    if (ov.canonical) meta.url = String(ov.canonical);
    if (ov.noindex) meta.noindex = true;
  }
  return meta;
}

/** Swap the managed head tags for this page's real ones. */
function inject(html: string, m: Meta): string {
  const managed =
    /<(?:title)[^>]*>[\s\S]*?<\/title>|<meta[^>]*(?:name|property)=["'](?:description|og:title|og:description|og:url|og:image|og:type|twitter:title|twitter:description|twitter:image)["'][^>]*>|<link[^>]*rel=["']canonical["'][^>]*>/gi;

  const block = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<link rel="canonical" href="${esc(m.url)}" />`,
    `<meta property="og:type" content="${esc(m.type)}" />`,
    `<meta property="og:url" content="${esc(m.url)}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:image" content="${esc(m.image)}" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:image" content="${esc(m.image)}" />`,
    m.noindex ? `<meta name="robots" content="noindex, nofollow" />` : "",
    ...(m.jsonLd ?? []).map((ld) => `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`),
  ]
    .filter(Boolean)
    .join("\n    ");

  let out = html.replace(managed, "");
  out = out.includes("</head>") ? out.replace("</head>", `    ${block}\n  </head>`) : out;
  // Real page content for crawlers that don't run JS. It goes INSIDE #root:
  // rendering bots (Googlebot) replace it with the live app; non-JS bots read
  // it as the page body. Never shown to humans — they skip this middleware.
  if (m.bodyHtml) {
    out = out.replace(/<div id="root">\s*<\/div>/, `<div id="root">${m.bodyHtml}</div>`);
  }
  return out;
}

export default async function middleware(request: Request) {
  // Our own fetch of index.html below re-enters the edge — bail immediately.
  if (request.headers.get(LOOP_HEADER)) return next();

  const ua = request.headers.get("user-agent") || "";
  if (!BOTS.test(ua)) return next();

  try {
    const url = new URL(request.url);
    const [shell, meta] = await Promise.all([
      fetch(new URL("/index.html", url.origin), {
        headers: { [LOOP_HEADER]: "1" },
        signal: AbortSignal.timeout(3000),
      }).then((r) => (r.ok ? r.text() : "")),
      resolveMeta(url.pathname),
    ]);
    if (!shell) return next();

    return new Response(inject(shell, meta), {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Bot-specific body: keep it out of any shared cache.
        "cache-control": "no-store",
        vary: "user-agent",
        "x-airea-prerendered": "1",
      },
    });
  } catch {
    return next(); // never let a preview break the page
  }
}
