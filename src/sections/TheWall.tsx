import { motion } from "framer-motion";
import { Activity, BarChart3, Eye } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { SectionHeading } from "@/components/ui";
import { Reveal } from "@/components/Reveal";

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function TheWall() {
  return (
    <section id="wall" className="relative overflow-hidden bg-paper py-24 md:py-32">
      <div className="bg-blue-radial pointer-events-none absolute inset-0" />
      <div className="wrap-wide relative grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <SectionHeading
            tag="The Wall"
            title={
              <>
                Every post and result, <span className="italic-blue">one wall</span>.
              </>
            }
            sub="Preview how a campaign performs across every social platform before and after it ships. Switch on God Mode to see it all at a glance."
          />
          <Reveal className="mt-8 flex flex-col gap-3" delay={0.1}>
            {[
              { icon: Eye, t: "Live previews", d: "See exactly how each post renders per platform." },
              { icon: BarChart3, t: "Performance at a glance", d: "Reach, engagement and results in one view." },
              { icon: Activity, t: "Always on", d: "Your whole presence, monitored in real time." },
            ].map((r) => (
              <div key={r.t} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-blue shadow-soft">
                  <r.icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <div className="text-[15px] font-semibold text-ink">{r.t}</div>
                  <div className="text-[14px] text-ink-2">{r.d}</div>
                </div>
              </div>
            ))}
          </Reveal>
        </div>

        <div className="relative mx-auto">
          <span
            className="absolute inset-0 -z-10 rounded-[3rem] blur-3xl"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, rgba(0,71,255,0.2), transparent 65%)",
            }}
          />
          <Reveal>
            <PhoneFrame src="/assets/product/wall.png" width={300} />
          </Reveal>

          <motion.div
            className="absolute -left-6 top-16 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-card backdrop-blur"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
              Engagement
            </div>
            <div className="font-display text-2xl text-ink">
              +38<span className="text-blue">%</span>
            </div>
          </motion.div>

          <motion.div
            className="absolute -right-4 bottom-20 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-card backdrop-blur"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.45 }}
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
              Reach this week
            </div>
            <div className="font-display text-2xl text-ink">128k</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
