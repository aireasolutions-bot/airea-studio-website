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
import { useC, resolveAsset, editable } from "@/content/ContentProvider";

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
        eyebrow={c("sb.hero.eyebrow", "For small business")}
        title={
          <>
            <span {...editable("sb.hero.title_lead")}>{c("sb.hero.title_lead", "Small teams. ")}</span>
            <span className="italic-blue" {...editable("sb.hero.title_accent")}>{c("sb.hero.title_accent", "Big presence.")}</span>
          </>
        }
        sub={c("sb.hero.sub", "Create professional marketing across every channel without hiring an agency or becoming a marketing expert. AIREA Studio adapts your campaigns for each platform and bakes in best practices at every step.")}
        note={c("sb.hero.note", "No credit card required · Cancel anytime")}
        visual={
          <div className="relative mx-auto w-fit">
            <span
              className="absolute inset-0 -z-10 rounded-[3rem] blur-3xl"
              style={{ background: "radial-gradient(circle at 50% 40%, rgba(0,71,255,0.22), transparent 65%)" }}
            />
            <div {...editable("sb.hero.image", "image")}>
              <PhoneFrame src={resolveAsset(c("sb.hero.image", "assets/product/home-agent.png"))} width={290} />
            </div>
            <div className="absolute -right-3 -top-6">
              <RobotHead size={96} />
            </div>
            <div className="absolute -left-6 bottom-20 flex items-center gap-2 rounded-full border border-line bg-white/95 px-3.5 py-2 shadow-card backdrop-blur">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-blue text-white">
                <Check className="h-3 w-3" />
              </span>
              <span className="text-[12.5px] font-semibold text-ink" {...editable("sb.hero.badge")}>{c("sb.hero.badge", "Campaign live in minutes")}</span>
            </div>
          </div>
        }
      />

      <section className="py-20 md:py-28">
        <div className="wrap-wide">
          <SectionHeading
            tag={c("sb.benefits.tag", "Why AIREA Studio")}
            title={<span {...editable("sb.benefits.title")}>{c("sb.benefits.title", "Designed for small teams and solo operators")}</span>}
            sub={<span {...editable("sb.benefits.sub", "richtext")}>{c("sb.benefits.sub", "The leverage of an in-house marketing department, sized for the way you actually work.")}</span>}
          />
          <div className="mt-12">
            <FeatureTriple
              items={BENEFITS.map((b, i) => ({
                ...b,
                title: c(`sb.benefit${i}.title`, b.title),
                body: c(`sb.benefit${i}.body`, b.body),
              }))}
            />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper py-20 md:py-28">
        <div className="wrap-wide">
          <SectionHeading
            align="center"
            tag={c("sb.tailored.tag", "Tailored for you")}
            title={<span {...editable("sb.tailored.title")}>{c("sb.tailored.title", "Built around your business")}</span>}
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TAILORED.map((item, i) => (
              <Reveal key={item.t} delay={i * 0.08}>
                <div className="h-full rounded-3xl border border-line bg-white p-7 shadow-soft">
                  <span className="font-mono text-[12px] text-blue">0{i + 1}</span>
                  <h3 className="mt-3 text-[20px] font-semibold text-ink" {...editable(`sb.tailored.item${i}.title`)}>{c(`sb.tailored.item${i}.title`, item.t)}</h3>
                  <p className="mt-2 text-[14.5px] text-ink-2" {...editable(`sb.tailored.item${i}.desc`)}>{c(`sb.tailored.item${i}.desc`, item.d)}</p>
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
