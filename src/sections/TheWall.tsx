import { motion } from "framer-motion";
import { Activity, BarChart3, Eye } from "lucide-react";
import { PhoneFrame } from "@/components/PhoneFrame";
import { SectionHeading } from "@/components/ui";
import { Reveal } from "@/components/Reveal";
import { useC, resolveAsset, editable } from "@/content/ContentProvider";

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function TheWall() {
  const c = useC();
  const features = [
    { icon: Eye, t: "Live previews", d: "See exactly how each post renders per platform." },
    { icon: BarChart3, t: "Performance at a glance", d: "Reach, engagement and results in one view." },
    { icon: Activity, t: "Always on", d: "Your whole presence, monitored in real time." },
  ];
  return (
    <section id="wall" className="relative overflow-hidden bg-paper py-24 md:py-32">
      <div className="bg-blue-radial pointer-events-none absolute inset-0" />
      <div className="wrap-wide relative grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <SectionHeading
            tag={<span {...editable("home.wall.tag")}>{c("home.wall.tag")}</span>}
            title={
              <>
                <span {...editable("home.wall.title_lead")}>{c("home.wall.title_lead")}</span>
                <span className="italic-blue" {...editable("home.wall.title_accent")}>{c("home.wall.title_accent")}</span>
                <span {...editable("home.wall.title_tail")}>{c("home.wall.title_tail")}</span>
              </>
            }
            sub={<span {...editable("home.wall.sub", "richtext")}>{c("home.wall.sub")}</span>}
          />
          <Reveal className="mt-8 flex flex-col gap-3" delay={0.1}>
            {features.map((r, i) => (
              <div key={r.t} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-blue shadow-soft">
                  <r.icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <div className="text-[15px] font-semibold text-ink" {...editable(`home.wall.feature${i}.title`)}>{c(`home.wall.feature${i}.title`, r.t)}</div>
                  <div className="text-[14px] text-ink-2" {...editable(`home.wall.feature${i}.desc`)}>{c(`home.wall.feature${i}.desc`, r.d)}</div>
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
            <span style={{ display: "contents" }} {...editable("home.wall.image", "image")}>
              <PhoneFrame src={resolveAsset(c("home.wall.image", "/assets/product/wall.png"))} width={300} />
            </span>
          </Reveal>

          <motion.div
            className="absolute -left-6 top-16 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-card backdrop-blur"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3" {...editable("home.wall.stat1_label")}>
              {c("home.wall.stat1_label", "Engagement")}
            </div>
            <div className="font-display text-2xl text-ink">
              <span {...editable("home.wall.stat1_value")}>{c("home.wall.stat1_value", "+38")}</span><span className="text-blue">%</span>
            </div>
          </motion.div>

          <motion.div
            className="absolute -right-4 bottom-20 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-card backdrop-blur"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.45 }}
          >
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3" {...editable("home.wall.stat2_label")}>
              {c("home.wall.stat2_label", "Reach this week")}
            </div>
            <div className="font-display text-2xl text-ink" {...editable("home.wall.stat2_value")}>{c("home.wall.stat2_value", "128k")}</div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
