// Single source of truth for the site's pages. Add a page here (and register its
// component in App.tsx's PAGE_COMPONENTS) and it automatically shows up in the
// public site, the Editor, and the Review tool — nothing else to wire up. This is
// what keeps the admin in sync with the front end.
export type SitePage = { slug: string; path: string; label: string };

export const SITE_PAGES: SitePage[] = [
  { slug: "home", path: "/", label: "Home" },
  { slug: "pricing", path: "/pricing", label: "Pricing" },
  { slug: "small-business", path: "/small-business", label: "Small business" },
  { slug: "ecommerce", path: "/ecommerce", label: "E-commerce" },
  { slug: "how-it-works", path: "/how-it-works", label: "How it works" },
  { slug: "faq", path: "/faq", label: "Help Center" },
  { slug: "privacy-policy", path: "/privacy-policy", label: "Privacy Policy" },
  { slug: "terms-of-service", path: "/terms-of-service", label: "Terms of Service" },
];

const humanize = (slug: string) =>
  slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

export const pageLabel = (slug: string) =>
  SITE_PAGES.find((p) => p.slug === slug)?.label ?? humanize(slug);

export const pagePath = (slug: string) =>
  SITE_PAGES.find((p) => p.slug === slug)?.path ?? (slug === "home" ? "/" : `/${slug}`);

// ---- page-level visibility (admin: Global → Pages) ----
// Whole pages the team can switch off for customers. Hidden pages: the route
// redirects home, and nav/footer items pointing at them disappear. Home and
// Pricing are always on. Stored as `page.<slug>.visible` content blocks
// ("false" hides) riding the normal draft → publish pipeline.
export const HIDEABLE_PAGES: { slug: string; label: string; path: string }[] = [
  { slug: "how-it-works", path: "/how-it-works", label: "How it works" },
  { slug: "faq", path: "/faq", label: "Help Center" },
  { slug: "blog", path: "/blog", label: "Blog" },
  { slug: "small-business", path: "/small-business", label: "Small business" },
  { slug: "ecommerce", path: "/ecommerce", label: "E-commerce" },
];

export const pageVisibleKey = (slug: string) => `page.${slug}.visible`;

// Which hideable page (if any) an href points to — used to auto-hide nav and
// footer links when their destination page is switched off.
export function hrefPageSlug(href: string): string | null {
  const path = (href || "").split(/[?#]/)[0];
  const hit = HIDEABLE_PAGES.find((p) => path === p.path || path.startsWith(`${p.path}/`));
  return hit?.slug ?? null;
}

// Merge the manifest with extra slugs discovered at runtime (e.g. pages that have
// content blocks but aren't in the manifest yet) into one ordered, de-duped list.
export function mergePages(extraSlugs: string[]): SitePage[] {
  const out = [...SITE_PAGES];
  const seen = new Set(out.map((p) => p.slug));
  for (const slug of extraSlugs) {
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      out.push({ slug, path: pagePath(slug), label: pageLabel(slug) });
    }
  }
  return out;
}
