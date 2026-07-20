import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, FolderKanban, Sparkles, Users, Wand2 } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { RobotHead } from "@/components/RobotHead";
import { CtaButton, Eyebrow, Tag } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { PageSections } from "@/components/PageSections";
import { FinalCTA } from "@/sections/FinalCTA";
import { cn } from "@/lib/cn";
import { SIGN_UP_URL, STEPS as PRODUCT_STEPS } from "@/lib/site";
import { useC, resolveAsset, editable } from "@/content/ContentProvider";
import { Seo } from "@/components/Seo";
import { howToSchema, breadcrumbSchema } from "@/lib/seo";

const EASE = [0.22, 0.61, 0.36, 1] as const;

type Step = { title: string; desc: string; features: string[]; image: string };

const STEPS: Step[] = [
  {
    title: "Train your Brand DNA",
    desc: "Upload your website, style guides, and past content. The AIREA Agent analyzes your assets to build a brand profile that keeps everything consistent across channels.",
    features: ["Add your website URL, style guides, or use the wizard", "A complete brand profile, built in minutes"],
    image: "/assets/product/brand-dna-url.png",
  },
  {
    title: "Build with the AI Campaign Builder",
    desc: "Chat with the AIREA Agent to build multi-channel campaigns in minutes. Start with a single prompt and let the Agent guide you.",
    features: ["Conversational setup — no forms, just talk to the AI", "Smart suggestions for names and ideas, instantly"],
    image: "/assets/product/campaign-name.png",
  },
  {
    title: "Follow the guided workflow",
    desc: "Never miss a detail. A guided sidebar walks you through every crucial step, from initial concept to final creative direction.",
    features: ["Campaign name → content → platforms", "Upload images → creative direction → review", "Six clear steps, zero guesswork"],
    image: "/assets/product/home-agent.png",
  },
  {
    title: "Choose where it runs",
    desc: "Select the channels that matter most. AIREA automatically prepares content and creative tailored to each platform's format and audience.",
    features: ["Facebook, Instagram, Google, Email & more", "Built for each platform and ad format", "Consistent messaging across every channel"],
    image: "/assets/product/media-meta.png",
  },
  {
    title: "Create the visual direction",
    desc: "Define the look and feel with the AIREA Agent. Upload images, describe your vision, or let AI develop the creative direction for you.",
    features: ["Feature your product, location, or team", "Add references to guide style and mood", "AI turns ideas into optimized prompts"],
    image: "/assets/product/creative-direction.png",
  },
  {
    title: "Review and launch",
    desc: "Fine-tune your campaign with AI-assisted editing and deploy with confidence. Review, adjust, then publish or export across your channels.",
    features: ["AI-assisted copy & image editing", "One-click publish to Facebook & Instagram", "Export channel-ready assets for Google, Meta, email"],
    image: "/assets/product/review-edit-image.png",
  },
];

const VISUAL_OPTIONS = [
  { tag: "Option A", icon: Wand2, title: "Help me decide", body: "AI asks a few quick questions, then generates the best prompt to enhance your images." },
  { tag: "Option B", icon: Sparkles, title: "I'll direct it", body: "Describe the creative direction yourself and the Agent runs with it." },
  { tag: "Option C", icon: Check, title: "Use my images", body: "Use your uploaded product images exactly as they are — no changes." },
];

function StepExplorer() {
  const c = useC();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % STEPS.length), 5200);
    return () => clearTimeout(t);
  }, [active, paused]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="grid items-start gap-10 lg:grid-cols-[1fr_0.82fr] lg:gap-16"
    >
      {/* tabs */}
      <div className="flex flex-col gap-2.5">
        {STEPS.map((s, i) => {
          const on = active === i;
          return (
            <button
              key={s.title}
              onClick={() => setActive(i)}
              className={cn(
                "flex items-start gap-4 rounded-2xl border p-4 text-left transition-all duration-300",
                on ? "border-blue/30 bg-white shadow-card" : "border-transparent hover:bg-white/70"
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-[13px] font-semibold transition-colors",
                  on ? "bg-blue text-white" : "bg-blue-mist text-blue-ink"
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <div
                  {...editable(`howitworks.step${i}.title`)}
                  className={cn("text-[17px] font-semibold transition-colors", on ? "text-ink" : "text-ink-2")}
                >
                  {c(`howitworks.step${i}.title`, s.title)}
                </div>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    on ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <p
                      {...editable(`howitworks.step${i}.desc`, "richtext")}
                      className="mt-1.5 text-[14px] leading-relaxed text-ink-2"
                    >
                      {c(`howitworks.step${i}.desc`, s.desc)}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {s.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2 text-[13px] text-ink-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" />
                          <span {...editable(`howitworks.step${i}.feature${j}`)}>
                            {c(`howitworks.step${i}.feature${j}`, f)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {/* progress */}
                    {!paused && (
                      <div className="mt-3 h-0.5 w-full overflow-hidden rounded-full bg-line">
                        <motion.div
                          key={active}
                          className="h-full bg-blue"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 5.2, ease: "linear" }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* phone */}
      <div className="relative lg:sticky lg:top-24">
        <span
          className="absolute inset-0 -z-10 rounded-[3rem] blur-3xl"
          style={{ background: "radial-gradient(circle at 50% 40%, rgb(var(--c-blue)/0.2), transparent 65%)" }}
        />
        <div className="flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              {...editable(`howitworks.step${active}.image`, "image")}
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.97 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <PhoneFrame
                src={resolveAsset(c(`howitworks.step${active}.image`, STEPS[active].image))}
                width={290}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function HowItWorksPage() {
  const c = useC();

  const hero = (
      <section className="relative overflow-hidden pb-12 pt-32 text-center md:pt-40">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" />
        <div className="wrap">
          <div className="mb-6 flex justify-center">
            <RobotHead size={104} />
          </div>
          <div className="flex justify-center">
            <Eyebrow><span {...editable("howitworks.hero.eyebrow")}>{c("howitworks.hero.eyebrow")}</span></Eyebrow>
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-[clamp(40px,6.5vw,76px)] leading-[1.0] tracking-[-0.02em] text-ink">
            <span {...editable("howitworks.hero.title_lead")}>{c("howitworks.hero.title_lead")}</span>
            <span className="italic-blue" {...editable("howitworks.hero.title_accent")}>{c("howitworks.hero.title_accent")}</span>
            <span {...editable("howitworks.hero.title_tail")}>{c("howitworks.hero.title_tail")}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[clamp(15px,1.5vw,18px)] text-ink-2" {...editable("howitworks.hero.sub", "richtext")}>
            {c("howitworks.hero.sub")}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <CtaButton k="howitworks.hero.cta_primary" defaultLabel="Start your free trial" defaultHref={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow />
            <CtaButton k="howitworks.hero.cta_secondary" defaultLabel="See pricing" defaultHref="/pricing" variant="ghost" size="lg" />
          </div>
          <p className="mt-4 text-[13px] text-ink-3" {...editable("howitworks.hero.note")}>{c("howitworks.hero.note")}</p>
        </div>
      </section>
  );

  const workflow = (
      <section className="py-16 md:py-24">
        <div className="wrap-wide">
          <div className="max-w-2xl">
            <Tag className="mb-5 text-ink-3">
              <span {...editable("howitworks.workflow.tag")}>{c("howitworks.workflow.tag", "The workflow")}</span>
            </Tag>
            <h2 className="font-display text-[clamp(32px,5vw,58px)] leading-[1.03] tracking-[-0.01em] text-ink">
              <span {...editable("howitworks.workflow.title", "richtext")}>{c("howitworks.workflow.title", "From idea to launch, ")}</span>
              <span className="italic-blue" {...editable("howitworks.workflow.title_accent")}>{c("howitworks.workflow.title_accent", "guided")}</span>
              <span {...editable("howitworks.workflow.title_tail")}>{c("howitworks.workflow.title_tail", " the whole way.")}</span>
            </h2>
            <p className="mt-5 text-[clamp(15px,1.5vw,18px)] text-ink-2 max-w-xl" {...editable("howitworks.workflow.sub", "richtext")}>
              {c("howitworks.workflow.sub", "Six steps. One canvas. Tap any step to explore — or watch it cycle.")}
            </p>
          </div>
          <div className="mt-12">
            <StepExplorer />
          </div>
        </div>
      </section>
  );

  const creative = (
      <section className="border-y border-line bg-paper py-20 md:py-28">
        <div className="wrap-wide">
          <div className="max-w-2xl mx-auto text-center">
            <Tag className="mb-5 text-ink-3">
              <span {...editable("howitworks.creative.tag")}>{c("howitworks.creative.tag", "Creative direction")}</span>
            </Tag>
            <h2 className="font-display text-[clamp(32px,5vw,58px)] leading-[1.03] tracking-[-0.01em] text-ink">
              <span {...editable("howitworks.creative.title")}>{c("howitworks.creative.title", "Three ways to shape the ")}</span>
              <span className="italic-blue" {...editable("howitworks.creative.title_accent")}>{c("howitworks.creative.title_accent", "look")}</span>
              <span {...editable("howitworks.creative.title_tail")}>{c("howitworks.creative.title_tail", ".")}</span>
            </h2>
            <p className="mt-5 text-[clamp(15px,1.5vw,18px)] mx-auto text-ink-2 max-w-xl" {...editable("howitworks.creative.sub", "richtext")}>
              {c("howitworks.creative.sub", "However hands-on you want to be, the Agent meets you there.")}
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {VISUAL_OPTIONS.map((o, i) => (
              <Reveal key={o.tag} delay={i * 0.08}>
                <div className="h-full rounded-3xl border border-line bg-white p-7 shadow-soft">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-mist text-blue">
                      <o.icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{o.tag}</span>
                  </div>
                  <h3 className="mt-5 text-[19px] font-semibold text-ink" {...editable(`howitworks.visual.opt${i}.title`)}>
                    {c(`howitworks.visual.opt${i}.title`, o.title)}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2" {...editable(`howitworks.visual.opt${i}.body`, "richtext")}>
                    {c(`howitworks.visual.opt${i}.body`, o.body)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
  );

  const organize = (
      <section className="py-20 md:py-28">
        <div className="wrap-wide grid items-center gap-14 lg:grid-cols-2">
          <div>
            <div className="max-w-2xl">
              <Tag className="mb-5 text-ink-3">
                <span {...editable("howitworks.organize.tag")}>{c("howitworks.organize.tag", "Stay organized")}</span>
              </Tag>
              <h2 className="font-display text-[clamp(32px,5vw,58px)] leading-[1.03] tracking-[-0.01em] text-ink">
                <span {...editable("howitworks.organize.title")}>{c("howitworks.organize.title", "Workspaces built for ")}</span>
                <span className="italic-blue" {...editable("howitworks.organize.title_accent")}>{c("howitworks.organize.title_accent", "teams")}</span>
                <span {...editable("howitworks.organize.title_tail")}>{c("howitworks.organize.title_tail", ".")}</span>
              </h2>
              <p className="mt-5 text-[clamp(15px,1.5vw,18px)] text-ink-2 max-w-xl" {...editable("howitworks.organize.sub", "richtext")}>
                {c("howitworks.organize.sub", "Keep campaigns, brands, and initiatives organized — and manage everything from one place.")}
              </p>
            </div>
            <Reveal className="mt-7 flex flex-col gap-3" delay={0.1}>
              {[
                { icon: FolderKanban, t: "Separate workspaces", d: "For brands, locations, or initiatives." },
                { icon: Users, t: "Invite your team", d: "Assign access and collaborate in one place." },
                { icon: Check, t: "Organized by default", d: "Campaigns, assets, and approvals, all in order." },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-blue shadow-soft">
                    <r.icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold text-ink" {...editable(`howitworks.organize.item${i}.title`)}>
                      {c(`howitworks.organize.item${i}.title`, r.t)}
                    </div>
                    <div className="text-[14px] text-ink-2" {...editable(`howitworks.organize.item${i}.desc`)}>
                      {c(`howitworks.organize.item${i}.desc`, r.d)}
                    </div>
                  </div>
                </div>
              ))}
            </Reveal>
          </div>
          <Reveal className="relative mx-auto" delay={0.05}>
            <span
              className="absolute inset-0 -z-10 rounded-[3rem] blur-3xl"
              style={{ background: "radial-gradient(circle at 50% 40%, rgb(var(--c-blue)/0.18), transparent 65%)" }}
            />
            <div className="contents" {...editable("howitworks.organize.image", "image")}>
              <PhoneFrame src={resolveAsset(c("howitworks.organize.image", "/assets/product/control-center.png"))} width={300} />
            </div>
          </Reveal>
        </div>
      </section>
  );

  return (
    <>
      <Seo
        path="/how-it-works"
        jsonLd={[
          howToSchema("How AIREA Studio turns one brief into a full, on-brand campaign", PRODUCT_STEPS),
          breadcrumbSchema([{ name: "Home", path: "/" }, { name: "How it works", path: "/how-it-works" }]),
        ]}
      />
      <PageSections
        page="how-it-works"
        sections={{ hero, workflow, creative, organize, cta: <FinalCTA /> }}
      />
    </>
  );
}
