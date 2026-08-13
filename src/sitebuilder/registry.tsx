import type { ComponentType } from "react";
import { Check, Play } from "lucide-react";
import { CtaButton, EditableEyebrow, SectionHeading, Tag } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { useC, resolveAsset, editable } from "@/content/ContentProvider";
import { SIGN_UP_URL } from "@/lib/site";

// Shared sections (Annie's cross-page reuse): the standalone sections any page
// can adopt. They render with their own global content keys, so e.g. the
// pricing module stays one source of truth wherever it appears.
import { StatStrip } from "@/sections/StatStrip";
import { TellTheAgent } from "@/sections/TellTheAgent";
import { OnePhotoCampaign } from "@/sections/OnePhotoCampaign";
import { ProductFilm } from "@/sections/ProductFilm";
import { HowItWorks } from "@/sections/HowItWorks";
import { BrandDNA } from "@/sections/BrandDNA";
import { Channels } from "@/sections/Channels";
import { DeployEverywhere } from "@/sections/DeployEverywhere";
import { TheWall } from "@/sections/TheWall";
import { UseCases } from "@/sections/UseCases";
import { Testimonials } from "@/sections/Testimonials";
import { PricingPreview } from "@/sections/PricingPreview";
import { FinalCTA } from "@/sections/FinalCTA";

/* The section template library ("+ Add section" in the Editor). Every template
 * is a real coded, on-brand section parameterized ONLY by content keys under
 * `sec.<instanceId>.*` — so the moment one is inserted it's editable in the
 * panel and click-to-edit on the canvas, and it publishes like any content.
 *
 * Template components receive `k(field)` (field → full content key) and read
 * copy via useC with the template's default as fallback — inserted instances
 * render immediately, before any rows exist. */

type K = (field: string) => string;
export type TemplateDef = {
  id: string;
  category: "Hero" | "Features" | "Social proof" | "Call to action" | "Content" | "Media";
  name: string;
  description: string;
  defaults: Record<string, string>;
  Component: ComponentType<{ k: K }>;
};

const F = (defaults: Record<string, string>) => defaults;

/* ---------- helpers used inside templates ---------- */
function useT(k: K, defaults: Record<string, string>) {
  const c = useC();
  return (field: string) => c(k(field), defaults[field] ?? "");
}

/* ---------- 1 · Hero — split ---------- */
const heroSplitDefaults = F({
  eyebrow: "New",
  title_lead: "A headline that ",
  title_accent: "earns the click",
  title_tail: ".",
  sub: "One clear sentence on the outcome you deliver — who it's for and why it beats the old way.",
  cta_primary: "Get started",
  cta_secondary: "Learn more",
  image: "/assets/product/home.png",
  badge: "Live in minutes",
});
function HeroSplit({ k }: { k: K }) {
  const t = useT(k, heroSplitDefaults);
  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
      <div className="wrap-wide grid items-center gap-12 lg:grid-cols-2">
        <div className="max-w-xl">
          <EditableEyebrow k={k("eyebrow")} defaultLabel={heroSplitDefaults.eyebrow} />
          <h2 className="mt-6 font-display text-[clamp(36px,5.5vw,64px)] leading-[1.02] tracking-[-0.02em] text-ink">
            <span {...editable(k("title_lead"))}>{t("title_lead")}</span>
            <span className="italic-blue" {...editable(k("title_accent"))}>{t("title_accent")}</span>
            <span {...editable(k("title_tail"))}>{t("title_tail")}</span>
          </h2>
          <p className="mt-5 max-w-lg text-[clamp(15px,1.5vw,17.5px)] text-ink-2" {...editable(k("sub"), "richtext")}>{t("sub")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CtaButton k={k("cta_primary")} defaultLabel={heroSplitDefaults.cta_primary} defaultHref={SIGN_UP_URL} variant="primary" size="lg" arrow />
            <CtaButton k={k("cta_secondary")} defaultLabel={heroSplitDefaults.cta_secondary} defaultHref="/how-it-works" variant="ghost" size="lg" />
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[480px]">
          <span className="absolute inset-0 -z-10 scale-110 rounded-[3rem] blur-3xl" style={{ background: "radial-gradient(circle at 50% 40%, rgb(var(--c-blue)/0.18), transparent 65%)" }} />
          <div className="overflow-hidden rounded-3xl border border-line bg-white p-2 shadow-card" {...editable(k("image"), "image")}>
            <img src={resolveAsset(t("image"))} alt="" loading="lazy" className="block aspect-[16/11] w-full rounded-2xl border border-line/60 object-cover object-top" />
          </div>
          <div className="absolute -bottom-4 left-6 rounded-full border border-line bg-white/95 px-3.5 py-2 text-[12px] font-semibold text-ink shadow-card backdrop-blur" {...editable(k("badge"))}>
            {t("badge")}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 2 · Hero — centered ---------- */
const heroCenterDefaults = F({
  eyebrow: "Announcement",
  title_lead: "Make a ",
  title_accent: "statement",
  title_tail: ".",
  sub: "A centered stage for a launch, a product line, or a single big idea.",
  cta_primary: "Get started",
  note: "No credit card required",
});
function HeroCentered({ k }: { k: K }) {
  const t = useT(k, heroCenterDefaults);
  return (
    <section className="relative overflow-hidden py-24 text-center md:py-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" />
      <div className="wrap">
        <div className="flex justify-center"><EditableEyebrow k={k("eyebrow")} defaultLabel={heroCenterDefaults.eyebrow} /></div>
        <h2 className="mx-auto mt-6 max-w-3xl font-display text-[clamp(38px,6vw,70px)] leading-[1.0] tracking-[-0.02em] text-ink">
          <span {...editable(k("title_lead"))}>{t("title_lead")}</span>
          <span className="italic-blue" {...editable(k("title_accent"))}>{t("title_accent")}</span>
          <span {...editable(k("title_tail"))}>{t("title_tail")}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[clamp(15px,1.5vw,18px)] text-ink-2" {...editable(k("sub"), "richtext")}>{t("sub")}</p>
        <div className="mt-9 flex justify-center">
          <CtaButton k={k("cta_primary")} defaultLabel={heroCenterDefaults.cta_primary} defaultHref={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow />
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-[13px] text-ink-3" {...editable(k("note"))}>
          <Check className="h-4 w-4 text-blue" /> {t("note")}
        </p>
      </div>
    </section>
  );
}

/* ---------- 3 · Feature grid (3-up) ---------- */
const featureGridDefaults = F({
  tag: "Why us",
  title_lead: "Three reasons it ",
  title_accent: "just works",
  sub: "Swap these for your own proof points — short titles, one-sentence bodies.",
  f0_title: "Fast by default", f0_body: "From brief to shipped in minutes, not weeks.",
  f1_title: "On brand, always", f1_body: "Your look and voice locked into every output.",
  f2_title: "Every channel", f2_body: "Social, paid, email — sized and written for each.",
});
function FeatureGrid({ k }: { k: K }) {
  const t = useT(k, featureGridDefaults);
  return (
    <section className="py-20 md:py-28">
      <div className="wrap-wide">
        <SectionHeading
          tag={<span {...editable(k("tag"))}>{t("tag")}</span>}
          title={<><span {...editable(k("title_lead"))}>{t("title_lead")}</span><span className="italic-blue" {...editable(k("title_accent"))}>{t("title_accent")}</span></>}
          sub={<span {...editable(k("sub"), "richtext")}>{t("sub")}</span>}
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="h-full rounded-3xl border border-line bg-white p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-card">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-mist text-blue"><Check className="h-5 w-5" /></span>
                <h3 className="mt-5 text-[19px] font-semibold text-ink" {...editable(k(`f${i}_title`))}>{t(`f${i}_title`)}</h3>
                <p className="mt-2 text-[14.5px] text-ink-2" {...editable(k(`f${i}_body`), "richtext")}>{t(`f${i}_body`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 4 · Split feature (image + checklist) ---------- */
const splitFeatureDefaults = F({
  tag: "Feature",
  title_lead: "Show it ",
  title_accent: "working",
  sub: "Pair a real product shot with the three things people care about.",
  check0: "First benefit, stated plainly",
  check1: "Second benefit with a number in it",
  check2: "Third benefit that removes a fear",
  cta: "See it in action",
  image: "/assets/product/review.png",
});
function SplitFeature({ k }: { k: K }) {
  const t = useT(k, splitFeatureDefaults);
  return (
    <section className="border-y border-line bg-paper py-20 md:py-28">
      <div className="wrap-wide grid items-center gap-12 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl border border-line bg-white p-2 shadow-card" {...editable(k("image"), "image")}>
          <img src={resolveAsset(t("image"))} alt="" loading="lazy" className="block aspect-[16/11] w-full rounded-2xl border border-line/60 object-cover object-top" />
        </div>
        <div className="max-w-xl">
          <Tag className="mb-5 text-ink-3"><span {...editable(k("tag"))}>{t("tag")}</span></Tag>
          <h2 className="font-display text-[clamp(30px,4.5vw,52px)] leading-[1.04] tracking-[-0.01em] text-ink">
            <span {...editable(k("title_lead"))}>{t("title_lead")}</span>
            <span className="italic-blue" {...editable(k("title_accent"))}>{t("title_accent")}</span>
          </h2>
          <p className="mt-4 text-[15.5px] text-ink-2" {...editable(k("sub"), "richtext")}>{t("sub")}</p>
          <ul className="mt-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-start gap-2.5 text-[15px] text-ink-2">
                <Check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-blue" />
                <span {...editable(k(`check${i}`))}>{t(`check${i}`)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <CtaButton k={k("cta")} defaultLabel={splitFeatureDefaults.cta} defaultHref="/how-it-works" variant="ghost" arrow />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 5 · Stat band ---------- */
const statBandDefaults = F({
  s0_value: "10×", s0_label: "faster to ship",
  s1_value: "30+", s1_label: "channels covered",
  s2_value: "90s", s2_label: "to a full campaign",
  s3_value: "0", s3_label: "design skills needed",
});
function StatBand({ k }: { k: K }) {
  const t = useT(k, statBandDefaults);
  return (
    <section className="bg-ink py-14 md:py-16">
      <div className="wrap-wide grid grid-cols-2 gap-8 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="text-center">
            <div className="font-display text-[clamp(34px,4.5vw,52px)] leading-none text-white" {...editable(k(`s${i}_value`))}>{t(`s${i}_value`)}</div>
            <div className="mt-2 text-[13.5px] text-white/60" {...editable(k(`s${i}_label`))}>{t(`s${i}_label`)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- 6 · Testimonial band ---------- */
const testimonialDefaults = F({
  tag: "What people say",
  title_lead: "Loved by ",
  title_accent: "teams like yours",
  q0: "“Replace this with a real quote — specifics beat superlatives.”", q0_name: "Full Name", q0_role: "Role, Company",
  q1: "“A second voice, ideally about a different outcome.”", q1_name: "Full Name", q1_role: "Role, Company",
  q2: "“A third that answers the biggest objection.”", q2_name: "Full Name", q2_role: "Role, Company",
});
function TestimonialBand({ k }: { k: K }) {
  const t = useT(k, testimonialDefaults);
  return (
    <section className="border-y border-line bg-paper py-20 md:py-28">
      <div className="wrap-wide">
        <SectionHeading
          align="center"
          tag={<span {...editable(k("tag"))}>{t("tag")}</span>}
          title={<><span {...editable(k("title_lead"))}>{t("title_lead")}</span><span className="italic-blue" {...editable(k("title_accent"))}>{t("title_accent")}</span></>}
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Reveal key={i} delay={i * 0.08}>
              <figure className="flex h-full flex-col rounded-3xl border border-line bg-white p-7 shadow-soft">
                <blockquote className="flex-1 text-[15.5px] leading-relaxed text-ink" {...editable(k(`q${i}`), "richtext")}>{t(`q${i}`)}</blockquote>
                <figcaption className="mt-5 border-t border-line pt-4">
                  <div className="text-[14px] font-semibold text-ink" {...editable(k(`q${i}_name`))}>{t(`q${i}_name`)}</div>
                  <div className="text-[13px] text-ink-3" {...editable(k(`q${i}_role`))}>{t(`q${i}_role`)}</div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 7 · CTA banner ---------- */
const ctaBannerDefaults = F({
  title: "Ready when you are.",
  sub: "One sentence that removes the last doubt and points at the button.",
  cta: "Start free",
  note: "No credit card required · Cancel anytime",
});
function CtaBanner({ k }: { k: K }) {
  const t = useT(k, ctaBannerDefaults);
  return (
    <section className="px-4 py-16 md:py-20">
      <div className="wrap-wide">
        <div className="noise relative overflow-hidden rounded-[36px] px-6 py-16 text-center md:px-16 md:py-20" style={{ background: "radial-gradient(120% 120% at 50% 0%, rgb(var(--c-blue-bright)) 0%, rgb(var(--c-blue)) 45%, rgb(var(--c-blue-ink)) 100%)" }}>
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-[clamp(30px,5vw,54px)] leading-[1.04] text-white" {...editable(k("title"))}>{t("title")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-[15.5px] text-white/75" {...editable(k("sub"), "richtext")}>{t("sub")}</p>
            <div className="mt-8 flex justify-center">
              <CtaButton k={k("cta")} defaultLabel={ctaBannerDefaults.cta} defaultHref={SIGN_UP_URL} variant="ghost" size="lg" magnetic arrow className="border-transparent bg-white text-ink shadow-lift hover:bg-white" />
            </div>
            <p className="mt-4 text-[12.5px] text-white/60" {...editable(k("note"))}>{t("note")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 8 · Media / video block ---------- */
const mediaDefaults = F({
  tag: "See it in motion",
  title_lead: "Watch the ",
  title_accent: "whole flow",
  video: "assets/video/airea-widescreen.mp4",
  poster: "assets/video/airea-widescreen-poster.jpg",
});
function MediaBlock({ k }: { k: K }) {
  const t = useT(k, mediaDefaults);
  return (
    <section className="py-20 md:py-28">
      <div className="wrap-wide">
        <SectionHeading
          align="center"
          tag={<span {...editable(k("tag"))}>{t("tag")}</span>}
          title={<><span {...editable(k("title_lead"))}>{t("title_lead")}</span><span className="italic-blue" {...editable(k("title_accent"))}>{t("title_accent")}</span></>}
        />
        <Reveal className="mt-12">
          <div className="relative overflow-hidden rounded-[28px] border border-line bg-ink shadow-card">
            <span style={{ display: "contents" }} {...editable(k("video"), "video")}>
              <video src={resolveAsset(t("video"))} poster={resolveAsset(t("poster"))} controls playsInline preload="metadata" className="block aspect-video w-full object-cover" />
            </span>
            <span className="pointer-events-none absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink"><Play className="h-4 w-4 fill-current" /></span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- registry ---------- */
export const TEMPLATES: TemplateDef[] = [
  { id: "hero-split", category: "Hero", name: "Hero — split", description: "Headline left, framed product shot right, two buttons.", defaults: heroSplitDefaults, Component: HeroSplit },
  { id: "hero-centered", category: "Hero", name: "Hero — centered", description: "Big centered statement with one button.", defaults: heroCenterDefaults, Component: HeroCentered },
  { id: "feature-grid", category: "Features", name: "Feature grid", description: "Three proof-point cards under a heading.", defaults: featureGridDefaults, Component: FeatureGrid },
  { id: "split-feature", category: "Features", name: "Split feature", description: "Image beside a checklist and button, on paper.", defaults: splitFeatureDefaults, Component: SplitFeature },
  { id: "stat-band", category: "Social proof", name: "Stat band", description: "Four big numbers on an ink-dark band.", defaults: statBandDefaults, Component: StatBand },
  { id: "testimonial-band", category: "Social proof", name: "Testimonials", description: "Three quote cards with names and roles.", defaults: testimonialDefaults, Component: TestimonialBand },
  { id: "cta-banner", category: "Call to action", name: "CTA banner", description: "Compact blue banner with one button.", defaults: ctaBannerDefaults, Component: CtaBanner },
  { id: "media-block", category: "Media", name: "Video block", description: "Full-width video with heading.", defaults: mediaDefaults, Component: MediaBlock },
];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);

// Existing standalone sections any page can adopt (render their own global keys).
export const SHARED_SECTIONS: { id: string; label: string; Component: ComponentType }[] = [
  { id: "stats", label: "Stats strip", Component: StatStrip },
  { id: "agent", label: "Tell the agent", Component: TellTheAgent },
  { id: "onephoto", label: "One photo · Nine worlds", Component: OnePhotoCampaign },
  { id: "film", label: "Product film", Component: ProductFilm },
  { id: "howitworks", label: "How it works", Component: HowItWorks },
  { id: "branddna", label: "Brand DNA", Component: BrandDNA },
  { id: "channels", label: "Channels", Component: Channels },
  { id: "deploy", label: "Deploy everywhere", Component: DeployEverywhere },
  { id: "wall", label: "The Wall", Component: TheWall },
  { id: "usecases", label: "Use cases", Component: UseCases },
  { id: "testimonials", label: "Testimonials", Component: Testimonials },
  { id: "pricing", label: "Pricing module", Component: PricingPreview },
  { id: "cta", label: "Final CTA", Component: FinalCTA },
];

export const sharedById = (id: string) => SHARED_SECTIONS.find((s) => s.id === id);

/* Renders one inserted template instance: field → `sec.<instanceId>.<field>`. */
export function TemplateInstance({ template, instanceId }: { template: string; instanceId: string }) {
  const def = templateById(template);
  if (!def) return null;
  const k: K = (field) => `sec.${instanceId}.${field}`;
  return <def.Component k={k} />;
}
