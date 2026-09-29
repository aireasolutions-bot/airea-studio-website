import { Bot, Compass, Layers3, Rocket, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { EditableEyebrow, SectionHeading, CtaButton } from "@/components/ui";
import { PageSections } from "@/components/PageSections";
import { Reveal } from "@/components/Reveal";
import { RobotHead } from "@/components/RobotHead";
import { Seo } from "@/components/Seo";
import { useC, resolveAsset, editable } from "@/content/ContentProvider";
import { SIGN_UP_URL } from "@/lib/site";
import { breadcrumbSchema } from "@/lib/seo";

const EASE = [0.22, 0.61, 0.36, 1] as const;

const PRINCIPLES = [
  {
    icon: Sparkles,
    title: "Make great marketing feel easy",
    body: "The best tools remove the hard parts without flattening the taste, craft, or strategy that make a brand memorable.",
  },
  {
    icon: Layers3,
    title: "One source, every channel",
    body: "A business should not have to rebuild the same idea ten times just because every platform asks for a different format.",
  },
  {
    icon: Compass,
    title: "Brand comes first",
    body: "AI should learn your voice, visuals, offers, and point of view — then protect them everywhere your campaign appears.",
  },
];

const STORY_POINTS = [
  "AIREA Studio was built for operators who need the output of a modern marketing team without the overhead of building one.",
  "We believe small teams deserve systems that think across strategy, creative, production, and publishing — not another blank canvas.",
  "Our platform turns a brief, product photo, or business goal into polished, on-brand campaigns ready for every channel.",
];

export function About() {
  const c = useC();

  const hero = (
    <section className="relative overflow-hidden pb-16 pt-32 md:pb-24 md:pt-40">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_72%)]" />
      <div className="wrap-wide grid items-center gap-12 lg:grid-cols-[1.04fr_0.96fr]">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <EditableEyebrow k="about.hero.eyebrow" defaultLabel="About AIREA Studio" />
          </motion.div>
          <motion.h1
            className="mt-6 font-display text-[clamp(42px,7vw,84px)] leading-[0.96] tracking-[-0.025em] text-ink"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.08 }}
          >
            <span {...editable("about.hero.title_lead")}>{c("about.hero.title_lead", "We’re building the ")}</span>
            <span className="italic-blue" {...editable("about.hero.title_accent")}>
              {c("about.hero.title_accent", "AI marketing team")}
            </span>
            <span {...editable("about.hero.title_tail")}>{c("about.hero.title_tail", " for small businesses.")}</span>
          </motion.h1>
          <motion.p
            className="mt-6 max-w-xl text-[clamp(16px,1.5vw,19px)] leading-8 text-ink-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
            {...editable("about.hero.sub", "richtext")}
          >
            {c(
              "about.hero.sub",
              "AIREA Studio helps lean teams plan, create, and launch on-brand campaigns across every channel — without needing an agency, a design department, or a dozen disconnected tools."
            )}
          </motion.p>
          <motion.div
            className="mt-9 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.32 }}
          >
            <CtaButton k="about.hero.cta_primary" defaultLabel="Start your free trial" defaultHref={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow />
            <CtaButton k="about.hero.cta_secondary" defaultLabel="See how it works" defaultHref="/how-it-works" variant="ghost" size="lg" />
          </motion.div>
        </div>

        <motion.div
          className="relative mx-auto w-full max-w-[520px]"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.28 }}
        >
          <span
            className="absolute inset-8 -z-10 rounded-[4rem] blur-3xl"
            style={{ background: "radial-gradient(circle at 50% 40%, rgb(var(--c-blue)/0.24), transparent 66%)" }}
          />
          <div className="rounded-5xl border border-line bg-white p-4 shadow-card">
            <div className="overflow-hidden rounded-4xl border border-line bg-paper">
              <img
                src={resolveAsset(c("about.hero.image", "assets/product/creative-generate.png"))}
                alt="AIREA Studio campaign generation workspace"
                className="aspect-[4/3] w-full object-cover"
                draggable={false}
                {...editable("about.hero.image", "image")}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {["Brand DNA", "Campaigns", "Deploy"].map((label, i) => (
                <div key={label} className="rounded-2xl border border-line bg-canvas px-3 py-3 text-center">
                  <div className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-full bg-blue-mist text-blue-ink">
                    {i === 0 ? <Bot className="h-4 w-4" /> : i === 1 ? <Sparkles className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
                  </div>
                  <p className="text-[12px] font-semibold text-ink">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -right-4 -top-7 hidden md:block">
            <RobotHead size={104} />
          </div>
        </motion.div>
      </div>
    </section>
  );

  const mission = (
    <section className="py-20 md:py-28">
      <div className="wrap-wide grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <SectionHeading
          tag={<span {...editable("about.mission.tag")}>{c("about.mission.tag", "Our mission")}</span>}
          title={<span {...editable("about.mission.title")}>{c("about.mission.title", "Give every business the leverage of a world-class marketing team")}</span>}
        />
        <div className="rounded-5xl border border-line bg-white p-7 shadow-soft md:p-10">
          <p className="text-[clamp(22px,3vw,36px)] leading-tight tracking-[-0.015em] text-ink" {...editable("about.mission.statement", "richtext")}>
            {c(
              "about.mission.statement",
              "Marketing should not be gated behind headcount, budget, or technical skill. We’re making the full campaign workflow — strategy, copy, visuals, formats, review, and publishing — feel as simple as briefing a teammate."
            )}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Minutes", "from brief to campaign"],
              ["Every channel", "adapted from one source"],
              ["Always on-brand", "trained by your Brand DNA"],
            ].map(([stat, label], i) => (
              <div key={stat} className="rounded-3xl border border-line bg-canvas p-5">
                <p className="font-display text-[34px] leading-none text-blue" {...editable(`about.mission.stat${i}.value`)}>{c(`about.mission.stat${i}.value`, stat)}</p>
                <p className="mt-2 text-[13px] font-medium text-ink-2" {...editable(`about.mission.stat${i}.label`)}>{c(`about.mission.stat${i}.label`, label)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  const principles = (
    <section className="border-y border-line bg-paper py-20 md:py-28">
      <div className="wrap-wide">
        <SectionHeading
          align="center"
          tag={<span {...editable("about.principles.tag")}>{c("about.principles.tag", "What we believe")}</span>}
          title={<span {...editable("about.principles.title")}>{c("about.principles.title", "Built for taste, speed, and consistency")}</span>}
          sub={<span {...editable("about.principles.sub", "richtext")}>{c("about.principles.sub", "AIREA Studio is designed around the realities of modern marketing: more channels, more formats, more pressure — and not enough time.")}</span>}
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PRINCIPLES.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={i * 0.08}>
                <div className="h-full rounded-4xl border border-line bg-white p-7 shadow-soft">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue text-white shadow-glow">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-[21px] font-semibold tracking-tight text-ink" {...editable(`about.principle${i}.title`)}>{c(`about.principle${i}.title`, item.title)}</h3>
                  <p className="mt-3 text-[15px] leading-7 text-ink-2" {...editable(`about.principle${i}.body`, "richtext")}>{c(`about.principle${i}.body`, item.body)}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );

  const story = (
    <section className="py-20 md:py-28">
      <div className="wrap-wide grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div className="relative rounded-5xl border border-line bg-ink p-7 text-white shadow-lift md:p-10">
          <div className="absolute right-8 top-8 opacity-90">
            <RobotHead size={82} />
          </div>
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-white/55" {...editable("about.story.kicker")}>{c("about.story.kicker", "The idea")}</p>
          <h2 className="mt-16 max-w-md font-display text-[clamp(34px,5vw,58px)] leading-[1.02] tracking-[-0.02em]" {...editable("about.story.title")}>
            {c("about.story.title", "Marketing software should feel like a creative partner, not a control panel.")}
          </h2>
        </div>
        <div className="space-y-5">
          {STORY_POINTS.map((point, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="rounded-3xl border border-line bg-white p-6 shadow-soft">
                <span className="font-mono text-[12px] font-semibold text-blue">0{i + 1}</span>
                <p className="mt-3 text-[17px] leading-8 text-ink-2" {...editable(`about.story.point${i}`, "richtext")}>{c(`about.story.point${i}`, point)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );

  const cta = (
    <section className="px-4 pb-24 md:pb-32">
      <div className="wrap-wide overflow-hidden rounded-5xl bg-blue px-6 py-14 text-center shadow-glow md:px-10 md:py-18">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-white/70" {...editable("about.cta.tag")}>{c("about.cta.tag", "Ready when you are")}</p>
        <h2 className="mx-auto mt-4 max-w-3xl font-display text-[clamp(34px,5vw,64px)] leading-[1.02] tracking-[-0.02em] text-white">
          <span {...editable("about.cta.title")}>{c("about.cta.title", "Build your first on-brand campaign today.")}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-[16px] leading-7 text-white/75" {...editable("about.cta.sub", "richtext")}>
          {c("about.cta.sub", "Train your Brand DNA, brief a goal, and let AIREA Studio turn it into polished creative for every channel.")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <CtaButton k="about.cta.primary" defaultLabel="Start 14-day free trial" defaultHref={SIGN_UP_URL} variant="dark" size="lg" arrow />
          <CtaButton k="about.cta.secondary" defaultLabel="View pricing" defaultHref="/pricing" variant="ghost" size="lg" />
        </div>
      </div>
    </section>
  );

  return (
    <>
      <Seo
        path="/about"
        jsonLd={[breadcrumbSchema([{ name: "Home", path: "/" }, { name: "About us", path: "/about" }])]}
      />
      <PageSections page="about" sections={{ hero, mission, principles, story, cta }} />
    </>
  );
}
