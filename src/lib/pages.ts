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
  { slug: "faq", path: "/faq", label: "FAQ" },
];

const humanize = (slug: string) =>
  slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

export const pageLabel = (slug: string) =>
  SITE_PAGES.find((p) => p.slug === slug)?.label ?? humanize(slug);

export const pagePath = (slug: string) =>
  SITE_PAGES.find((p) => p.slug === slug)?.path ?? (slug === "home" ? "/" : `/${slug}`);

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
