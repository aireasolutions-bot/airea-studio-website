// Central SEO config + JSON-LD (schema.org) builders. SITE_URL is the CANONICAL
// domain (aireastudio.ai) — used for canonicals, Open Graph, the sitemap, and all
// structured data, even while the app is also reachable on its Vercel URL. When
// the domain is connected in Vercel, add a 301 from the *.vercel.app host so link
// equity consolidates here.
import { PLANS, SITE } from "./site";

export const SITE_URL = "https://aireastudio.ai";
export const SITE_NAME = "AIREA Studio";
export const APP_URL = "https://app.aireastudio.ai";
// Reachable now (Cloudflare R2, public) and after the domain goes live. Swap for a
// bespoke 1200×630 card when ready.
export const OG_IMAGE = "https://pub-5cdbd1e945544b179386519484eb7db1.r2.dev/assets/brand/logo.png";

export const DEFAULT_TITLE = "AIREA Studio — One source. Every channel. On brand.";
export const DEFAULT_DESCRIPTION =
  "AIREA Studio is the AI marketing OS. Turn one photo or one brief into a full, on-brand campaign across every channel — and ship it in minutes. Start your 14-day free trial.";

export type PageSeo = {
  title: string;
  description: string;
  priority: number;
  changefreq: "daily" | "weekly" | "monthly";
};

// Per-route metadata. Titles ≤ ~60 chars, descriptions ≤ ~160 — the levers that
// most affect click-through + how AI answer engines summarize each page.
export const PAGE_SEO: Record<string, PageSeo> = {
  "/": { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, priority: 1.0, changefreq: "weekly" },
  "/pricing": {
    title: "Pricing — AIREA Studio | AI Marketing Plans from $39/mo",
    description:
      "Simple plans for AIREA Studio, the AI marketing OS: Starter $39, Studio $99, Scale $249 per month. 14-day free trial, no credit card required.",
    priority: 0.9,
    changefreq: "weekly",
  },
  "/small-business": {
    title: "AI Marketing for Small Business — AIREA Studio",
    description:
      "Look like a national brand on a neighborhood budget. AIREA Studio plans, designs, and ships on-brand campaigns across every channel for small businesses — in minutes.",
    priority: 0.8,
    changefreq: "monthly",
  },
  "/ecommerce": {
    title: "AI Marketing for E-commerce — AIREA Studio",
    description:
      "Turn one product photo into every ad, in every ratio. AIREA Studio creates catalog-scale, on-brand creative across Meta, Google, email, and the web.",
    priority: 0.8,
    changefreq: "monthly",
  },
  "/how-it-works": {
    title: "How AIREA Studio Works — From One Brief to a Full Campaign",
    description:
      "Train your Brand DNA, brief a goal, pick channels, set creative direction, review with AI, and deploy everywhere. See how AIREA Studio turns one source into a full campaign.",
    priority: 0.8,
    changefreq: "monthly",
  },
  "/faq": {
    title: "AIREA Studio FAQ — AI Marketing for Small Business",
    description:
      "Answers about AIREA Studio, the AI marketing platform for small businesses: how it works, channels, Brand DNA training, pricing, security, and getting started.",
    priority: 0.7,
    changefreq: "monthly",
  },
};

export const pageSeo = (path: string): PageSeo =>
  PAGE_SEO[path] || { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, priority: 0.5, changefreq: "monthly" };

export const canonical = (path: string): string => (path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`);

const priceNumber = (p: string) => p.replace(/[^0-9.]/g, "");

// ---------------- JSON-LD (schema.org) ----------------

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: "AIREA Studio",
    url: SITE_URL,
    logo: { "@type": "ImageObject", url: OG_IMAGE },
    description: DEFAULT_DESCRIPTION,
    slogan: SITE.tagline,
    // Add social profile URLs here (LinkedIn, X, YouTube…) to strengthen entity recognition:
    // sameAs: ["https://www.linkedin.com/company/…", "https://x.com/…"],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    inLanguage: "en-US",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function softwareAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Marketing Automation Software",
    operatingSystem: "Web-based",
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    featureList: [
      "AI Brand DNA training",
      "Multi-channel campaign generation",
      "On-brand copy and visuals",
      "Paid ad creative in every ratio",
      "Email marketing automation",
      "1-click publishing to Meta & Instagram",
    ],
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "39",
      highPrice: "249",
      offerCount: PLANS.length,
      offers: PLANS.map((p) => ({
        "@type": "Offer",
        name: p.name,
        price: priceNumber(p.price),
        priceCurrency: "USD",
        url: `${SITE_URL}/pricing`,
        description: p.blurb,
      })),
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function productSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${SITE_NAME} — ${SITE.tagline}`,
    description: DEFAULT_DESCRIPTION,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "39",
      highPrice: "249",
      offerCount: PLANS.length,
      offers: PLANS.map((p) => ({
        "@type": "Offer",
        name: p.name,
        price: priceNumber(p.price),
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/pricing`,
      })),
    },
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export function howToSchema(name: string, steps: { title: string; body: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description: DEFAULT_DESCRIPTION,
    step: steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.body,
    })),
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: canonical(t.path),
    })),
  };
}
