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

        {/* visual — anchored to the phone so it scales cleanly on every screen */}
        <div
          ref={visualRef}
          className="relative z-10 mx-auto mt-10 w-fit [perspective:1200px] lg:mt-0"
        >
          <span
            className="pointer-events-none absolute inset-0 -z-10 scale-[1.6] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(0,71,255,0.12), transparent 60%)" }}
          />

          <motion.div
            className="relative w-[230px] sm:w-[258px] lg:w-[272px]"
            style={{ transform: "translate(calc(var(--px,0)*-10px), calc(var(--py,0)*-10px))" }}
            initial={{ opacity: 0, y: 40, rotateY: -8 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 0.35 }}
          >
            <PhoneFrame src={resolveAsset(c("home.hero.phone"))} width="100%" />

            {/* robot — top-right, kept within horizontal bounds */}
            <motion.div
              className="absolute -top-9 right-0 z-30"
              style={{ transform: "translate(calc(var(--px,0)*34px), calc(var(--py,0)*34px))" }}
              initial={{ opacity: 0, scale: 0.6, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.9, ease: [0.34, 1.56, 0.64, 1], delay: 0.7 }}
            >
              <RobotHead size={96} />
            </motion.div>

            {/* brand DNA chip */}
            <motion.div
              className="absolute left-0 top-12 z-20"
              style={{ transform: "translate(calc(var(--px,0)*-16px), calc(var(--py,0)*-16px))" }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: EASE, delay: 1.05 }}
            >
              <div className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-white shadow-lift">
                <Sparkles className="h-3.5 w-3.5 text-blue-sky" />
                <span className="text-[11.5px] font-semibold">On Brand DNA</span>
              </div>
            </motion.div>

            {/* deployed pill — flex-centered under the phone */}
            <motion.div
              className="absolute -bottom-4 inset-x-0 z-20 flex justify-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.95 }}
            >
              <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white/95 px-3.5 py-2 shadow-card backdrop-blur">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-blue text-white">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-[12px] font-semibold text-ink">Published to Meta &amp; Instagram</span>
              </div>
            </motion.div>

            {/* side image cards — desktop only (room in the 2-col layout) */}
            <FloatCard className="-left-24 top-8 hidden lg:block" depth={26} delay={0.6}>
              <img src="/assets/campaigns/nine-grid.jpg" alt="Nine ads from one source" className="h-28 w-24 rounded-xl object-cover" />
              <Caption>9 ads · 1 source</Caption>
            </FloatCard>
            <FloatCard className="-right-20 top-1/3 hidden lg:block" depth={36} delay={0.78}>
              <img src="/assets/campaigns/ratio-story.jpg" alt="Auto-sized story creative" className="h-32 w-[72px] rounded-xl object-cover" />
              <Caption>Auto-sized · 9:16</Caption>
            </FloatCard>
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
