import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  FileText,
  Grid3X3,
  ImagePlus,
  Layers3,
  Maximize2,
  Megaphone,
  MousePointer2,
  PenLine,
  Play,
  RadioTower,
  Send,
  SlidersHorizontal,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { RobotHead } from "@/components/RobotHead";
import { Button, Tag } from "@/components/ui";
import { cn } from "@/lib/cn";
import { SIGN_UP_URL } from "@/lib/site";

const OUTPUT_FORMATS = [
  {
    label: "Feed ad",
    channel: "Instagram",
    size: "1:1",
    src: "/assets/campaigns/ratio-feed.jpg",
    className: "lg:left-0 lg:top-10",
  },
  {
    label: "Story ad",
    channel: "Meta",
    size: "9:16",
    src: "/assets/campaigns/ratio-story.jpg",
    className: "lg:right-2 lg:top-0",
  },
  {
    label: "LinkedIn post",
    channel: "B2B social",
    size: "4:5",
    src: "/assets/campaigns/ratio-linkedin.jpg",
    className: "lg:left-10 lg:bottom-0",
  },
  {
    label: "YouTube cut",
    channel: "Video/display",
    size: "16:9",
    src: "/assets/campaigns/ratio-youtube.jpg",
    className: "lg:right-0 lg:bottom-12",
  },
];

const BUILDER_STEPS = [
  {
    icon: FileText,
    title: "Name the campaign",
    body: "Set the launch goal, audience, offer, and vibe once.",
    image: "/assets/product/campaign-name.png",
  },
  {
    icon: Wand2,
    title: "Pick a creative direction",
    body: "AIREA suggests angles, visual routes, and copy territories.",
    image: "/assets/product/creative-direction.png",
  },
  {
    icon: ImagePlus,
    title: "Generate the ad set",
    body: "Turn one source into scroll-stopping variants for every placement.",
    image: "/assets/product/creative-generate.png",
  },
  {
    icon: PenLine,
    title: "Review and edit in context",
    body: "Tweak headlines, captions, crops, and image details without leaving the builder.",
    image: "/assets/product/review-edit-image.png",
  },
  {
    icon: RadioTower,
    title: "Deploy everywhere",
    body: "Export or publish channel-ready creative from the same workspace.",
    image: "/assets/product/deploy.png",
  },
];

const REMIXES = [
  {
    tab: "Launch",
    headline: "Drop day energy",
    prompt: "Make it feel fresh, fast, and impossible to miss.",
    image: "/assets/campaigns/shoe-nine.jpg",
    stats: ["12 assets", "4 channels", "3 angles"],
  },
  {
    tab: "Sale",
    headline: "Urgency without the cringe",
    prompt: "Turn the same source into a tasteful promo campaign.",
    image: "/assets/campaigns/proof-grid.jpg",
    stats: ["18 assets", "6 crops", "5 captions"],
  },
  {
    tab: "Proof",
    headline: "Show the product doing the talking",
    prompt: "Create comparison, benefit, and social-proof variants.",
    image: "/assets/campaigns/nine-grid.jpg",
    stats: ["9 concepts", "7 hooks", "Ready to test"],
  },
];

const CHANNELS = ["Meta", "Instagram", "Google", "LinkedIn", "YouTube", "Email", "Display", "TikTok-ready"];

const BUILDER_CARDS = [
  { icon: SlidersHorizontal, label: "Brand guardrails", text: "Tone, colors, crops, and no-go zones stay baked in." },
  { icon: Grid3X3, label: "Variant matrix", text: "Angles, sizes, headlines, and CTAs are generated as a system." },
  { icon: MousePointer2, label: "Click-to-edit", text: "Change copy or visuals directly inside the campaign preview." },
];

export function Test2() {
  const [activeRemix, setActiveRemix] = useState(0);
  const remix = REMIXES[activeRemix];

  return (
    <div className="overflow-hidden bg-canvas pt-16">
      <section className="relative min-h-screen py-20 md:py-28">
        <div className="bg-blue-radial pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -right-40 top-24 h-[30rem] w-[30rem] rounded-full bg-blue/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-36 bottom-10 h-[28rem] w-[28rem] rounded-full bg-blue-sky/20 blur-3xl" />

        <div className="wrap-wide relative grid min-h-[calc(100vh-8rem)] items-center gap-14 lg:grid-cols-[0.86fr_1.14fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <Tag className="mb-6 text-ink-3">Hidden concept page · /test-2</Tag>
            <h1 className="font-display text-[clamp(46px,8vw,108px)] leading-[0.9] tracking-[-0.04em] text-ink">
              One source.
              <br />
              Multiple ads.
              <br />
              <span className="italic-blue">Zero chaos.</span>
            </h1>
            <p className="mt-7 max-w-xl text-[clamp(17px,1.7vw,22px)] leading-relaxed text-ink-2">
              Drop a product photo, campaign idea, or rough brief into AIREA Campaign Builder. Watch it
              become a polished ad system with formats, copy, creative angles, and channel-ready variants.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button href={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow>
                Build a campaign
              </Button>
              <a
                href="#builder"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
              >
                Tour the builder
                <ArrowRight className="h-4 w-4 text-blue" />
              </a>
            </div>

            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ["1", "source"],
                ["30+", "ad variants"],
                ["All", "placements"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-3xl border border-line bg-white/80 p-4 shadow-soft backdrop-blur">
                  <div className="font-display text-3xl tracking-tight text-ink">{value}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.1, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute -left-5 top-12 z-30 hidden rounded-full border border-line bg-white p-3 shadow-card lg:block">
              <RobotHead size={76} />
            </div>

            <div className="relative min-h-[620px] rounded-5xl border border-line bg-white/70 p-4 shadow-lift backdrop-blur md:p-6">
              <div className="absolute inset-6 rounded-5xl bg-[linear-gradient(135deg,rgba(0,71,255,0.08),rgba(91,155,255,0.18),rgba(255,255,255,0))]" />

              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-20 mx-auto mt-10 w-full max-w-[360px] overflow-hidden rounded-5xl border border-ink/10 bg-ink p-3 shadow-lift"
              >
                <div className="rounded-4xl bg-white p-3">
                  <div className="flex items-center justify-between rounded-3xl bg-paper px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-critical" />
                      <span className="h-3 w-3 rounded-full bg-blue-sky" />
                      <span className="h-3 w-3 rounded-full bg-blue" />
                    </div>
                    <Sparkles className="h-4 w-4 text-blue" />
                  </div>
                  <div className="relative mt-3 overflow-hidden rounded-4xl bg-paper">
                    <img
                      src="/assets/campaigns/ratio-source.jpg"
                      alt="Original product source image ready to be transformed into multiple ad formats"
                      className="aspect-[4/5] w-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute inset-x-4 bottom-4 rounded-3xl border border-white/30 bg-white/85 p-4 shadow-soft backdrop-blur">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-blue">Source file</p>
                      <p className="mt-1 text-sm font-semibold text-ink">Summer launch product shot</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {OUTPUT_FORMATS.map((item, i) => (
                <motion.article
                  key={item.label}
                  initial={{ opacity: 0, y: 18, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.55, delay: 0.25 + i * 0.08, ease: "easeOut" }}
                  className={cn(
                    "relative z-10 mt-4 overflow-hidden rounded-4xl border border-line bg-white p-2 shadow-card transition duration-300 hover:-translate-y-1 hover:rotate-0 hover:shadow-lift lg:absolute lg:mt-0 lg:w-[210px]",
                    i === 0 && "lg:-rotate-6",
                    i === 1 && "lg:rotate-5",
                    i === 2 && "lg:rotate-4",
                    i === 3 && "lg:-rotate-3",
                    item.className
                  )}
                >
                  <img
                    src={item.src}
                    alt={`${item.label} variant generated from one source image for ${item.channel}`}
                    className="aspect-[4/3] w-full rounded-3xl object-cover"
                    draggable={false}
                  />
                  <div className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{item.label}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">{item.channel}</p>
                    </div>
                    <span className="rounded-full bg-blue-mist px-2.5 py-1 font-mono text-[10px] text-blue">{item.size}</span>
                  </div>
                </motion.article>
              ))}

              <div className="relative z-20 mx-auto mt-6 max-w-[480px] rounded-4xl border border-line bg-white p-4 shadow-card lg:mt-10">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue text-white shadow-glow">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">AIREA Campaign Builder</p>
                    <p className="text-xs text-ink-3">Generating 32 assets from 1 source</p>
                  </div>
                  <Zap className="ml-auto h-5 w-5 text-blue" />
                </div>
                <div className="mt-4 space-y-2">
                  {["Creative angles", "Ad copy", "Crops + formats"].map((label, i) => (
                    <div key={label} className="rounded-2xl bg-canvas p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-ink-2">
                        <span>{label}</span>
                        <span>{i === 0 ? "100" : i === 1 ? "86" : "72"}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: i === 0 ? "100%" : i === 1 ? "86%" : "72%" }}
                          transition={{ duration: 1, delay: 0.5 + i * 0.15, ease: "easeOut" }}
                          className="h-full rounded-full bg-blue"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-paper py-24 md:py-32">
        <div className="wrap-wide">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <Tag className="mb-5 text-ink-3">The source multiplier</Tag>
              <h2 className="font-display text-[clamp(36px,5vw,68px)] leading-[1] tracking-tight text-ink">
                Stop rebuilding ads
                <br />
                <span className="italic-blue">one placement at a time.</span>
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-2">
                AIREA treats your best source material like campaign clay — reshaping it into the right
                format, message, and creative angle for every channel you need to test.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: ImagePlus, title: "Upload one source", text: "Product photo, lifestyle shot, video still, or raw campaign idea." },
                { icon: Layers3, title: "Generate variants", text: "Different hooks, crops, captions, CTAs, and visual treatments." },
                { icon: Megaphone, title: "Launch as a system", text: "A full ad suite ready for paid, organic, email, and display." },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.article
                    key={item.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                    className="group rounded-4xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-mist text-blue transition group-hover:scale-110 group-hover:bg-blue group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-7 text-xl font-semibold text-ink">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-2">{item.text}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="builder" className="py-24 md:py-32">
        <div className="wrap-wide">
          <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <Tag className="mb-5 text-ink-3">Inside AIREA Campaign Builder</Tag>
              <h2 className="font-display text-[clamp(36px,5vw,68px)] leading-[1] tracking-tight text-ink">
                Brief, build, remix,
                <br />
                <span className="italic-blue">and ship in one flow.</span>
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-2">
                The builder keeps the messy parts connected: strategy, creative direction, generation,
                review, and deployment. No folder maze. No copy-paste Olympics.
              </p>

              <div className="mt-8 grid gap-3">
                {BUILDER_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="rounded-3xl border border-line bg-white p-4 shadow-soft">
                      <div className="flex gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-mist text-blue">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-ink">{card.label}</p>
                          <p className="mt-1 text-sm leading-relaxed text-ink-2">{card.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {BUILDER_STEPS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.article
                    key={item.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.55, delay: i * 0.05, ease: "easeOut" }}
                    className={cn(
                      "group overflow-hidden rounded-4xl border border-line bg-white p-3 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card",
                      i === 2 && "md:col-span-2"
                    )}
                  >
                    <div className="overflow-hidden rounded-3xl bg-canvas">
                      <img
                        src={item.image}
                        alt={`AIREA Campaign Builder screen for ${item.title.toLowerCase()}`}
                        loading="lazy"
                        className={cn(
                          "w-full object-cover object-left-top transition-transform duration-500 group-hover:scale-105",
                          i === 2 ? "aspect-[16/8]" : "aspect-[4/3]"
                        )}
                        draggable={false}
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-blue">Step 0{i + 1}</p>
                        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-mist text-blue">
                          <Icon className="h-5 w-5" />
                        </span>
                      </div>
                      <h3 className="mt-4 text-xl font-semibold text-ink">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-2">{item.body}</p>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ink py-24 text-white md:py-32">
        <div className="wrap-wide">
          <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-end">
            <div>
              <Tag className="mb-5 border-white/10 bg-white/5 text-white/60">Remix lab</Tag>
              <h2 className="font-display text-[clamp(36px,5vw,68px)] leading-[1] tracking-tight text-white">
                Same source.
                <br />
                <span className="font-serif italic text-blue-sky">Different selling angles.</span>
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/65">
                Test a launch angle, a promo angle, and a proof angle without starting from scratch.
                Click the tabs to see how the campaign system changes direction.
              </p>
            </div>

            <div className="rounded-5xl border border-white/10 bg-white/5 p-3 shadow-card backdrop-blur">
              <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="overflow-hidden rounded-4xl bg-white/5">
                  <motion.img
                    key={remix.image}
                    src={remix.image}
                    alt={`${remix.headline} ad remix generated in AIREA`}
                    loading="lazy"
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="h-full min-h-[360px] w-full object-cover"
                    draggable={false}
                  />
                </div>

                <div className="rounded-4xl bg-white p-5 text-ink">
                  <div className="flex flex-wrap gap-2">
                    {REMIXES.map((item, i) => (
                      <button
                        key={item.tab}
                        onClick={() => setActiveRemix(i)}
                        className={cn(
                          "rounded-full px-4 py-2 text-xs font-semibold transition-all",
                          activeRemix === i
                            ? "bg-blue text-white shadow-glow"
                            : "bg-canvas text-ink-2 hover:bg-blue-mist hover:text-blue"
                        )}
                      >
                        {item.tab}
                      </button>
                    ))}
                  </div>

                  <motion.div
                    key={remix.headline}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="mt-8"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-wider text-blue">Generated angle</p>
                    <h3 className="mt-3 font-display text-4xl leading-none tracking-tight text-ink">{remix.headline}</h3>
                    <p className="mt-4 text-base leading-relaxed text-ink-2">{remix.prompt}</p>
                  </motion.div>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {remix.stats.map((stat) => (
                      <div key={stat} className="rounded-3xl border border-line bg-canvas p-4">
                        <CheckCircle2 className="h-4 w-4 text-blue" />
                        <p className="mt-4 text-sm font-semibold text-ink">{stat}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 rounded-4xl bg-ink p-5 text-white">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue text-white">
                        <Sparkles className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">AIREA suggestion</p>
                        <p className="mt-2 text-sm leading-relaxed text-white/65">
                          Keep the visual source consistent, then vary hook, proof point, and CTA so the
                          campaign learns faster in market.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {OUTPUT_FORMATS.map((output, i) => (
              <motion.article
                key={output.src}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                className="group overflow-hidden rounded-4xl border border-white/10 bg-white/5 p-2 shadow-soft backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/10"
              >
                <img
                  src={output.src}
                  alt={`${output.label} generated as part of a one-source AIREA ad set`}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-3xl object-cover transition-transform duration-500 group-hover:scale-105"
                  draggable={false}
                />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{output.label}</p>
                    <Maximize2 className="h-4 w-4 text-blue-sky" />
                  </div>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/45">{output.channel} · {output.size}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="wrap-wide">
          <div className="mx-auto max-w-3xl text-center">
            <Tag className="mb-5 justify-center text-ink-3">Built for everywhere your ads live</Tag>
            <h2 className="font-display text-[clamp(36px,5vw,68px)] leading-[1] tracking-tight text-ink">
              From one idea to
              <br />
              <span className="italic-blue">a channel-ready campaign.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
              AIREA helps you package the same campaign into the formats each platform expects — while
              keeping the creative idea recognizable everywhere.
            </p>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {CHANNELS.map((channel, i) => (
              <motion.span
                key={channel}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.35, delay: i * 0.03, ease: "easeOut" }}
                className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-soft"
              >
                {channel}
              </motion.span>
            ))}
          </div>

          <div className="mt-14 overflow-hidden rounded-5xl border border-line bg-white p-3 shadow-lift">
            <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="relative overflow-hidden rounded-4xl bg-paper">
                <img
                  src="/assets/creatives/wall-of-ads.jpg"
                  alt="A wall of multiple ad creatives generated from one campaign source"
                  loading="lazy"
                  className="h-full min-h-[420px] w-full object-cover"
                  draggable={false}
                />
                <div className="absolute left-5 top-5 rounded-full border border-white/30 bg-white/85 px-4 py-2 text-xs font-semibold text-ink shadow-soft backdrop-blur">
                  32 variants ready to review
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-4xl bg-blue p-6 text-white shadow-glow">
                  <BadgeCheck className="h-7 w-7" />
                  <h3 className="mt-8 text-3xl font-semibold leading-tight">Creative consistency, without creative bottlenecks.</h3>
                  <p className="mt-4 text-sm leading-relaxed text-white/75">
                    AIREA keeps your brand DNA close while giving each placement its own hook, crop, and job.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-4xl border border-line bg-canvas p-5">
                    <Play className="h-5 w-5 text-blue" />
                    <p className="mt-8 text-sm font-semibold text-ink">Video-ready cuts</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-3">Widescreen, reel, and story formats.</p>
                  </div>
                  <div className="rounded-4xl border border-line bg-canvas p-5">
                    <Send className="h-5 w-5 text-blue" />
                    <p className="mt-8 text-sm font-semibold text-ink">Publish-ready copy</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-3">Hooks, captions, CTAs, and headlines.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper py-24 md:py-32">
        <div className="wrap max-w-wrap text-center">
          <div className="mx-auto mb-6 flex w-fit items-center justify-center rounded-full border border-line bg-white p-3 shadow-soft">
            <RobotHead size={86} />
          </div>
          <Tag className="mb-5 justify-center text-ink-3">Campaign Builder concept</Tag>
          <h2 className="font-display text-[clamp(36px,5vw,64px)] leading-[1] text-ink">
            Feed AIREA one source.
            <br />
            <span className="italic-blue">Get the whole campaign back.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
            This hidden landing page is ready to review at /test-2 and is intentionally unlinked from
            the public navigation.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Button href={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow>
              Start building
            </Button>
            <a
              href="#builder"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-4 text-sm font-semibold text-ink shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
            >
              See the builder again
              <ArrowRight className="h-4 w-4 text-blue" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
