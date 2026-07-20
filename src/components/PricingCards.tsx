import { Check } from "lucide-react";
import { Button } from "./ui";
import { cn } from "@/lib/cn";
import { useC, editable } from "@/content/ContentProvider";
import { resolvePricing } from "@/lib/pricing";

/* Plan cards render from the pricing data (Pricing Studio in the admin —
 * `pricing.data` block, with legacy per-key fallback). The grid adapts to
 * however many plans the team publishes (2–4). */
export function PricingCards() {
  const c = useC();
  const { plans } = resolvePricing(c);
  const cols =
    plans.length <= 2 ? "lg:grid-cols-2 lg:mx-auto lg:max-w-3xl" : plans.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";

  return (
    <div className={cn("grid gap-5", cols)}>
      {plans.map((p) => {
        const featured = !!p.featured;
        const internal = p.ctaHref.startsWith("/") || p.ctaHref.startsWith("#");
        return (
          <div
            key={p.id}
            className={cn(
              "relative flex flex-col rounded-3xl border transition-all duration-300",
              plans.length === 4 ? "p-6" : "p-7",
              featured
                ? "border-blue bg-ink text-white shadow-lift lg:-translate-y-3"
                : "border-line bg-white text-ink shadow-soft hover:-translate-y-1 hover:shadow-card"
            )}
          >
            {featured && p.badge && (
              <span className="absolute right-6 top-6 rounded-full bg-blue px-3 py-1 text-[11px] font-semibold text-white" {...editable("pricing.card.badge")}>
                {p.badge}
              </span>
            )}
            <div className={cn("text-[14px] font-semibold", featured ? "text-blue-sky" : "text-blue")}>{p.name}</div>
            <div className="mt-3 flex items-end gap-1">
              <span className="font-display text-5xl leading-none">{p.price}</span>
              <span className={cn("mb-1 text-[14px]", featured ? "text-white/60" : "text-ink-3")}>{p.cadence}</span>
            </div>
            <p className={cn("mt-3 text-[14px]", featured ? "text-white/70" : "text-ink-2")}>{p.blurb}</p>
            <ul className="mt-6 flex-1 space-y-3">
              {p.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px]">
                  <Check className={cn("mt-0.5 h-4 w-4 shrink-0", featured ? "text-blue-sky" : "text-blue")} />
                  <span className={featured ? "text-white/85" : "text-ink-2"}>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <Button
                {...(internal ? { to: p.ctaHref } : { href: p.ctaHref })}
                variant={featured ? "primary" : "ghost"}
                className="w-full"
                arrow
              >
                {p.ctaLabel}
              </Button>
              <p className={cn("mt-3 text-center text-[12px]", featured ? "text-white/50" : "text-ink-3")} {...editable("pricing.card.reassurance")}>
                {c("pricing.card.reassurance", "14-day free trial · no card")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
