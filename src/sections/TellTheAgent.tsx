import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { Button, SectionHeading } from "@/components/ui";
import { SIGN_UP_URL } from "@/lib/site";
import { useC, resolveAsset, editable } from "@/content/ContentProvider";

const EASE = [0.22, 0.61, 0.36, 1] as const;
const PROMPT = "Launch our summer sneaker sale";

const ADS = [
  { src: "/assets/campaigns/worlds/w2.jpg", title: "Made for the city" },
  { src: "/assets/campaigns/worlds/w4.jpg", title: "Beach to street" },
  { src: "/assets/campaigns/worlds/w5.jpg", title: "Game-day ready" },
  { src: "/assets/campaigns/worlds/w7.jpg", title: "Trail tested" },
];

function AdCard({ src, title, show, i }: { src: string; title: string; show: boolean; i: number }) {
  const c = useC();
  return (
    <motion.div
      animate={show ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.92 }}
      transition={{ duration: 0.5, ease: EASE, delay: show ? 0.1 + i * 0.12 : 0 }}
      className="relative overflow-hidden rounded-xl border border-line bg-white shadow-sm"
    >
      <img
        src={resolveAsset(c(`home.agent.ad${i}.image`, src))}
        {...editable(`home.agent.ad${i}.image`, "image")}
        alt={title}
        className="aspect-[4/5] w-full object-cover object-[center_25%]"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-2.5 pb-2.5 pt-8">
        <div className="font-mono text-[8px] uppercase tracking-wider text-white/80" {...editable("home.agent.ad_overline")}>{c("home.agent.ad_overline", "Summer · 40% off")}</div>
        <div className="font-display text-[15px] leading-tight text-white" {...editable(`home.agent.ad${i}.title`)}>{c(`home.agent.ad${i}.title`, title)}</div>
        <span className="mt-1 inline-block rounded-full bg-blue px-2 py-0.5 text-[9px] font-semibold text-white" {...editable("home.agent.ad_cta")}>
          {c("home.agent.ad_cta", "Shop now")}
        </span>
      </div>
    </motion.div>
  );
}

export function TellTheAgent() {
  const c = useC();
  const [phase, setPhase] = useState(0); // 0 idle · 1 prompt · 2 typing · 3 done
  const timers = useRef<number[]>([]);

  const run = () => {
    timers.current.forEach(clearTimeout);
    setPhase(0);
    timers.current = [
      window.setTimeout(() => setPhase(1), 250),
      window.setTimeout(() => setPhase(2), 1000),
      window.setTimeout(() => setPhase(3), 2100),
    ];
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <div className="wrap-wide grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <SectionHeading
            tag={<span {...editable("home.agent.tag")}>{c("home.agent.tag", "The agent")}</span>}
            title={
              <>
                <span {...editable("home.agent.title_lead")}>{c("home.agent.title_lead", "Tell the agent.")}</span>
                <br />
                <span className="italic-blue" {...editable("home.agent.title_accent")}>{c("home.agent.title_accent", "It builds the campaign.")}</span>
              </>
            }
            sub={<span {...editable("home.agent.sub", "richtext")}>{c("home.agent.sub", "No briefs to write, no templates to wrangle. Describe what you want in a sentence — Studio plans it, writes it, designs it, and hands it back ready to ship.")}</span>}
          />
          <div className="mt-8">
            <Button href={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow>
              <span {...editable("home.agent.cta")}>{c("home.agent.cta", "Start free")}</span>
            </Button>
          </div>
        </div>

        {/* chat */}
        <motion.div
          onViewportEnter={() => phase === 0 && run()}
          viewport={{ once: true, amount: 0.4 }}
          className="relative mx-auto w-full max-w-lg rounded-3xl border border-line bg-white p-4 shadow-card md:p-6"
        >
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <img src={resolveAsset(c("home.agent.avatar", "/assets/robot/head.png"))} {...editable("home.agent.avatar", "image")} alt="" className="h-6 w-auto" />
              <span className="text-[13px] font-semibold text-ink" {...editable("home.agent.chat_title")}>{c("home.agent.chat_title", "AIREA Agent")}</span>
            </div>
            <button
              onClick={run}
              className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
            >
              <RotateCcw className="h-3 w-3" /> <span {...editable("home.agent.replay_label")}>{c("home.agent.replay_label", "Replay")}</span>
            </button>
          </div>

          <div className="min-h-[260px] pt-4">
            {/* user prompt */}
            <motion.div
              animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="mb-4 flex justify-end"
            >
              <span className="rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[13.5px] text-white" {...editable("home.agent.prompt")}>
                {c("home.agent.prompt", PROMPT)}
              </span>
            </motion.div>

            {/* typing */}
            {phase === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 pl-1">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="h-2 w-2 rounded-full bg-blue/60"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                  />
                ))}
              </motion.div>
            )}

            {/* reply + ads */}
            <motion.div
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.45, ease: EASE }}
              style={{ pointerEvents: phase >= 3 ? "auto" : "none" }}
            >
              <p className="mb-3 text-[13.5px] text-ink-2" {...editable("home.agent.reply", "richtext")}>
                {c("home.agent.reply", "Done. Here's your campaign — four on-brand ads, ready to ship.")}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {ADS.map((a, i) => (
                  <AdCard key={a.title} {...a} i={i} show={phase >= 3} />
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
