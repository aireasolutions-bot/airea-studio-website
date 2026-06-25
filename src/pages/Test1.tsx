import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarCheck,
  CheckCircle2,
  ImagePlus,
  Layers3,
  Megaphone,
  PenLine,
  Play,
  Sparkles,
  Wand2,
} from "lucide-react";
import { RobotHead } from "@/components/RobotHead";
import { Button, Tag } from "@/components/ui";
import { SIGN_UP_URL } from "@/lib/site";

const BUILDER_STEPS = [
  {
    n: "01",
    icon: PenLine,
    title: "Name the campaign",
    body: "Tell AIREA the goal, audience, product, and offer. The builder turns a rough idea into a structured campaign brief.",
    image: "/assets/product/campaign-name.png",
    label: "Campaign brief",
  },
  {
    n: "02",
    icon: ImagePlus,
    title: "Add source assets",
    body: "Upload a product photo, choose brand visuals, or pull from your asset library so every output starts with the right ingredients.",
    image: "/assets/campaigns/source-shoe.jpg",
    label: "Source image",
  },
  {
    n: "03",
    icon: Wand2,
    title: "Set creative direction",
    body: "Pick a mood, describe a look, or let the agent propose concepts that match your Brand DNA.",
    image: "/assets/product/creative-direction.png",
    label: "Direction",
  },
  {
    n: "04",
    icon: Megaphone,
    title: "Choose channels",
    body: "Build for Meta, Instagram, Google, email, and web from the same campaign idea — with native copy and ratios for each surface.",
    image: "/assets/product/media-meta.png",
    label: "Channels",
  },
];

const OUTPUTS = [
  { src: "/assets/campaigns/ratio-feed.jpg", title: "4:5 feed ad", channel: "Instagram" },
  { src: "/assets/campaigns/ratio-story.jpg", title: "9:16 story", channel: "Meta" },
  { src: "/assets/campaigns/ratio-linkedin.jpg", title: "1:1 paid social", channel: "LinkedIn" },
  { src: "/assets/campaigns/ratio-youtube.jpg", title: "16:9 video frame", channel: "YouTube" },
];

const BUILDER_RAIL = [
  "Brand DNA loaded",
  "Offer angles drafted",
  "Creative concepts generated",
  "Copy adapted by channel",
  "Assets ready for review",
];

const REVIEW_CARDS = [
  {
    title: "Edit image with a prompt",
    body: "Swap backgrounds, tune composition, or generate a fresh variation without leaving the campaign canvas.",
    image: "/assets/product/review-edit-image.png",
  },
  {
    title: "Tighten copy in context",
    body: "Rewrite hooks, headlines, and CTAs while seeing exactly where the message will ship.",
    image: "/assets/product/review-edit-copy.png",
  },
  {
    title: "Approve and publish",
    body: "Move from draft to scheduled campaign with channel-ready exports and one-click publishing.",
    image: "/assets/product/publish.png",
  },
];

export function Test1() {
  return (
    <div className="overflow-hidden bg-canvas pt-16">
      <section className="relative min-h-screen py-20 md:py-28">
        <div className="bg-blue-radial pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -right-24 top-32 h-80 w-80 rounded-full bg-blue/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-16 h-80 w-80 rounded-full bg-blue-sky/20 blur-3xl" />

        <div className="wrap-wide relative grid min-h-[calc(100vh-8rem)] items-center gap-12 lg:grid-cols-[0.88fr_1.12fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <Tag className="mb-6 text-ink-3">Hidden test page · Campaign builder</Tag>
            <h1 className="font-display text-[clamp(46px,8vw,104px)] leading-[0.92] tracking-[-0.035em] text-ink">
              Build a campaign
              <br />
              <span className="italic-blue">without the blank canvas.</span>
            </h1>
            <p className="mt-7 max-w-xl text-[clamp(17px,1.7vw,22px)] leading-relaxed text-ink-2">
              A focused test page for the AIREA campaign builder: brief the agent, load your assets,
              choose channels, generate creative, review everything, and publish from one guided flow.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button href={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow>
                Start a campaign
              </Button>
              <a
                href="#builder"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
              >
                See the builder
                <ArrowRight className="h-4 w-4 text-blue" />
              </a>
            </div>

            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ["90s", "first draft"],
                ["9+", "channel outputs"],
                ["1", "guided workspace"],
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
            <div className="absolute -left-6 top-10 z-20 hidden rounded-full border border-line bg-white p-3 shadow-card md:block">
              <RobotHead size={74} />
            </div>

            <div className="overflow-hidden rounded-5xl border border-line bg-ink p-3 shadow-lift">
              <div className="rounded-4xl border border-white/10 bg-white p-3">
                <div className="flex items-center justify-between rounded-3xl bg-paper px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-critical" />
                    <span className="h-3 w-3 rounded-full bg-blue-sky" />
                    <span className="h-3 w-3 rounded-full bg-blue" />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">AIREA Builder</div>
                  <Sparkles className="h-4 w-4 text-blue" />
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[0.36fr_0.64fr]">
                  <aside className="rounded-3xl border border-line bg-canvas p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue text-white shadow-glow">
                        <Bot className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">Summer sneaker drop</p>
                        <p className="text-xs text-ink-3">Campaign in progress</p>
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {BUILDER_RAIL.map((item, i) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-blue" />
                          <span className="text-xs font-medium text-ink-2">{item}</span>
                          <span className="ml-auto font-mono text-[9px] text-ink-3">0{i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </aside>

                  <div className="rounded-3xl border border-line bg-white p-4 shadow-soft">
                    <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
                      <div className="overflow-hidden rounded-3xl bg-paper">
                        <img
                          src="/assets/product/creative-generate.png"
                          alt="AIREA campaign builder generating creative concepts"
                          className="h-full min-h-[330px] w-full object-cover object-left-top"
                          draggable={false}
                        />
                      </div>
                      <div className="grid gap-3">
                        <div className="rounded-3xl bg-ink p-5 text-white">
                          <div className="flex items-center justify-between">
                            <Tag className="border-white/10 bg-white/10 text-white/65">Agent plan</Tag>
                            <Play className="h-5 w-5 text-blue-sky" />
                          </div>
                          <h3 className="mt-6 text-2xl font-semibold leading-tight">
                            Generate a launch kit for runners, commuters, and gym audiences.
                          </h3>
                          <p className="mt-3 text-sm leading-relaxed text-white/60">
                            AIREA is creating three creative angles, four ratios, and channel-specific
                            captions from the same campaign brief.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <img
                            src="/assets/campaigns/worlds/w1.jpg"
                            alt="Generated running track campaign concept"
                            className="aspect-square rounded-3xl object-cover object-top shadow-soft"
                            draggable={false}
                          />
                          <img
                            src="/assets/campaigns/worlds/w5.jpg"
                            alt="Generated gym campaign concept"
                            className="aspect-square rounded-3xl object-cover object-top shadow-soft"
                            draggable={false}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="builder" className="bg-paper py-24 md:py-32">
        <div className="wrap-wide">
          <div className="mx-auto max-w-3xl text-center">
            <Tag className="mb-5 justify-center text-ink-3">Guided workflow</Tag>
            <h2 className="font-display text-[clamp(36px,5vw,68px)] leading-[1] tracking-tight text-ink">
              Every step is designed to keep momentum.
              <br />
              <span className="italic-blue">No scattered tools.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
              The builder moves from campaign setup to asset generation in one workspace, so teams
              can make decisions faster and keep the brand consistent.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {BUILDER_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.article
                  key={step.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                  className="group overflow-hidden rounded-4xl border border-line bg-white p-3 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
                >
                  <div className="overflow-hidden rounded-3xl bg-canvas">
                    <img
                      src={step.image}
                      alt={`${step.title} step in the AIREA campaign builder`}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover object-left-top transition-transform duration-500 group-hover:scale-105"
                      draggable={false}
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-blue">{step.n}</span>
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-mist text-blue">
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                    <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-ink-3">{step.label}</p>
                    <h3 className="mt-2 text-xl font-semibold text-ink">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.body}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="wrap-wide">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
            <div>
              <Tag className="mb-5 text-ink-3">Generation canvas</Tag>
              <h2 className="font-display text-[clamp(36px,5vw,68px)] leading-[1] tracking-tight text-ink">
                One brief becomes a complete
                <span className="italic-blue"> campaign board.</span>
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-2">
                AIREA turns the approved direction into platform-native creative, copy, and variants —
                then lays them out so the whole campaign is easy to judge at once.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "Launch, lifestyle, proof, and retargeting angles",
                  "Headlines and captions matched to each channel",
                  "Ratios composed for feed, story, square, and wide placements",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft">
                    <BadgeCheck className="h-5 w-5 shrink-0 text-blue" />
                    <span className="text-sm font-medium text-ink-2">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="overflow-hidden rounded-5xl border border-line bg-white p-3 shadow-card"
            >
              <div className="grid gap-3 md:grid-cols-[1.25fr_0.75fr]">
                <img
                  src="/assets/campaigns/nine-grid.jpg"
                  alt="AIREA campaign board showing multiple ad concepts generated from one brief"
                  loading="lazy"
                  className="h-full min-h-[360px] w-full rounded-4xl object-cover"
                  draggable={false}
                />
                <div className="grid gap-3">
                  <img
                    src="/assets/campaigns/proof-grid.jpg"
                    alt="Campaign proof ad variations inside the AIREA builder"
                    loading="lazy"
                    className="h-full min-h-[170px] w-full rounded-4xl object-cover"
                    draggable={false}
                  />
                  <img
                    src="/assets/campaigns/wall-of-ads.jpg"
                    alt="Wall of campaign ads generated by AIREA"
                    loading="lazy"
                    className="h-full min-h-[170px] w-full rounded-4xl object-cover"
                    draggable={false}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-ink py-24 text-white md:py-32">
        <div className="wrap-wide">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <Tag className="mb-5 border-white/10 bg-white/5 text-white/60">Channel-ready outputs</Tag>
              <h2 className="font-display text-[clamp(36px,5vw,68px)] leading-[1] tracking-tight text-white">
                Not resized.
                <br />
                <span className="font-serif italic text-blue-sky">Rebuilt for the placement.</span>
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/65">
                The campaign builder keeps the idea consistent while adapting composition, message,
                and CTA for each destination.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {OUTPUTS.map((output, i) => (
                <motion.article
                  key={output.src}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                  className="overflow-hidden rounded-4xl border border-white/10 bg-white/5 p-2 shadow-soft backdrop-blur"
                >
                  <img
                    src={output.src}
                    alt={`${output.title} generated for ${output.channel}`}
                    loading="lazy"
                    className="w-full rounded-3xl object-cover"
                    draggable={false}
                  />
                  <div className="p-4">
                    <p className="text-sm font-semibold text-white">{output.title}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/45">{output.channel}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="wrap-wide">
          <div className="mx-auto max-w-3xl text-center">
            <Tag className="mb-5 justify-center text-ink-3">Review, edit, ship</Tag>
            <h2 className="font-display text-[clamp(36px,5vw,68px)] leading-[1] tracking-tight text-ink">
              The builder stays useful after generation.
              <br />
              <span className="italic-blue">That’s where the campaign gets better.</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {REVIEW_CARDS.map((card, i) => (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                className="overflow-hidden rounded-4xl border border-line bg-white p-3 shadow-soft"
              >
                <img
                  src={card.image}
                  alt={`${card.title} in the AIREA campaign builder`}
                  loading="lazy"
                  className="aspect-[16/11] w-full rounded-3xl object-cover object-left-top"
                  draggable={false}
                />
                <div className="p-5">
                  <h3 className="text-xl font-semibold text-ink">{card.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">{card.body}</p>
                </div>
              </motion.article>
            ))}
          </div>

          <div className="mt-14 overflow-hidden rounded-5xl border border-line bg-white p-3 shadow-card">
            <div className="grid gap-3 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="rounded-4xl bg-paper p-8">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue text-white shadow-glow">
                  <CalendarCheck className="h-6 w-6" />
                </span>
                <h3 className="mt-8 text-3xl font-semibold tracking-tight text-ink">Ready to publish</h3>
                <p className="mt-3 text-ink-2">
                  Final approvals, channel exports, and publishing controls live beside the campaign assets.
                </p>
                <div className="mt-7">
                  <Button href={SIGN_UP_URL} variant="primary" magnetic arrow>
                    Build yours
                  </Button>
                </div>
              </div>
              <img
                src="/assets/product/deploy.png"
                alt="AIREA deploy screen for publishing campaign assets"
                loading="lazy"
                className="h-full min-h-[340px] w-full rounded-4xl object-cover object-left-top"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper py-24 md:py-32">
        <div className="wrap max-w-wrap text-center">
          <div className="mx-auto mb-6 flex w-fit items-center justify-center rounded-full border border-line bg-white p-3 shadow-soft">
            <RobotHead size={86} />
          </div>
          <Tag className="mb-5 justify-center text-ink-3">Hidden page complete</Tag>
          <h2 className="font-display text-[clamp(36px,5vw,64px)] leading-[1] text-ink">
            Campaign building should feel guided,
            <br />
            <span className="italic-blue">not like project management.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
            This page is unlinked from the public navigation. Visit it directly at /test-1 to review
            the campaign builder concept.
          </p>
        </div>
      </section>
    </div>
  );
}
