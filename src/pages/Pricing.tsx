import { Check, Minus } from "lucide-react";
import { Eyebrow, SectionHeading } from "@/components/ui";
import { PricingCards } from "@/components/PricingCards";
import { Faq } from "@/components/Faq";
import { Reveal } from "@/components/Reveal";
import { FinalCTA } from "@/sections/FinalCTA";
import { PLANS } from "@/lib/site";
import { useC, editable } from "@/content/ContentProvider";

const COMPARE: { label: string; values: (boolean | string)[] }[] = [
  { label: "Brand workspaces", values: ["1", "3", "10"] },
  { label: "Campaigns / month", values: ["30", "Unlimited", "Unlimited"] },
  { label: "Brand DNA training", values: [true, true, true] },
  { label: "Social & email channels", values: [true, true, true] },
  { label: "Paid ads — Meta & Google", values: [false, true, true] },
  { label: "AI review & editing", values: [false, true, true] },
  { label: "1-click publish to Meta", values: [false, true, true] },
  { label: "The Wall analytics", values: [false, false, true] },
  { label: "Roles & permissions", values: [false, false, true] },
  { label: "Priority models & support", values: [false, false, true] },
];

function Cell({ v, editKey }: { v: boolean | string; editKey?: string }) {
  if (v === true) return <Check className="mx-auto h-4.5 w-4.5 text-blue" />;
  if (v === false) return <Minus className="mx-auto h-4 w-4 text-ink-3/50" />;
  return <span className="text-[13.5px] text-ink" {...(editKey ? editable(editKey) : {})}>{v}</span>;
}

export function Pricing() {
  const c = useC();
  return (
    <>
      <section className="relative overflow-hidden pb-12 pt-36 text-center md:pt-44">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" />
        <div className="wrap">
          <div className="flex justify-center">
            <Eyebrow><span {...editable("pricing.hero.eyebrow")}>{c("pricing.hero.eyebrow", "Pricing")}</span></Eyebrow>
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-[clamp(40px,6.5vw,76px)] leading-[1] tracking-[-0.02em] text-ink">
            <span {...editable("pricing.hero.title_lead")}>{c("pricing.hero.title_lead", "Pricing that scales ")}</span>
            <span className="italic-blue" {...editable("pricing.hero.title_accent")}>{c("pricing.hero.title_accent", "with you")}</span>
            <span {...editable("pricing.hero.title_tail")}>{c("pricing.hero.title_tail", ".")}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[clamp(15px,1.5vw,18px)] text-ink-2" {...editable("pricing.hero.sub", "richtext")}>
            {c("pricing.hero.sub", "Every plan starts with a 14-day free trial — no credit card required. Upgrade, downgrade, or cancel anytime.")}
          </p>
        </div>
      </section>

      <section className="pb-8">
        <div className="wrap-wide">
          <PricingCards />
        </div>
      </section>

      {/* comparison */}
      <section className="py-20 md:py-28">
        <div className="wrap">
          <SectionHeading
            align="center"
            tag={c("pricing.compare.tag", "Compare")}
            title={<span {...editable("pricing.compare.title")}>{c("pricing.compare.title", "Everything in every plan")}</span>}
          />
          <Reveal className="mt-12 overflow-hidden rounded-3xl border border-line">
            <table className="w-full border-collapse bg-white text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="p-4 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
                    <span {...editable("pricing.compare.col_feature")}>{c("pricing.compare.col_feature", "Feature")}</span>
                  </th>
                  {PLANS.map((p, i) => (
                    <th
                      key={p.name}
                      className={`p-4 text-center ${i === 1 ? "bg-blue-mist/50" : ""}`}
                    >
                      <div className="text-[15px] font-semibold text-ink">{p.name}</div>
                      <div className="text-[12px] text-ink-3">
                        {p.price}
                        {p.cadence}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row, r) => (
                  <tr key={row.label} className="border-b border-line last:border-0">
                    <td className="p-4 text-[14px] text-ink-2" {...editable(`pricing.compare.row${r}.label`)}>
                      {c(`pricing.compare.row${r}.label`, row.label)}
                    </td>
                    {row.values.map((v, i) => (
                      <td
                        key={i}
                        className={`p-4 text-center ${i === 1 ? "bg-blue-mist/40" : ""}`}
                      >
                        <Cell
                          v={typeof v === "string" ? c(`pricing.compare.row${r}.v${i}`, v) : v}
                          editKey={typeof v === "string" ? `pricing.compare.row${r}.v${i}` : undefined}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>

      {/* faq */}
      <section className="pb-24 md:pb-28">
        <div className="wrap">
          <SectionHeading
            align="center"
            tag={c("pricing.faq.tag", "FAQ")}
            title={<span {...editable("pricing.faq.title")}>{c("pricing.faq.title", "Questions, answered")}</span>}
          />
          <div className="mt-12">
            <Faq />
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
