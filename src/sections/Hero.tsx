import { lazy, Suspense, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Check, Play, Sparkles } from "lucide-react";

const GradientCanvas = lazy(() =>
  import("@/three/GradientCanvas").then((m) => ({ default: m.GradientCanvas }))
);
import { PhoneFrame } from "@/components/PhoneFrame";
import { RobotHead } from "@/components/RobotHead";
import { Button, Eyebrow } from "@/components/ui";
import { PLATFORMS, SIGN_UP_URL } from "@/lib/site";
import { useC, resolveAsset } from "@/content/ContentProvider";
import { prefersReducedMotion } from "@/lib/gsap";

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function Hero() {
  const c = useC();
  const visualRef = useRef<HTMLDivElement>(null);

  // light mouse parallax on the hero composition
  useEffect(() => {
    const el = visualRef.current;
    if (!el || prefersReducedMotion()) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - (r.left + r.width / 2)) / r.width;
      const py = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.setProperty("--px", String(px));
      el.style.setProperty("--py", String(py));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section
      className="relative overflow-hidden pb-16 pt-28 md:pb-24 md:pt-36"
      style={{
        background:
          "radial-gradient(120% 85% at 50% -8%, #eaf0ff 0%, #f4f6ff 38%, #fafafa 64%)",
      }}
    >
      <Suspense fallback={null}>
        <GradientCanvas />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.4] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />

      <div className="wrap-wide grid items-center gap-12 lg:grid-cols-[1.04fr_0.96fr]">
        {/* copy */}
        <div className="relative z-10 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <Eyebrow>{c("home.hero.eyebrow")}</Eyebrow>
          </motion.div>

          <h1 className="mt-6 font-display text-[clamp(44px,7vw,84px)] leading-[0.98] tracking-[-0.02em] text-ink">
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.08 }}
            >
              {c("home.hero.line1")}
            </motion.span>
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.18 }}
            >
              {c("home.hero.line2_lead")}
              <span className="italic-blue">{c("home.hero.line2_accent")}</span>
              {c("home.hero.line2_tail")}
            </motion.span>
          </h1>

          <motion.p
            className="mt-6 max-w-lg text-[clamp(15px,1.5vw,18px)] text-ink-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
          >
            {c("home.hero.sub")}
          </motion.p>

          <motion.div
            className="mt-9 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.42 }}
          >
            <Button href={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow>
              {c("home.hero.cta_primary")}
            </Button>
            <Button to="/#campaign" variant="ghost" size="lg" iconLeft={<Play className="h-4 w-4 fill-current" />}>
              {c("home.hero.cta_secondary")}
            </Button>
          </motion.div>

          <motion.p
            className="mt-4 flex items-center gap-2 text-[13px] text-ink-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Check className="h-4 w-4 text-blue" />
            {c("home.hero.note")}
          </motion.p>

          {/* trust strip */}
          <motion.div
            className="mt-10 flex items-center gap-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.72 }}
          >
            <span className="tag text-ink-3">Publishes to</span>
            <div className="flex items-center gap-5 grayscale opacity-70">
              {PLATFORMS.map((p) => (
                <img key={p.name} src={p.src} alt={p.name} className="h-5 w-auto" />
              ))}
            </div>
          </motion.div>
        </div>

        {/* visual */}
        <div
          ref={visualRef}
          className="relative z-10 mx-auto aspect-[4/5] w-full max-w-[460px] [perspective:1200px]"
        >
          {/* central phone */}
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{
              transform:
                "translate(calc(-50% + var(--px,0)*-14px), calc(-50% + var(--py,0)*-14px))",
            }}
            initial={{ opacity: 0, y: 40, rotateY: -8 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.35 }}
          >
            <PhoneFrame src={resolveAsset(c("home.hero.phone"))} width={272} />
          </motion.div>

          {/* floating: 9-up grid card */}
          <FloatCard
            className="left-0 top-6"
            depth={26}
            delay={0.6}
          >
            <img
              src="/assets/campaigns/nine-grid.jpg"
              alt="Nine ads from one source"
              className="h-28 w-24 rounded-xl object-cover"
            />
            <Caption>9 ads · 1 source</Caption>
          </FloatCard>

          {/* floating: ratio story */}
          <FloatCard className="right-0 top-24" depth={36} delay={0.78}>
            <img
              src="/assets/campaigns/ratio-story.jpg"
              alt="Auto-sized story creative"
              className="h-32 w-[72px] rounded-xl object-cover"
            />
            <Caption>Auto-sized · 9:16</Caption>
          </FloatCard>

          {/* floating: deployed pill */}
          <motion.div
            className="absolute bottom-12 left-2 z-20"
            style={{
              transform:
                "translate(calc(var(--px,0)*30px), calc(var(--py,0)*30px))",
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.95 }}
          >
            <div className="flex items-center gap-2 rounded-full border border-line bg-white/90 px-3.5 py-2 shadow-card backdrop-blur">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-blue text-white">
                <Check className="h-3 w-3" />
              </span>
              <span className="text-[12.5px] font-semibold text-ink">
                Published to Meta &amp; Instagram
              </span>
            </div>
          </motion.div>

          {/* floating: brand DNA chip */}
          <motion.div
            className="absolute bottom-2 right-6 z-20"
            style={{
              transform:
                "translate(calc(var(--px,0)*-22px), calc(var(--py,0)*-22px))",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: 1.05 }}
          >
            <div className="flex items-center gap-2 rounded-full bg-ink px-3.5 py-2 text-white shadow-lift">
              <Sparkles className="h-3.5 w-3.5 text-blue-sky" />
              <span className="text-[12.5px] font-semibold">On Brand DNA</span>
            </div>
          </motion.div>

          {/* robot */}
          <motion.div
            className="absolute -right-2 -top-2 z-30"
            style={{
              transform:
                "translate(calc(var(--px,0)*40px), calc(var(--py,0)*40px))",
            }}
            initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1], delay: 0.7 }}
          >
            <RobotHead size={108} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FloatCard({
  children,
  className,
  depth,
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  depth: number;
  delay: number;
}) {
  return (
    <motion.div
      className={`absolute z-20 ${className ?? ""}`}
      style={{
        transform: `translate(calc(var(--px,0)*${depth}px), calc(var(--py,0)*${depth}px))`,
      }}
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      <div className="animate-float-y rounded-2xl border border-line bg-white/85 p-1.5 shadow-card backdrop-blur" style={{ animationDelay: `${delay}s` }}>
        {children}
      </div>
    </motion.div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-1 pb-0.5 pt-1.5 text-center text-[10.5px] font-semibold text-ink-2">
      {children}
    </div>
  );
}
