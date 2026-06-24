import { Check } from "lucide-react";
import { Button } from "./ui";
import { cn } from "@/lib/cn";
import { PLANS } from "@/lib/site";

export function PricingCards() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {PLANS.map((plan) => (
        <div
          key={plan.name}
          className={cn(
            "relative flex flex-col rounded-3xl border p-7 transition-all duration-300",
            plan.featured
              ? "border-blue bg-ink text-white shadow-lift lg:-translate-y-3"
              : "border-line bg-white text-ink shadow-soft hover:-translate-y-1 hover:shadow-card"
          )}
        >
          {plan.featured && (
            <span className="absolute right-6 top-6 rounded-full bg-blue px-3 py-1 text-[11px] font-semibold text-white">
              Most popular
            </span>
          )}
          <div className={cn("text-[14px] font-semibold", plan.featured ? "text-blue-sky" : "text-blue")}>
            {plan.name}
          </div>
          <div className="mt-3 flex items-end gap-1">
            <span className="font-display text-5xl leading-none">{plan.price}</span>
            <span className={cn("mb-1 text-[14px]", plan.featured ? "text-white/60" : "text-ink-3")}>
              {plan.cadence}
            </span>
          </div>
          <p className={cn("mt-3 text-[14px]", plan.featured ? "text-white/70" : "text-ink-2")}>
            {plan.blurb}
          </p>
          <ul className="mt-6 flex-1 space-y-3">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[14px]">
                <Check
                  className={cn("mt-0.5 h-4 w-4 shrink-0", plan.featured ? "text-blue-sky" : "text-blue")}
                />
                <span className={plan.featured ? "text-white/85" : "text-ink-2"}>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <Button
              to="/#cta"
              variant={plan.featured ? "primary" : "ghost"}
              className="w-full"
              arrow
            >
              {plan.cta}
            </Button>
            <p className={cn("mt-3 text-center text-[12px]", plan.featured ? "text-white/50" : "text-ink-3")}>
              14-day free trial · no card
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
