import { LayoutGrid, Maximize, Sparkles } from "lucide-react";
import { SubHero } from "@/components/SubHero";
import { FeatureTriple } from "@/components/FeatureTriple";
import { SectionHeading } from "@/components/ui";
import { OnePhotoCampaign } from "@/sections/OnePhotoCampaign";
import { Testimonials } from "@/sections/Testimonials";
import { FinalCTA } from "@/sections/FinalCTA";
import { useC, resolveAsset } from "@/content/ContentProvider";

const BENEFITS = [
  {
    icon: Maximize,
    title: "Every ratio, instantly",
    body: "One product photo becomes feed, story, square and wide — perfectly framed for each placement.",
  },
  {
    icon: LayoutGrid,
    title: "Catalog-scale creative",
    body: "Generate on-brand ads across your whole catalog without a photo shoot for every SKU.",
  },
  {
    icon: Sparkles,
    title: "On-brand across channels",
    body: "Your look, palette, and voice stay locked from the first ad to the hundredth.",
  },
];

export function Ecommerce() {
  const c = useC();
  return (
    <>
      <SubHero
        eyebrow={c("ec.hero.eyebrow")}
        title={
          <>
            {c("ec.hero.title_lead")}
            <span className="italic-blue">{c("ec.hero.title_accent")}</span>
          </>
        }
        sub={c("ec.hero.sub")}
        note="No credit card required · Cancel anytime"
        visual={
          <div className="relative mx-auto w-fit">
            <span
              className="absolute inset-0 -z-10 rounded-[3rem] blur-3xl"
              style={{ background: "radial-gradient(circle at 50% 40%, rgba(0,71,255,0.22), transparent 65%)" }}
            />
            <div className="overflow-hidden rounded-[28px] border border-line bg-white shadow-card">
              <img
                src={resolveAsset(c("ec.hero.image"))}
                alt="One photo, a full campaign"
                className="w-[360px]"
                draggable={false}
              />
            </div>
            <div className="absolute -right-5 top-8 rounded-2xl border border-line bg-white/95 px-3.5 py-2 font-mono text-[11px] font-semibold text-blue-ink shadow-card backdrop-blur">
              4:5 · 9:16 · 1:1 · 16:9
            </div>
          </div>
        }
      />

      <section className="py-20 md:py-28">
        <div className="wrap-wide">
          <SectionHeading
            tag="Why AIREA Studio"
            title="Your catalog, multiplied"
            sub="The reframing, rewriting, and resizing that eats your team's week — handled."
          />
          <div className="mt-12">
            <FeatureTriple items={BENEFITS} />
          </div>
        </div>
      </section>

      <OnePhotoCampaign />
      <Testimonials />
      <FinalCTA />
    </>
  );
}
