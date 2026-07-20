// Pricing as data. The whole pricing surface (plan cards + comparison table)
// renders from ONE `pricing.data` content block (JSON, draft → publish like all
// content), managed visually in the admin's Pricing Studio. Until that block
// exists in the database, everything resolves from the legacy per-key content
// (pricing.plan1.* etc.) so nothing changes for previously-published edits.

export type CompareCell = { t: "check" | "dash" | "text"; v?: string };
export type PricingPlan = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  featured?: boolean;
  badge?: string;
};
export type PricingData = {
  plans: PricingPlan[];
  compare: { rows: { label: string; values: CompareCell[] }[] };
};

export const MAX_PLANS = 4;
const SIGN_UP = "https://app.aireastudio.ai/sign-up";

type Getter = (key: string, fallback?: string) => string;

// The comparison rows as shipped (booleans per Starter / Studio / Scale).
const LEGACY_COMPARE: { label: string; values: (boolean | string)[] }[] = [
  { label: "Brand workspaces", values: ["1", "3", "10"] },
  { label: "Campaigns / month", values: ["30", "Unlimited", "Unlimited"] },
  { label: "Brand DNA training", values: [true, true, true] },
  { label: "Social & email channels", values: [true, true, true] },
  { label: "Paid ads — Meta & Google", values: [false, true, true] },
  { label: "AI review & editing", values: [false, true, true] },
  { label: "1-click publish to Meta", values: [false, true, true] },
  { label: "The Wall analytics", values: [false, false, true] },
  { label: "Roles & permissions", values: [false, false, true] },
  { label: "Priority models & support", values: [false, false, true] },
];

// Build PricingData from the legacy per-key content blocks (the pre-Studio
// system). `get` is useC() on the site, or a draft/published lookup in admin.
export function pricingFromLegacy(get: Getter): PricingData {
  const plans: PricingPlan[] = (["plan1", "plan2", "plan3"] as const).map((pk, i) => {
    const link = ((): { href: string } => {
      try {
        const raw = get(`pricing.${pk}.cta_link`);
        const v = raw ? JSON.parse(raw) : null;
        return { href: typeof v?.href === "string" && v.href ? v.href : SIGN_UP };
      } catch {
        return { href: SIGN_UP };
      }
    })();
    return {
      id: pk,
      name: get(`pricing.${pk}.name`) || ["Starter", "Studio", "Scale"][i],
      price: get(`pricing.${pk}.price`) || ["$39", "$99", "$249"][i],
      cadence: get(`pricing.${pk}.cadence`) || "/mo",
      blurb: get(`pricing.${pk}.blurb`) || "",
      features: (get(`pricing.${pk}.features`) || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      ctaLabel: get(`pricing.${pk}.cta`) || "Start free",
      ctaHref: link.href,
      featured: pk === "plan2",
      badge: pk === "plan2" ? get("pricing.card.badge") || "Most popular" : "",
    };
  });

  const rows = LEGACY_COMPARE.map((row, r) => ({
    label: get(`pricing.compare.row${r}.label`) || row.label,
    values: row.values.map((v, i): CompareCell =>
      v === true ? { t: "check" } : v === false ? { t: "dash" } : { t: "text", v: get(`pricing.compare.row${r}.v${i}`) || v }
    ),
  }));

  return { plans, compare: { rows } };
}

// Normalize arbitrary parsed JSON into safe PricingData (pad/trim compare rows
// to the plan count, coerce fields, enforce plan bounds and a single featured).
export function normalizePricing(raw: unknown): PricingData | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as any;
  if (!Array.isArray(d.plans) || d.plans.length === 0) return null;

  const plans: PricingPlan[] = d.plans.slice(0, MAX_PLANS).map((p: any, i: number) => ({
    id: typeof p?.id === "string" && p.id ? p.id : `plan-${i}`,
    name: String(p?.name ?? ""),
    price: String(p?.price ?? ""),
    cadence: String(p?.cadence ?? ""),
    blurb: String(p?.blurb ?? ""),
    features: Array.isArray(p?.features) ? p.features.map((f: any) => String(f)).filter(Boolean) : [],
    ctaLabel: String(p?.ctaLabel ?? "Start free"),
    ctaHref: String(p?.ctaHref ?? SIGN_UP),
    featured: !!p?.featured,
    badge: String(p?.badge ?? ""),
  }));
  const firstFeatured = plans.findIndex((p) => p.featured);
  plans.forEach((p, i) => (p.featured = i === firstFeatured));

  const rowsIn = Array.isArray(d?.compare?.rows) ? d.compare.rows : [];
  const rows = rowsIn.map((r: any) => {
    const values: CompareCell[] = Array.isArray(r?.values) ? r.values : [];
    const norm = plans.map((_, i): CompareCell => {
      const c = values[i];
      if (c?.t === "check" || c?.t === "dash") return { t: c.t };
      if (c?.t === "text") return { t: "text", v: String(c.v ?? "") };
      return { t: "dash" };
    });
    return { label: String(r?.label ?? ""), values: norm };
  });

  return { plans, compare: { rows } };
}

export function parsePricing(raw: string | undefined | null): PricingData | null {
  if (!raw) return null;
  try {
    return normalizePricing(JSON.parse(raw));
  } catch {
    return null;
  }
}

// Site-side resolution: the pricing.data block when present, else legacy keys.
export function resolvePricing(get: Getter): PricingData {
  return parsePricing(get("pricing.data")) ?? pricingFromLegacy(get);
}
