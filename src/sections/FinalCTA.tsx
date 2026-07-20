import { Check } from "lucide-react";
import { CtaButton } from "@/components/ui";
import { RobotHead } from "@/components/RobotHead";
import { Reveal } from "@/components/Reveal";
import { SIGN_UP_URL } from "@/lib/site";
import { useC, editable } from "@/content/ContentProvider";

export function FinalCTA() {
  const c = useC();
  return (
    <section id="cta" className="px-4 py-16 md:py-24">
      <div className="wrap-wide">
        <Reveal>
          <div
            className="noise relative overflow-hidden rounded-[40px] px-6 py-20 text-center md:px-16 md:py-28"
            style={{
              background:
                "radial-gradient(120% 120% at 50% 0%, #2E6BFF 0%, #0047FF 45%, #0036C4 100%)",
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.12] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

            <div className="relative mx-auto max-w-3xl">
              <div className="mb-8 flex justify-center">
                <RobotHead size={120} />
              </div>
              <h2 className="font-display text-[clamp(34px,6vw,68px)] leading-[1.02] tracking-[-0.01em] text-white">
                <span {...editable("home.cta.line1")}>{c("home.cta.line1")}</span>
                <br />
                <span className="font-display italic text-white/90" {...editable("home.cta.line2")}>
                  {c("home.cta.line2")}
                </span>
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-[clamp(15px,1.6vw,18px)] text-white/75" {...editable("home.cta.sub", "richtext")}>
                {c("home.cta.sub")}
              </p>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <CtaButton
                  k="home.cta.primary"
                  defaultLabel="Start 14-day free trial"
                  defaultHref={SIGN_UP_URL}
                  variant="ghost"
                  size="lg"
                  magnetic
                  arrow
                  className="border-transparent bg-white text-ink shadow-lift hover:bg-white"
                />
                <CtaButton
                  k="home.cta.secondary"
                  defaultLabel="See how it works"
                  defaultHref="/how-it-works"
                  variant="ghost"
                  size="lg"
                  className="border-white/40 bg-transparent text-white hover:border-white hover:bg-white/10"
                />
              </div>

              <p className="mt-5 flex items-center justify-center gap-2 text-[13px] text-white/70" {...editable("home.cta.note")}>
                <Check className="h-4 w-4" />
                {c("home.cta.note")}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
