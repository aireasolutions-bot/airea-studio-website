import { motion } from "framer-motion";
import { ArrowDownRight, BadgeCheck, Image, Layers3, Megaphone, Ratio, Sparkles } from "lucide-react";
import { RobotHead } from "@/components/RobotHead";
import { Button, Tag } from "@/components/ui";
import { SIGN_UP_URL } from "@/lib/site";

const WORLDS = [
  { src: "/assets/campaigns/worlds/w1.jpg", label: "Track launch", channel: "Meta" },
  { src: "/assets/campaigns/worlds/w2.jpg", label: "City commute", channel: "Instagram" },
  { src: "/assets/campaigns/worlds/w3.jpg", label: "Studio detail", channel: "Google" },
  { src: "/assets/campaigns/worlds/w4.jpg", label: "Beach lifestyle", channel: "Story" },
  { src: "/assets/campaigns/worlds/w5.jpg", label: "Gym energy", channel: "Reel" },
  { src: "/assets/campaigns/worlds/w6.jpg", label: "Café moment", channel: "Feed" },
  { src: "/assets/campaigns/worlds/w7.jpg", label: "Trail proof", channel: "YouTube" },
  { src: "/assets/campaigns/worlds/w8.jpg", label: "Interior mood", channel: "LinkedIn" },
  { src: "/assets/campaigns/worlds/w9.jpg", label: "Hero product", channel: "Shop" },
];

const RATIOS = [
  { src: "/assets/campaigns/ratio-feed.jpg", label: "4:5 Feed", size: "Instagram + Facebook" },
  { src: "/assets/campaigns/ratio-story.jpg", label: "9:16 Story", size: "Reels + Stories" },
  { src: "/assets/campaigns/ratio-linkedin.jpg", label: "1:1 Square", size: "LinkedIn + Paid social" },
  { src: "/assets/campaigns/ratio-youtube.jpg", label: "16:9 Wide", size: "YouTube + Display" },
];

const DELIVERABLES = [
  {
    icon: Image,
    title: "Visual worlds",
    body: "AIREA keeps the product consistent while creating fresh campaign scenes around it.",
  },
  {
    icon: Ratio,
    title: "Native ratios",
    body: "Every output is composed for the surface it ships to — no awkward crops or stretched ads.",
  },
  {
    icon: Megaphone,
    title: "Ad angles",
    body: "Launch, lifestyle, proof, urgency, offer, and retargeting concepts from the same source asset.",
  },
  {
    icon: Layers3,
    title: "Full campaign set",
    body: "Static ads, social posts, story creative, captions, headlines, and channel-ready variants.",
  },
];

export function Test() {
  return (
    <div className="overflow-hidden bg-canvas pt-16">
      <section className="relative min-h-screen py-20 md:py-28">
        <div className="bg-blue-radial pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 top-28 h-px bg-line" />
        <div className="wrap-wide relative grid min-h-[calc(100vh-8rem)] items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <Tag className="mb-6 text-ink-3">Hidden build test · One source image</Tag>
            <h1 className="font-display text-[clamp(46px,8vw,104px)] leading-[0.92] tracking-[-0.03em] text-ink">
              One product photo.
              <br />
              <span className="italic-blue">A thousand ad directions.</span>
            </h1>
            <p className="mt-7 max-w-xl text-[clamp(17px,1.7vw,22px)] leading-relaxed text-ink-2">
              This page stress-tests the AIREA promise: upload one clean source image and let the
              studio generate a visual campaign system across worlds, ratios, platforms, and messages.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button href={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow>
                Turn one image into ads
              </Button>
              <div className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-3 shadow-soft">
                <Sparkles className="h-4 w-4 text-blue" />
                <span className="font-mono text-[12px] uppercase tracking-wider text-ink-2">
                  Source → campaign set
                </span>
              </div>
            </div>
          </motion.div>

          <div className="relative mx-auto w-full max-w-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: -2 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="relative z-20 w-[58%] overflow-hidden rounded-4xl border border-line bg-white p-2 shadow-card"
            >
              <img
                src="/assets/campaigns/shoe-source.jpg"
                alt="Original source product photo of a sneaker"
                className="aspect-[4/5] w-full rounded-3xl object-cover"
                draggable={false}
              />
              <div className="flex items-center justify-between px-3 py-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Input</span>
                <span className="rounded-full bg-blue-mist px-3 py-1 text-[12px] font-semibold text-blue-ink">
                  1 source image
                </span>
              </div>
            </motion.div>

            <div className="absolute left-[45%] top-[44%] z-30 hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-2 shadow-soft md:flex">
              <RobotHead size={54} />
              <ArrowDownRight className="h-5 w-5 text-blue" />
            </div>

            {WORLDS.slice(0, 6).map((world, i) => (
              <motion.div
                key={world.src}
                initial={{ opacity: 0, y: 28, rotate: i % 2 ? 4 : -4 }}
                animate={{ opacity: 1, y: 0, rotate: i % 2 ? 4 : -4 }}
                transition={{ duration: 0.65, delay: 0.18 + i * 0.07, ease: "easeOut" }}
                className="absolute overflow-hidden rounded-3xl border border-line bg-white p-1.5 shadow-card"
                style={{
                  width: ["34%", "31%", "29%", "33%", "27%", "30%"][i],
                  right: ["2%", "18%", "0%", "8%", "33%", "4%"][i],
                  top: ["0%", "19%", "38%", "61%", "73%", "82%"][i],
                  zIndex: 10 - i,
                }}
              >
                <img
                  src={world.src}
                  alt={`${world.label} ad variation generated from the source sneaker photo`}
                  className="aspect-square rounded-2xl object-cover object-top"
                  draggable={false}
                />
                <div className="flex items-center justify-between px-2 py-2">
                  <span className="text-[12px] font-semibold text-ink">{world.label}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-blue">{world.channel}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-paper py-24 md:py-32">
        <div className="wrap-wide">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <Tag className="mb-5 text-ink-3">Visual expansion</Tag>
              <h2 className="font-display text-[clamp(36px,5vw,66px)] leading-[1] text-ink">
                Same product.
                <br />
                <span className="italic-blue">Nine campaign worlds.</span>
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-2">
                AIREA can remix the context around a single product shot, creating enough variety
                to test messages, audiences, seasons, and channels without booking another shoot.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
              {WORLDS.map((world, i) => (
                <motion.article
                  key={world.src}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.55, delay: i * 0.035, ease: "easeOut" }}
                  className="group overflow-hidden rounded-3xl border border-line bg-white p-2 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
                >
                  <img
                    src={world.src}
                    alt={`${world.label} campaign world generated from one source image`}
                    loading="lazy"
                    className="aspect-square w-full rounded-2xl object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    draggable={false}
                  />
                  <div className="flex items-center justify-between px-2 py-3">
                    <span className="text-sm font-semibold text-ink">{world.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                      {String(i + 1).padStart(2, "0")}
                    </span>
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
            <Tag className="mb-5 justify-center text-ink-3">Format engine</Tag>
            <h2 className="font-display text-[clamp(36px,5vw,66px)] leading-[1] text-ink">
              Built for every <span className="italic-blue">surface</span>, not just resized.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
              Each ad is recomposed for the destination so the product, message, and call-to-action
              feel native wherever the campaign appears.
            </p>
          </div>

          <div className="mt-14 grid items-end gap-5 md:grid-cols-4">
            {RATIOS.map((ratio, i) => (
              <motion.article
                key={ratio.src}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                className="overflow-hidden rounded-4xl border border-line bg-white p-2 shadow-card"
              >
                <div className="overflow-hidden rounded-3xl bg-paper">
                  <img
                    src={ratio.src}
                    alt={`${ratio.label} ad layout generated from one source image`}
                    loading="lazy"
                    className="w-full object-cover"
                    draggable={false}
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-blue" />
                    <h3 className="font-semibold text-ink">{ratio.label}</h3>
                  </div>
                  <p className="mt-1 text-sm text-ink-3">{ratio.size}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-24 text-white md:py-32">
        <div className="wrap-wide">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <Tag className="mb-5 text-white/60">What AIREA creates</Tag>
              <h2 className="font-display text-[clamp(36px,5vw,66px)] leading-[1] text-white">
                From source file to <span className="font-serif italic text-blue-sky">campaign system</span>.
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/65">
                One image becomes a full set of platform-ready assets with distinct creative
                concepts, consistent product identity, and campaign-ready messaging.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {DELIVERABLES.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                    className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue text-white shadow-glow">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/60">{item.body}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="mt-16 overflow-hidden rounded-5xl border border-white/10 bg-white/5 p-3 shadow-card">
            <div className="grid gap-3 md:grid-cols-[1.25fr_0.75fr]">
              <img
                src="/assets/campaigns/nine-grid.jpg"
                alt="Grid of multiple ad concepts generated from one product image"
                loading="lazy"
                className="h-full min-h-[320px] w-full rounded-4xl object-cover"
                draggable={false}
              />
              <div className="grid gap-3">
                <img
                  src="/assets/campaigns/proof-grid.jpg"
                  alt="Proof-style campaign ad variations"
                  loading="lazy"
                  className="h-full min-h-[150px] w-full rounded-4xl object-cover"
                  draggable={false}
                />
                <img
                  src="/assets/campaigns/robot-cta.jpg"
                  alt="AIREA campaign call-to-action creative"
                  loading="lazy"
                  className="h-full min-h-[150px] w-full rounded-4xl object-cover"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="wrap max-w-wrap text-center">
          <div className="mx-auto mb-6 flex w-fit items-center justify-center rounded-full border border-line bg-white p-3 shadow-soft">
            <RobotHead size={86} />
          </div>
          <Tag className="mb-5 justify-center text-ink-3">Hidden page complete</Tag>
          <h2 className="font-display text-[clamp(36px,5vw,64px)] leading-[1] text-ink">
            One image is enough to start.
            <br />
            <span className="italic-blue">AIREA handles the campaign lift.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
            This test page is intentionally unlinked from the public navigation. Visit it directly at
            /test whenever you want to review the visual experience.
          </p>
          <div className="mt-9">
            <Button href={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow>
              Start building campaigns
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
