import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button, Eyebrow } from "./ui";
import { SIGN_UP_URL } from "@/lib/site";
import { useC, editable } from "@/content/ContentProvider";

const EASE = [0.22, 0.61, 0.36, 1] as const;

export function SubHero({
  eyebrow,
  title,
  sub,
  note,
  visual,
}: {
  eyebrow: string;
  title: ReactNode;
  sub: string;
  note?: string;
  visual?: ReactNode;
}) {
  const c = useC();
  return (
    <section className="relative overflow-hidden pb-16 pt-32 md:pb-24 md:pt-40">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="wrap-wide grid items-center gap-12 lg:grid-cols-2">
        <div className="max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Eyebrow>{eyebrow}</Eyebrow>
          </motion.div>
          <motion.h1
            className="mt-6 font-display text-[clamp(40px,6.5vw,76px)] leading-[0.98] tracking-[-0.02em] text-ink"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.08 }}
          >
            {title}
          </motion.h1>
          <motion.p
            className="mt-6 max-w-lg text-[clamp(15px,1.5vw,18px)] text-ink-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
          >
            {sub}
          </motion.p>
          <motion.div
            className="mt-9 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.32 }}
          >
            <Button href={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow>
              <span {...editable("global.subhero.cta_primary")}>{c("global.subhero.cta_primary", "Start 14-day free trial")}</span>
            </Button>
            <Button to="/how-it-works" variant="ghost" size="lg">
              <span {...editable("global.subhero.cta_secondary")}>{c("global.subhero.cta_secondary", "See how it works")}</span>
            </Button>
          </motion.div>
          {note && (
            <motion.p
              className="mt-4 flex items-center gap-2 text-[13px] text-ink-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <Check className="h-4 w-4 text-blue" />
              {note}
            </motion.p>
          )}
        </div>
        {visual && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
          >
            {visual}
          </motion.div>
        )}
      </div>
    </section>
  );
}
