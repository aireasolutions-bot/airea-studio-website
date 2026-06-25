import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  ImagePlus,
  Megaphone,
  PenLine,
  Send,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { RobotHead } from "@/components/RobotHead";
import { Button, Tag } from "@/components/ui";
import { SIGN_UP_URL } from "@/lib/site";

const TEAM_ROLES = [
  {
    icon: FileText,
    role: "Strategist",
    title: "Turns messy ideas into a plan",
    body: "AIREA shapes your goals, audience, offer, and timing into a campaign brief you can actually use.",
    image: "/assets/product/campaign-name.png",
  },
  {
    icon: Wand2,
    role: "Creative director",
    title: "Finds the angle fast",
    body: "Generate launch concepts, mood directions, and visual routes without staring at a blank doc.",
    image: "/assets/product/creative-direction.png",
  },
  {
    icon: ImagePlus,
    role: "Designer",
    title: "Builds the assets",
    body: "Create campaign visuals, resize for channels, and keep the look consistent across every touchpoint.",
    image: "/assets/campaigns/nine-grid.jpg",
  },
  {
    icon: Megaphone,
    role: "Media operator",
    title: "Gets work ready to ship",
    body: "Review, edit, export, and publish channel-ready campaigns from one guided workspace.",
    image: "/assets/product/deploy.png",
  },
];

const WEEK_PLAN = [
  {
    day: "Mon",
    title: "Brief the agent",
    body: "Drop in your product, offer, audience, and goal. AIREA turns it into a campaign map.",
  },
  {
    day: "Tue",
    title: "Choose the direction",
    body: "Review creative angles, refine the voice, and approve the route that fits your brand.",
  },
  {
    day: "Wed",
    title: "Generate the kit",
    body: "Build feed ads, stories, social posts, captions, headlines, and variants from the same brief.",
  },
  {
    day: "Thu",
    title: "Edit in context",
    body: "Rewrite copy, adjust visuals, and tighten campaign details without bouncing between tools.",
  },
  {
    day: "Fri",
    title: "Publish with confidence",
    body: "Export or deploy the final campaign assets when everything looks ready to go live.",
  },
];

const PAIN_POINTS = [
  "You are the strategist, copywriter, designer, and publisher.",
  "Every channel wants a different size, caption, angle, and deadline.",
  "Good ideas get stuck because production takes too long.",
];

const OUTPUTS = [
  { src: "/assets/campaigns/ratio-feed.jpg", label: "Feed ad", channel: "Instagram" },
  { src: "/assets/campaigns/ratio-story.jpg", label: "Story creative", channel: "Meta" },
  { src: "/assets/campaigns/ratio-linkedin.jpg", label: "Square post", channel: "Paid social" },
  { src: "/assets/campaigns/ratio-youtube.jpg", label: "Wide asset", channel: "YouTube" },
];

export function Test2() {
  return (
    <div className="overflow-hidden bg-canvas pt-16">
      <section className="relative min-h-screen py-20 md:py-28">
        <div className="bg-blue-radial pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -right-32 top-24 h-96 w-96 rounded-full bg-blue/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-32 bottom-10 h-96 w-96 rounded-full bg-blue-sky/20 blur-3xl" />

        <div className="wrap-wide relative grid min-h-[calc(100vh-8rem)] items-center gap-12 lg:grid-cols-[0.88fr_1.12fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <Tag className="mb-6 text-ink-3">Hidden test page · Marketing team of one</Tag>
            <h1 className="font-display text-[clamp(46px,8vw,104px)] leading-[0.92] tracking-[-0.035em] text-ink">
              A full marketing team,
              <br />
              <span className="italic-blue">for the team of one.</span>
            </h1>
            <p className="mt-7 max-w-xl text-[clamp(17px,1.7vw,22px)] leading-relaxed text-ink-2">
              Plan campaigns, generate creative, write copy, adapt every channel, and publish faster —
              even when the entire marketing department is you.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button href={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow>
                Meet your AI team
              </Button>
              <a
                href="#solo-system"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-ink shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
              >
                See how it works
                <ArrowRight className="h-4 w-4 text-blue" />
              </a>
            </div>

            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ["1", "marketer"],
                ["4", "AI roles"],
                ["All", "channels"],
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
            <div className="absolute -left-6 top-12 z-20 hidden rounded-full border border-line bg-white p-3 shadow-card md:block">
              <RobotHead size={76} />
            </div>

            <div className="overflow-hidden rounded-5xl border border-line bg-ink p-3 shadow-lift">
              <div className="rounded-4xl border border-white/10 bg-white p-3">
                <div className="flex items-center justify-between rounded-3xl bg-paper px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-critical" />
                    <span className="h-3 w-3 rounded-full bg-blue-sky" />
                    <span className="h-3 w-3 rounded-full bg-blue" />
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-3">Solo marketing cockpit</div>
                  <Sparkles className="h-4 w-4 text-blue" />
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[0.38fr_0.62fr]">
                  <aside className="rounded-3xl border border-line bg-canvas p-4">
                    <div className="flex items-center gap-3 rounded-3xl bg-white p-3 shadow-soft">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue text-white shadow-glow">
                        <Bot className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">AIREA team</p>
                        <p className="text-xs text-ink-3">4 roles active</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {["Strategy", "Creative", "Copy", "Publishing"].map((item, i) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-blue" />
                          <span className="text-xs font-medium text-ink-2">{item}</span>
                          <span className="ml-auto font-mono text-[9px] text-ink-3">0{i + 1}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-3xl bg-ink p-4 text-white">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">Next best move</p>
                      <p className="mt-3 text-sm font-semibold leading-snug">Approve the launch angle and generate channel variants.</p>
                    </div>
                  </aside>

                  <div className="rounded-3xl border border-line bg-white p-4 shadow-soft">
                    <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr]">
                      <div className="overflow-hidden rounded-3xl bg-paper">
                        <img
                          src="/assets/product/home-agent.png"
                          alt="AIREA agent workspace helping a solo marketer plan a campaign"
                          className="h-full min-h-[340px] w-full object-cover object-left-top"
                          draggable={false}
                        />
                      </div>
                      <div className="grid gap-3">
                        <div className="rounded-3xl bg-blue p-5 text-white shadow-glow">
                          <div className="flex items-center justify-between">
                            <Tag className="border-white/10 bg-white/10 text-white/70">Live plan</Tag>
                            <Zap className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="mt-6 text-2xl font-semibold leading-tight">
                            Launch the offer without building a bigger team.
                          </h3>
                          <p className="mt-3 text-sm leading-relaxed text-white/75">
                            AIREA is drafting the campaign brief, creative route, ad copy, and asset list in one workspace.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <img
                            src="/assets/product/review.png"
                            alt="AIREA review screen for approving campaign assets"
                            className="aspect-square rounded-3xl object-cover object-left-top shadow-soft"
                            draggable={false}
                          />
                          <img
                            src="/assets/product/publish.png"
                            alt="AIREA publish screen for shipping a campaign"
                            className="aspect-square rounded-3xl object-cover object-left-top shadow-soft"
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

      <section className="bg-paper py-24 md:py-32">
        <div className="wrap-wide">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <Tag className="mb-5 text-ink-3">The solo marketer reality</Tag>
              <h2 className="font-display text-[clamp(36px,5vw,68px)] leading-[1] tracking-tight text-ink">
                Too much to ship.
                <br />
                <span className="italic-blue">Not enough hands.</span>
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-2">
                Small teams do not need another dashboard to babysit. They need a creative operator that
                helps turn the next campaign into finished work.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {PAIN_POINTS.map((point, i) => (
                <motion.div
                  key={point}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                  className="rounded-4xl border border-line bg-white p-6 shadow-soft"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-mist text-blue">
                    <Clock3 className="h-5 w-5" />
                  </span>
                  <p className="mt-6 text-lg font-semibold leading-snug text-ink">{point}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="solo-system" className="py-24 md:py-32">
        <div className="wrap-wide">
          <div className="mx-auto max-w-3xl text-center">
            <Tag className="mb-5 justify-center text-ink-3">Your AI bench</Tag>
            <h2 className="font-display text-[clamp(36px,5vw,68px)] leading-[1] tracking-tight text-ink">
              AIREA fills the seats
              <br />
              <span className="italic-blue">you do not have time to hire.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
              One marketer can move like a full team by keeping strategy, creative production, copy,
              review, and publishing in the same flow.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {TEAM_ROLES.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.role}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                  className="group overflow-hidden rounded-4xl border border-line bg-white p-3 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card"
                >
                  <div className="overflow-hidden rounded-3xl bg-canvas">
                    <img
                      src={item.image}
                      alt={`AIREA acting as a ${item.role.toLowerCase()} for a marketing team of one`}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover object-left-top transition-transform duration-500 group-hover:scale-105"
                      draggable={false}
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-blue">{item.role}</p>
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
      </section>

      <section className="bg-ink py-24 text-white md:py-32">
        <div className="wrap-wide">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <Tag className="mb-5 border-white/10 bg-white/5 text-white/60">Output without the overhead</Tag>
              <h2 className="font-display text-[clamp(36px,5vw,68px)] leading-[1] tracking-tight text-white">
                One brief becomes
                <br />
                <span className="font-serif italic text-blue-sky">a launch-ready campaign.</span>
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/65">
                AIREA creates the building blocks a solo marketer needs most: campaign visuals,
                adapted formats, captions, headlines, and publish-ready assets.
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
                    alt={`${output.label} created by AIREA for ${output.channel}`}
                    loading="lazy"
                    className="w-full rounded-3xl object-cover"
                    draggable={false}
                  />
                  <div className="p-4">
                    <p className="text-sm font-semibold text-white">{output.label}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/45">{output.channel}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>

          <div className="mt-16 overflow-hidden rounded-5xl border border-white/10 bg-white/5 p-3 shadow-card">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              <img
                src="/assets/creatives/wall-of-ads.jpg"
                alt="Wall of campaign ads created for a marketing team of one"
                loading="lazy"
                className="h-full min-h-[360px] w-full rounded-4xl object-cover"
                draggable={false}
              />
              <div className="grid gap-3">
                <img
                  src="/assets/product/control-center.png"
                  alt="AIREA control center for managing solo marketing campaigns"
                  loading="lazy"
                  className="h-full min-h-[170px] w-full rounded-4xl object-cover object-left-top"
                  draggable={false}
                />
                <img
                  src="/assets/product/review-edit-copy.png"
                  alt="AIREA copy editing workflow for campaign review"
                  loading="lazy"
                  className="h-full min-h-[170px] w-full rounded-4xl object-cover object-left-top"
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="wrap-wide">
          <div className="mx-auto max-w-3xl text-center">
            <Tag className="mb-5 justify-center text-ink-3">A practical weekly rhythm</Tag>
            <h2 className="font-display text-[clamp(36px,5vw,68px)] leading-[1] tracking-tight text-ink">
              Keep campaigns moving
              <br />
              <span className="italic-blue">without living in production mode.</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-4 lg:grid-cols-5">
            {WEEK_PLAN.map((item, i) => (
              <motion.article
                key={item.day}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: i * 0.06, ease: "easeOut" }}
                className="rounded-4xl border border-line bg-white p-6 shadow-soft"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-4xl tracking-tight text-blue">{item.day}</span>
                  <CalendarDays className="h-5 w-5 text-ink-3" />
                </div>
                <h3 className="mt-8 text-xl font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{item.body}</p>
              </motion.article>
            ))}
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
            You can stay lean
            <br />
            <span className="italic-blue">and still launch like a team.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
            This page is unlinked from the public navigation. Visit it directly at /test-2 to review
            the marketing team of one concept.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Button href={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow>
              Start with AIREA
            </Button>
            <a
              href="#solo-system"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-6 py-4 text-sm font-semibold text-ink shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
            >
              Revisit the AI team
              <Send className="h-4 w-4 text-blue" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
