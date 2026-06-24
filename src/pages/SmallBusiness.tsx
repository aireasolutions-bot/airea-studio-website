import { Clock, ShieldCheck, TrendingUp, Check } from "lucide-react";
import { SubHero } from "@/components/SubHero";
import { PhoneFrame } from "@/components/PhoneFrame";
import { RobotHead } from "@/components/RobotHead";
import { FeatureTriple } from "@/components/FeatureTriple";
import { SectionHeading } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { BrandDNA } from "@/sections/BrandDNA";
import { Channels } from "@/sections/Channels";
import { FinalCTA } from "@/sections/FinalCTA";
import { useC, resolveAsset } from "@/content/ContentProvider";

const BENEFITS = [
  {
    icon: Clock,
    title: "Save hours every week",
    body: "Create once and deploy across every channel. What took an afternoon now takes minutes.",
  },
  {
    icon: TrendingUp,
    title: "Punch above your weight",
    body: "Professional marketing that helps you compete with brands ten times your size.",
  },
  {
    icon: ShieldCheck,
    title: "Brand consistency on autopilot",
    body: "A unified, professional brand voice across every touchpoint — no design skills required.",
  },
];

const TAILORED = [
  { t: "Local businesses", d: "Fill seats and drive foot traffic with seasonal campaigns that run themselves." },
  { t: "Service providers", d: "Win attention and book more jobs while you stay focused on the work." },
  { t: "Solo entrepreneurs", d: "A full marketing team in your pocket — no agency, no new hires." },
];

export function SmallBusiness() {
  const c = useC();
  return (
    <>
      <SubHero
        eyebrow={c("sb.hero.eyebrow")}
        title={
          <>
            {c("sb.hero.title_lead")}
            <span className="italic-blue">{c("sb.hero.title_accent")}</span>
          </>
        }
        sub={c("sb.hero.sub")}
        note="No credit card required · Cancel anytime"
        visual={
          <div className="relative mx-auto w-fit">
            <span
              className="absolute inset-0 -z-10 rounded-[3rem] blur-3xl"
              style={{ background: "radial-gradient(circle at 50% 40%, rgba(0,71,255,0.22), transparent 65%)" }}
            />
            <PhoneFrame src={resolveAsset(c("sb.hero.image"))} width={290} />
            <div className="absolute -right-3 -top-6">
              <RobotHead size={96} />
            </div>
            <div className="absolute -left-6 bottom-20 flex items-center gap-2 rounded-full border border-line bg-white/95 px-3.5 py-2 shadow-card backdrop-blur">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-blue text-white">
                <Check className="h-3 w-3" />
              </span>
              <span className="text-[12.5px] font-semibold text-ink">Campaign live in minutes</span>
            </div>
          </div>
        }
      />

      <section className="py-20 md:py-28">
        <div className="wrap-wide">
          <SectionHeading
            tag="Why AIREA Studio"
            title="Designed for small teams and solo operators"
            sub="The leverage of an in-house marketing department, sized for the way you actually work."
          />
          <div className="mt-12">
            <FeatureTriple items={BENEFITS} />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper py-20 md:py-28">
        <div className="wrap-wide">
          <SectionHeading align="center" tag="Tailored for you" title="Built around your business" />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TAILORED.map((c, i) => (
              <Reveal key={c.t} delay={i * 0.08}>
                <div className="h-full rounded-3xl border border-line bg-white p-7 shadow-soft">
                  <span className="font-mono text-[12px] text-blue">0{i + 1}</span>
                  <h3 className="mt-3 text-[20px] font-semibold text-ink">{c.t}</h3>
                  <p className="mt-2 text-[14.5px] text-ink-2">{c.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <BrandDNA />
      <Channels />
      <FinalCTA />
    </>
  );
}
