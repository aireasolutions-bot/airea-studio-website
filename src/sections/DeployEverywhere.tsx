import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MousePointer2,
  Music2,
  Send,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { SectionHeading } from "@/components/ui";

const EASE = [0.22, 0.61, 0.36, 1] as const;

const cardAnim = (on: boolean, i: number) => ({
  animate: on
    ? { opacity: 1, y: 0, scale: 1 }
    : { opacity: 0, y: 60, scale: 0.9 },
  transition: { duration: 0.65, ease: EASE, delay: on ? 0.25 + i * 0.14 : 0 },
});

function Avatar() {
  return (
    <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-mist">
      <img src="/assets/brand/logo.png" alt="" className="h-3 w-auto" />
    </span>
  );
}

function InstagramCard({ on }: { on: boolean }) {
  return (
    <motion.div {...cardAnim(on, 0)} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <Avatar />
        <span className="text-[12px] font-semibold text-ink">aireastudio</span>
        <span className="ml-auto text-ink-3">•••</span>
      </div>
      <img src="/assets/campaigns/worlds/w1.jpg" alt="" className="aspect-square w-full object-cover object-top" />
      <div className="flex items-center gap-3 px-3 py-2 text-ink">
        <Heart className="h-4 w-4" />
        <MessageCircle className="h-4 w-4" />
        <Send className="h-4 w-4" />
        <Bookmark className="ml-auto h-4 w-4" />
      </div>
      <p className="px-3 pb-3 text-[11.5px] text-ink-2">
        <span className="font-semibold text-ink">aireastudio</span> New drop. All in motion.
      </p>
    </motion.div>
  );
}

function FacebookCard({ on }: { on: boolean }) {
  return (
    <motion.div {...cardAnim(on, 1)} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Avatar />
        <div>
          <div className="text-[12px] font-semibold leading-tight text-ink">Airea Studio</div>
          <div className="text-[10px] text-ink-3">Sponsored · 🌐</div>
        </div>
      </div>
      <p className="px-3 pb-2 text-[12px] text-ink-2">Designed to move with you.</p>
      <img src="/assets/campaigns/worlds/w2.jpg" alt="" className="aspect-square w-full object-cover object-top" />
      <div className="flex items-center gap-5 px-3 py-2 text-[11px] text-ink-2">
        <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> Like</span>
        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> Comment</span>
        <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /> Share</span>
      </div>
    </motion.div>
  );
}

function TikTokCard({ on }: { on: boolean }) {
  return (
    <motion.div {...cardAnim(on, 2)} className="relative overflow-hidden rounded-2xl border border-line bg-ink shadow-card">
      <img src="/assets/campaigns/worlds/w9.jpg" alt="" className="aspect-[3/4] w-full object-cover object-[center_22%] opacity-95" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-14">
        <div className="flex items-center gap-1.5 text-white">
          <Music2 className="h-3 w-3" />
          <span className="text-[11px] font-semibold">@aireastudio</span>
        </div>
        <p className="mt-1 text-[11px] text-white/85">Run anywhere. ☁️ #onbrand</p>
      </div>
      <div className="absolute bottom-3 right-2 flex flex-col items-center gap-3 text-white">
        <Heart className="h-4 w-4 fill-white" />
        <MessageCircle className="h-4 w-4" />
        <Send className="h-4 w-4" />
      </div>
    </motion.div>
  );
}

export function DeployEverywhere() {
  const [on, setOn] = useState(false);

  const replay = () => {
    setOn(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
  };

  return (
    <section id="deploy" className="relative overflow-hidden py-24 md:py-32">
      <div className="wrap-wide">
        <SectionHeading
          align="center"
          tag="Deploy"
          title={
            <>
              One click. <span className="italic-blue">Live everywhere.</span>
            </>
          }
          sub="Approve once and Studio publishes native posts to every platform — correctly sized, captioned, and on brand. Press Deploy and watch."
        />

        <motion.div
          className="relative mt-14"
          onViewportEnter={() => setOn(true)}
          viewport={{ once: true, amount: 0.35 }}
        >
          {/* deploy button */}
          <div className="relative z-20 flex flex-col items-center">
            <button
              onClick={replay}
              className="group relative inline-flex items-center gap-2 rounded-2xl bg-blue px-10 py-5 text-2xl font-bold text-white shadow-[0_20px_50px_-15px_rgba(0,71,255,0.7)] transition-transform duration-300 hover:scale-[1.03] active:scale-95"
            >
              <span className="absolute inset-0 animate-pulse-ring rounded-2xl" />
              Deploy
              <MousePointer2 className="h-6 w-6 translate-y-1 fill-white" />
            </button>
            <span className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ink-3">
              Click to replay
            </span>
          </div>

          {/* connectors */}
          <svg
            className="pointer-events-none absolute left-1/2 top-24 -z-0 hidden h-40 w-[680px] -translate-x-1/2 md:block"
            viewBox="0 0 680 160"
            fill="none"
            stroke="#0047FF"
            strokeWidth="1.5"
            style={{ opacity: on ? 0.5 : 0, transition: "opacity .6s" }}
          >
            <path className="dna-flow" d="M340 0 C 160 60, 120 80, 110 150" />
            <path className="dna-flow" d="M340 0 C 340 70, 340 90, 340 150" />
            <path className="dna-flow" d="M340 0 C 520 60, 560 80, 570 150" />
          </svg>

          {/* platform cards */}
          <div className="relative z-10 mx-auto mt-16 grid max-w-3xl grid-cols-1 items-start gap-5 sm:grid-cols-3">
            <InstagramCard on={on} />
            <FacebookCard on={on} />
            <TikTokCard on={on} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
