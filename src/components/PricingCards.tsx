import { Check } from "lucide-react";
import { Button } from "./ui";
import { cn } from "@/lib/cn";
import { SIGN_UP_URL } from "@/lib/site";
import { useC } from "@/content/ContentProvider";

const PLAN_KEYS = ["plan1", "plan2", "plan3"] as const;

export function PricingCards() {
  const c = useC();
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {PLAN_KEYS.map((pk) => {
        const featured = pk === "plan2";
        const features = c(`pricing.${pk}.features`)
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        return (
          <div
            key={pk}
            className={cn(
              "relative flex flex-col rounded-3xl border p-7 transition-all duration-300",
              featured
                ? "border-blue bg-ink text-white shadow-lift lg:-translate-y-3"
                : "border-line bg-white text-ink shadow-soft hover:-translate-y-1 hover:shadow-card"
            )}
          >
            {featured && (
              <span className="absolute right-6 top-6 rounded-full bg-blue px-3 py-1 text-[11px] font-semibold text-white">
                Most popular
              </span>
            )}
            <div className={cn("text-[14px] font-semibold", featured ? "text-blue-sky" : "text-blue")}>
              {c(`pricing.${pk}.name`)}
            </div>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-display text-5xl leading-none">{c(`pricing.${pk}.price`)}</span>
              <span className={cn("mb-1 text-[14px]", featured ? "text-white/60" : "text-ink-3")}>
                {c(`pricing.${pk}.cadence`)}
              </span>
            </div>
            <p className={cn("mt-3 text-[14px]", featured ? "text-white/70" : "text-ink-2")}>
              {c(`pricing.${pk}.blurb`)}
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px]">
                  <Check className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-blue-sky" : "text-blue")} />
                  <span className={featured ? "text-white/85" : "text-ink-2"}>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <Button href={SIGN_UP_URL} variant={featured ? "primary" : "ghost"} className="w-full" arrow>
                {c(`pricing.${pk}.cta`)}
              </Button>
              <p className={cn("mt-3 text-center text-[12px]", featured ? "text-white/50" : "text-ink-3")}>
                14-day free trial · no card
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
