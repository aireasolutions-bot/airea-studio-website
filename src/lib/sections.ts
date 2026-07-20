// Section manifests — the single source of truth for which sections each page is
// made of, in their default order. The admin's Structure panel reads this to let
// the team reorder / hide / show sections on ANY page, and PageSections renders
// pages from it (merged with the per-page `layout.<page>` content block).
//
// Adding a section to a page = add it to the page's component map (see
// PageSections usage in src/pages/*) AND list it here — it then shows up in the
// admin automatically. Template-library instances (kind:"lib") are added by the
// admin at runtime and never live in this file.

export type SectionDef = { id: string; label: string };

// One entry in a page's stored layout (the `layout.<page>` content block).
// Built-in sections carry `id`; template-library instances (Phase E) carry
// `kind:"lib"` + `template` + `instanceId`.
export type LayoutEntry = {
  id?: string;
  kind?: "builtin" | "lib";
  template?: string;
  instanceId?: string;
  hidden?: boolean;
};

export const SECTION_MANIFESTS: Record<string, SectionDef[]> = {
  home: [
    { id: "hero", label: "Hero" },
    { id: "stats", label: "Stats strip" },
    { id: "agent", label: "Tell the agent" },
    { id: "onephoto", label: "One photo · Nine worlds" },
    { id: "film", label: "Product film" },
    { id: "howitworks", label: "How it works" },
    { id: "branddna", label: "Brand DNA" },
    { id: "channels", label: "Channels" },
    { id: "deploy", label: "Deploy everywhere" },
    { id: "wall", label: "The Wall" },
    { id: "usecases", label: "Use cases" },
    { id: "testimonials", label: "Testimonials" },
    { id: "pricing", label: "Pricing preview" },
    { id: "cta", label: "Final CTA" },
  ],
  pricing: [
    { id: "hero", label: "Hero" },
    { id: "cards", label: "Plan cards" },
    { id: "compare", label: "Comparison table" },
    { id: "faq", label: "FAQ" },
    { id: "cta", label: "Final CTA" },
  ],
  "small-business": [
    { id: "hero", label: "Hero" },
    { id: "benefits", label: "Benefits" },
    { id: "tailored", label: "Tailored for you" },
    { id: "branddna", label: "Brand DNA" },
    { id: "channels", label: "Channels" },
    { id: "cta", label: "Final CTA" },
  ],
  ecommerce: [
    { id: "hero", label: "Hero" },
    { id: "benefits", label: "Benefits" },
    { id: "onephoto", label: "One photo · Nine worlds" },
    { id: "testimonials", label: "Testimonials" },
    { id: "cta", label: "Final CTA" },
  ],
  "how-it-works": [
    { id: "hero", label: "Hero" },
    { id: "workflow", label: "Step-by-step workflow" },
    { id: "creative", label: "Creative direction" },
    { id: "organize", label: "Workspaces & teams" },
    { id: "cta", label: "Final CTA" },
  ],
  faq: [
    { id: "header", label: "Header & search" },
    { id: "body", label: "Questions & contact" },
  ],
};

export function sectionLabel(page: string, entry: LayoutEntry): string {
  if (entry.kind === "lib") return entry.template ?? "Custom section";
  const def = (SECTION_MANIFESTS[page] ?? []).find((s) => s.id === entry.id);
  return def?.label ?? entry.id ?? "Section";
}

// Stable identity for a layout entry (used as React key / drag id).
export const entryKey = (e: LayoutEntry) =>
  e.kind === "lib" ? `lib:${e.instanceId}` : `s:${e.id}`;

export function parseLayout(raw: string | undefined | null): LayoutEntry[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return null;
    const entries = v.filter(
      (e): e is LayoutEntry => !!e && typeof e === "object" && (typeof e.id === "string" || e.kind === "lib")
    );
    return entries.length ? entries : null;
  } catch {
    return null;
  }
}

// Final ordered entry list for a page: the stored layout (if any), plus any
// manifest sections it doesn't know about yet appended visible at the end —
// so newly-coded sections always surface even with an older saved layout.
export function resolveLayout(page: string, raw: string | undefined | null): LayoutEntry[] {
  const manifest = SECTION_MANIFESTS[page] ?? [];
  const stored: LayoutEntry[] = parseLayout(raw) ?? manifest.map((s) => ({ id: s.id }));
  const known = new Set(stored.filter((e) => e.kind !== "lib").map((e) => e.id));
  const missing = manifest.filter((s) => !known.has(s.id)).map((s) => ({ id: s.id }));
  return [...stored, ...missing];
}
