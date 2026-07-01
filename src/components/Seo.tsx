import { useEffect } from "react";
import { SITE_NAME, OG_IMAGE, canonical, pageSeo } from "@/lib/seo";
import { useSeo } from "@/content/ContentProvider";

type Props = {
  /** Route path, e.g. "/pricing" — used for the canonical + og:url. */
  path: string;
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
  /** Page-specific JSON-LD objects (FAQPage, Product, BreadcrumbList…). */
  jsonLd?: object[];
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

// Dependency-free head manager. Sets title, description, canonical, Open Graph,
// Twitter, and robots per route, and injects page-specific JSON-LD (cleaned up on
// route change). JS-rendering crawlers (Googlebot) get the full per-page picture;
// the site-wide baseline + structured data live statically in index.html for
// non-JS AI crawlers.
export function Seo({ path, title, description, image, type = "website", noindex, jsonLd }: Props) {
  const override = useSeo()(path); // live per-page overrides from the SEO console/agent
  const fallback = pageSeo(path);
  const t = override.title || title || fallback.title;
  const d = override.description || description || fallback.description;
  const url = override.canonical || canonical(path);
  const img = override.ogImage || image || OG_IMAGE;
  const noidx = override.noindex ?? noindex ?? false;
  const allLd = [...(jsonLd || []), ...(override.jsonld ? [override.jsonld as object] : [])];
  const ld = allLd.length ? JSON.stringify(allLd) : "";

  useEffect(() => {
    document.title = t;
    upsertMeta("name", "description", d);
    upsertLink("canonical", url);
    upsertMeta(
      "name",
      "robots",
      noidx ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    );

    // Open Graph
    upsertMeta("property", "og:title", t);
    upsertMeta("property", "og:description", d);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:image", img);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", "en_US");

    // Twitter
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", t);
    upsertMeta("name", "twitter:description", d);
    upsertMeta("name", "twitter:image", img);

    // Page-specific JSON-LD
    const nodes: HTMLScriptElement[] = [];
    if (allLd.length) {
      for (const obj of allLd) {
        const s = document.createElement("script");
        s.type = "application/ld+json";
        s.setAttribute("data-seo-jsonld", "");
        s.textContent = JSON.stringify(obj);
        document.head.appendChild(s);
        nodes.push(s);
      }
    }
    return () => nodes.forEach((n) => n.remove());
  }, [t, d, url, img, type, noidx, ld]);

  return null;
}
