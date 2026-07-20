import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PhoneFrame } from "@/components/PhoneFrame";
import { SectionHeading } from "@/components/ui";
import { cn } from "@/lib/cn";
import { STEPS } from "@/lib/site";
import { useC, resolveAsset, editable } from "@/content/ContentProvider";

export function HowItWorks() {
  const c = useC();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActive(idx);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="how" className="relative py-24 md:py-32">
      <div className="wrap-wide">
        <SectionHeading
          tag={<span {...editable("home.howitworks.tag")}>{c("home.howitworks.tag", "How it works")}</span>}
          title={
            <>
              <span {...editable("home.howitworks.title_lead")}>{c("home.howitworks.title_lead", "From brand to ")}</span>
              <span className="italic-blue" {...editable("home.howitworks.title_accent")}>{c("home.howitworks.title_accent", "published")}</span>
              <span {...editable("home.howitworks.title_tail")}>{c("home.howitworks.title_tail", ", in one flow.")}</span>
            </>
          }
          sub={<span {...editable("home.howitworks.sub", "richtext")}>{c("home.howitworks.sub", "Six steps. One canvas. Studio keeps you in the loop and does the heavy lifting in between.")}</span>}
        />

        <div className="mt-16 grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* sticky media (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-24 flex h-[78vh] items-center justify-center">
              <div className="relative">
                <span
                  className="absolute inset-0 -z-10 rounded-[3rem] blur-3xl"
                  style={{
                    background:
                      "radial-gradient(circle at 50% 40%, rgb(var(--c-blue)/0.22), transparent 65%)",
                  }}
                />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 20, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16, scale: 0.97 }}
                    transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
                  >
                    <PhoneFrame src={resolveAsset(c(`home.howitworks.step${active}.image`, STEPS[active].image))} width={300} />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute -left-6 bottom-10 rounded-2xl border border-line bg-white/90 px-4 py-2.5 shadow-card backdrop-blur">
                  <span className="font-mono text-[11px] tracking-wider text-blue">
                    <span {...editable("home.howitworks.step_label")}>{c("home.howitworks.step_label", "STEP")}</span> {STEPS[active].n}
                  </span>
                  <div className="text-[13px] font-semibold text-ink" {...editable(`home.howitworks.step${active}.title`)}>
                    {c(`home.howitworks.step${active}.title`, STEPS[active].title)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* steps */}
          <div>
            {STEPS.map((step, i) => (
              <div
                key={step.key}
                data-idx={i}
                ref={(el) => (refs.current[i] = el)}
                className="border-b border-line py-10 lg:min-h-[58vh] lg:flex lg:flex-col lg:justify-center lg:border-0 lg:py-0"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-full font-mono text-[13px] font-semibold transition-colors",
                      active === i
                        ? "bg-blue text-white"
                        : "bg-blue-mist text-blue-ink"
                    )}
                  >
                    {step.n}
                  </span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <h3
                  className={cn(
                    "mt-5 font-display text-[clamp(26px,3.4vw,40px)] leading-tight transition-colors",
                    active === i ? "text-ink" : "text-ink/45 lg:text-ink/35"
                  )}
                  {...editable(`home.howitworks.step${i}.title`)}
                >
                  {c(`home.howitworks.step${i}.title`, step.title)}
                </h3>
                <p
                  className={cn(
                    "mt-3 max-w-md text-[15px] transition-colors",
                    active === i ? "text-ink-2" : "text-ink-3"
                  )}
                  {...editable(`home.howitworks.step${i}.body`)}
                >
                  {c(`home.howitworks.step${i}.body`, step.body)}
                </p>
                {/* inline media on mobile */}
                <div className="mt-7 lg:hidden">
                  <PhoneFrame src={resolveAsset(c(`home.howitworks.step${i}.image`, step.image))} width={260} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
