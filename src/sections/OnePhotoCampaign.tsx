import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Button, Tag } from "@/components/ui";
import { RobotHead } from "@/components/RobotHead";
import { SIGN_UP_URL } from "@/lib/site";
import { useC, resolveAsset, editable } from "@/content/ContentProvider";

const WORLDS = [
  { src: "/assets/campaigns/worlds/w1.jpg", n: "01", label: "Track" },
  { src: "/assets/campaigns/worlds/w2.jpg", n: "02", label: "City" },
  { src: "/assets/campaigns/worlds/w3.jpg", n: "03", label: "Studio" },
  { src: "/assets/campaigns/worlds/w4.jpg", n: "04", label: "Beach" },
  { src: "/assets/campaigns/worlds/w5.jpg", n: "05", label: "Gym" },
  { src: "/assets/campaigns/worlds/w6.jpg", n: "06", label: "Café" },
  { src: "/assets/campaigns/worlds/w7.jpg", n: "07", label: "Trail" },
  { src: "/assets/campaigns/worlds/w8.jpg", n: "08", label: "Interior" },
  { src: "/assets/campaigns/worlds/w9.jpg", n: "09", label: "Key shot" },
];

const ROT = [-3, 2, -1.5, 1.5, -2, 2.5, -1, 2, -2.5];

function WorldCard({
  progress,
  index,
  src,
  n,
  label,
}: {
  progress: MotionValue<number>;
  index: number;
  src: string;
  n: string;
  label: string;
}) {
  const c = useC();
  const start = 0.12 + index * 0.062;
  const end = start + 0.2;
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [42, 0]);
  const scale = useTransform(progress, [start, end], [0.7, 1]);
  const rotate = useTransform(progress, [start, end], [ROT[index], 0]);

  return (
    <motion.div
      style={{ opacity, y, scale, rotate }}
      className="group relative overflow-hidden rounded-xl border border-line bg-white shadow-card md:rounded-2xl"
    >
      <img
        src={resolveAsset(c(`home.onephoto.world${index}.image`, src))}
        {...editable(`home.onephoto.world${index}.image`, "image")}
        alt={`Sneaker — ${label}`}
        className="aspect-square w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        draggable={false}
        decoding="async"
      />
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 backdrop-blur">
        <span className="font-mono text-[9px] font-semibold text-blue">{n}</span>
        <span className="text-[10px] font-semibold text-ink" {...editable(`home.onephoto.world${index}.label`)}>{c(`home.onephoto.world${index}.label`, label)}</span>
      </div>
    </motion.div>
  );
}

export function OnePhotoCampaign() {
  const c = useC();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const titleY = useTransform(scrollYProgress, [0, 0.12], [30, 0]);
  const titleO = useTransform(scrollYProgress, [0, 0.12], [0, 1]);
  const sourceScale = useTransform(scrollYProgress, [0, 0.5], [1.04, 0.96]);
  const lineW = useTransform(scrollYProgress, [0.1, 0.55], ["0%", "100%"]);
  const payoffO = useTransform(scrollYProgress, [0.66, 0.85], [0, 1]);
  const payoffY = useTransform(scrollYProgress, [0.66, 0.85], [24, 0]);

  return (
    <section ref={ref} id="campaign" className="relative h-[260vh] bg-paper">
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden py-20">
        <div className="bg-blue-radial pointer-events-none absolute inset-0" />
        <div className="wrap-wide relative grid items-center gap-10 lg:grid-cols-[0.88fr_1.12fr]">
          {/* left: source */}
          <div>
            <motion.div style={{ opacity: titleO, y: titleY }}>
              <Tag className="mb-5 text-ink-3"><span {...editable("home.onephoto.tag")}>{c("home.onephoto.tag")}</span></Tag>
              <h2 className="font-display text-[clamp(34px,5vw,62px)] leading-[1.0] tracking-[-0.01em] text-ink">
                <span {...editable("home.onephoto.title_lead")}>{c("home.onephoto.title_lead")}</span>
                <br />
                <span className="italic-blue" {...editable("home.onephoto.title_accent")}>{c("home.onephoto.title_accent")}</span>
              </h2>
              <p className="mt-5 max-w-md text-[clamp(15px,1.5vw,18px)] text-ink-2" {...editable("home.onephoto.sub", "richtext")}>
                {c("home.onephoto.sub")}
              </p>
            </motion.div>

            {/* source card */}
            <div className="relative mt-9 w-fit">
              <motion.div
                style={{ scale: sourceScale }}
                className="overflow-hidden rounded-3xl border border-line bg-white p-2 shadow-card"
              >
                <img
                  src={resolveAsset(c("home.onephoto.source_image", "/assets/campaigns/shoe-source.jpg"))}
                  {...editable("home.onephoto.source_image", "image")}
                  alt="One source product photo"
                  className="w-[230px] rounded-2xl md:w-[260px]"
                  draggable={false}
                />
                <div className="flex items-center justify-between px-2 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-white">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[13px] font-semibold text-ink" {...editable("home.onephoto.source_label")}>{c("home.onephoto.source_label", "1 source photo")}</span>
                  </span>
                </div>
              </motion.div>

              {/* animated connector */}
              <div className="absolute -right-4 top-1/2 hidden h-px w-8 -translate-y-1/2 overflow-hidden lg:block">
                <motion.div style={{ width: lineW }} className="h-full bg-blue/50" />
              </div>

              <div className="absolute -right-7 -top-9">
                <RobotHead size={84} />
              </div>
            </div>

            <motion.div
              style={{ opacity: payoffO, y: payoffY }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Button href={SIGN_UP_URL} variant="primary" magnetic arrow>
                <span {...editable("home.onephoto.cta")}>{c("home.onephoto.cta", "Turn a photo into a campaign")}</span>
              </Button>
              <span className="font-mono text-[12px] uppercase tracking-wider text-ink-3" {...editable("home.onephoto.timing")}>
                {c("home.onephoto.timing", "~90 seconds")}
              </span>
            </motion.div>
          </div>

          {/* right: 9 worlds */}
          <div className="grid grid-cols-3 gap-2.5 md:gap-3.5">
            {WORLDS.map((w, i) => (
              <WorldCard key={w.n} progress={scrollYProgress} index={i} {...w} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
