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

type Meta = { title: string; description: string; url: string; image: string; type: string; noindex?: boolean };

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

  // ── a known route, plus any override the team set in the SEO console
  const base = PAGE_SEO[pathname] ?? { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION };
  const meta: Meta = {
    title: base.title,
    description: base.description,
    url: canonical,
    image: OG_IMAGE,
    type: pathname === "/" ? "website" : "article",
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
  if (pathname === "/blog") meta.type = "website";
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
  ]
    .filter(Boolean)
    .join("\n    ");

  const stripped = html.replace(managed, "");
  return stripped.includes("</head>")
    ? stripped.replace("</head>", `    ${block}\n  </head>`)
    : stripped;
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
