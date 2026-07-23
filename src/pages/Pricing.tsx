import { Check, Minus } from "lucide-react";
import { EditableEyebrow, SectionHeading } from "@/components/ui";
import { PricingCards } from "@/components/PricingCards";
import { Faq } from "@/components/Faq";
import { Reveal } from "@/components/Reveal";
import { FinalCTA } from "@/sections/FinalCTA";
import { PageSections } from "@/components/PageSections";
import { useC, editable } from "@/content/ContentProvider";
import { resolvePricing, type CompareCell } from "@/lib/pricing";
import { Seo } from "@/components/Seo";
import { productSchema, breadcrumbSchema } from "@/lib/seo";

function Cell({ cell }: { cell: CompareCell }) {
  if (cell.t === "check") return <Check className="mx-auto h-4.5 w-4.5 text-blue" />;
  if (cell.t === "dash") return <Minus className="mx-auto h-4 w-4 text-ink-3/50" />;
  return <span className="text-[13.5px] text-ink">{cell.v}</span>;
}

export function Pricing() {
  const c = useC();
  // Plans + comparison come from the Pricing Studio data (legacy keys until
  // the team first publishes from the Studio).
  const pricing = resolvePricing(c);
  const featuredCol = pricing.plans.findIndex((p) => p.featured);

  const hero = (
    <section className="relative overflow-hidden pb-12 pt-36 text-center md:pt-44">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" />
        <div className="wrap">
          <div className="flex justify-center">
            <EditableEyebrow k="pricing.hero.eyebrow" defaultLabel="Pricing" />
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
  );

  const cards = (
    <section className="pb-8">
      <div className="wrap-wide">
        <PricingCards />
      </div>
    </section>
  );

  const compare = (
    <section className="py-20 md:py-28">
        <div className="wrap">
          <SectionHeading
            align="center"
            tag={<span {...editable("pricing.compare.tag")}>{c("pricing.compare.tag", "Compare")}</span>}
            title={<span {...editable("pricing.compare.title")}>{c("pricing.compare.title", "Everything in every plan")}</span>}
          />
          <Reveal className="mt-12 overflow-hidden rounded-3xl border border-line">
            <table className="w-full border-collapse bg-white text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="p-4 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
                    <span {...editable("pricing.compare.col_feature")}>{c("pricing.compare.col_feature", "Feature")}</span>
                  </th>
                  {pricing.plans.map((p, i) => (
                    <th
                      key={p.id}
                      className={`p-4 text-center ${i === featuredCol ? "bg-blue-mist/50" : ""}`}
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
                {pricing.compare.rows.map((row, r) => (
                  <tr key={r} className="border-b border-line last:border-0">
                    <td className="p-4 text-[14px] text-ink-2">{row.label}</td>
                    {row.values.map((cell, i) => (
                      <td
                        key={i}
                        className={`p-4 text-center ${i === featuredCol ? "bg-blue-mist/40" : ""}`}
                      >
                        <Cell cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>
        </div>
      </section>
  );

  const faq = (
    <section className="pb-24 md:pb-28">
      <div className="wrap">
        <SectionHeading
          align="center"
          tag={<span {...editable("pricing.faq.tag")}>{c("pricing.faq.tag", "FAQ")}</span>}
          title={<span {...editable("pricing.faq.title")}>{c("pricing.faq.title", "Questions, answered")}</span>}
        />
        <div className="mt-12">
          <Faq />
        </div>
      </div>
    </section>
  );

  return (
    <>
      <Seo
        path="/pricing"
        type="product"
        jsonLd={[
          productSchema(),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Pricing", path: "/pricing" },
          ]),
        ]}
      />
      <PageSections
        page="pricing"
        sections={{ hero, cards, compare, faq, cta: <FinalCTA /> }}
      />
    </>
  );
}
