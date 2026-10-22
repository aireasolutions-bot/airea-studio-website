import { Link } from "react-router-dom";
import { ArrowRight, BadgePercent } from "lucide-react";
import { cn } from "@/lib/cn";
import { editable, isEdit, parseLink, useC } from "@/content/ContentProvider";
import { SALE_DISCOUNT_PERCENT } from "@/lib/sale";

type SaleBannerProps = {
  surface?: "home" | "pricing";
  className?: string;
};

export function SaleBanner({ className }: SaleBannerProps) {
  const c = useC();
  const enabled = c("sale.banner.enabled", "true").trim().toLowerCase() !== "false";
  const defaultHref = "https://app.aireastudio.ai/sign-up";
  const link = parseLink(c("sale.banner.cta_link"), defaultHref);
  const internal = link.href.startsWith("/") || link.href.startsWith("#");
  const body = c(
    "sale.banner.body",
    `Start your marketing habit for free for the first 2 weeks, then keep it going with ${SALE_DISCOUNT_PERCENT}% off the next 2 months.`
  );
  const highlight = `${SALE_DISCOUNT_PERCENT}% off the next 2 months`;
  const highlightIndex = body.indexOf(highlight);

  if (!enabled && !isEdit()) return null;

  const cta = link.visible || isEdit() ? (
    internal ? (
      <Link
        to={link.href}
        className={cn(
          "group inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-ink transition-colors hover:text-blue",
          !link.visible && "opacity-40 outline-dashed outline-2 outline-offset-2 outline-ink-3"
        )}
      >
        <span {...editable("sale.banner.cta", "cta")}>{c("sale.banner.cta", "Sign up now")}</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    ) : (
      <a
        href={link.href}
        {...(link.newTab ? { target: "_blank", rel: "noopener" } : {})}
        className={cn(
          "group inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-ink transition-colors hover:text-blue",
          !link.visible && "opacity-40 outline-dashed outline-2 outline-offset-2 outline-ink-3"
        )}
      >
        <span {...editable("sale.banner.cta", "cta")}>{c("sale.banner.cta", "Sign up now")}</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </a>
    )
  ) : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-blue/20 bg-white/85 p-4 text-left shadow-card backdrop-blur",
        !enabled && "opacity-45 outline-dashed outline-2 outline-offset-2 outline-ink-3",
        className
      )}
      {...editable("sale.banner.enabled")}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgb(var(--c-blue-mist)),transparent_58%)]" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue text-white shadow-[0_12px_30px_-14px_rgb(var(--c-blue)/0.9)]">
            <BadgePercent className="h-5 w-5" />
          </span>
          <div>
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-blue" {...editable("sale.banner.kicker")}>
              {c("sale.banner.kicker", "Limited-time offer")}
            </div>
            <div className="mt-1 text-[15px] font-normal leading-snug text-ink-2" {...editable("sale.banner.body", "richtext")}>
              {highlightIndex >= 0 ? (
                <>
                  {body.slice(0, highlightIndex)}
                  <strong className="font-semibold text-ink">{highlight}</strong>
                  {body.slice(highlightIndex + highlight.length)}
                </>
              ) : (
                body
              )}
            </div>
          </div>
        </div>
        {cta}
      </div>
    </div>
  );
}
