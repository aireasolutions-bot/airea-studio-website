import { LayoutGrid, Maximize, Sparkles } from "lucide-react";
import { SubHero } from "@/components/SubHero";
import { FeatureTriple } from "@/components/FeatureTriple";
import { SectionHeading } from "@/components/ui";
import { OnePhotoCampaign } from "@/sections/OnePhotoCampaign";
import { Testimonials } from "@/sections/Testimonials";
import { FinalCTA } from "@/sections/FinalCTA";
import { useC, resolveAsset, editable } from "@/content/ContentProvider";

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
        eyebrow={<span {...editable("ec.hero.eyebrow")}>{c("ec.hero.eyebrow", "For e-commerce")}</span>}
        title={
          <>
            <span {...editable("ec.hero.title_lead")}>{c("ec.hero.title_lead", "One product photo. ")}</span>
            <span className="italic-blue" {...editable("ec.hero.title_accent")}>{c("ec.hero.title_accent", "Every ad.")}</span>
          </>
        }
        sub={<span {...editable("ec.hero.sub", "richtext")}>{c("ec.hero.sub", "Turn a single product shot into a full, on-brand funnel — paid social, organic, email, and marketplace creative — sized and written for every channel automatically.")}</span>}
        note={<span {...editable("ec.hero.note")}>{c("ec.hero.note", "No credit card required · Cancel anytime")}</span>}
        visual={
          <div className="relative mx-auto w-fit">
            <span
              className="absolute inset-0 -z-10 rounded-[3rem] blur-3xl"
              style={{ background: "radial-gradient(circle at 50% 40%, rgba(0,71,255,0.22), transparent 65%)" }}
            />
            <div className="overflow-hidden rounded-[28px] border border-line bg-white shadow-card">
              <img
                src={resolveAsset(c("ec.hero.image", "assets/campaigns/robot-cover.jpg"))}
                alt="One photo, a full campaign"
                className="w-[360px]"
                draggable={false}
                {...editable("ec.hero.image", "image")}
              />
            </div>
            <div className="absolute -right-5 top-8 rounded-2xl border border-line bg-white/95 px-3.5 py-2 font-mono text-[11px] font-semibold text-blue-ink shadow-card backdrop-blur" {...editable("ec.hero.badge")}>
              {c("ec.hero.badge", "4:5 · 9:16 · 1:1 · 16:9")}
            </div>
          </div>
        }
      />

      <section className="py-20 md:py-28">
        <div className="wrap-wide">
          <SectionHeading
            tag={<span {...editable("ec.benefits.tag")}>{c("ec.benefits.tag", "Why AIREA Studio")}</span>}
            title={<span {...editable("ec.benefits.title")}>{c("ec.benefits.title", "Your catalog, multiplied")}</span>}
            sub={<span {...editable("ec.benefits.sub", "richtext")}>{c("ec.benefits.sub", "The reframing, rewriting, and resizing that eats your team's week — handled.")}</span>}
          />
          <div className="mt-12">
            <FeatureTriple
              items={BENEFITS.map((b, i) => ({
                ...b,
                title: <span {...editable(`ec.benefit${i}.title`)}>{c(`ec.benefit${i}.title`, b.title)}</span>,
                body: <span {...editable(`ec.benefit${i}.body`, "richtext")}>{c(`ec.benefit${i}.body`, b.body)}</span>,
              }))}
            />
          </div>
        </div>
      </section>

      <OnePhotoCampaign />
      <Testimonials />
      <FinalCTA />
    </>
  );
}
