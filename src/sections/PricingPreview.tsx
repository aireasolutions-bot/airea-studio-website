import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/ui";
import { PricingCards } from "@/components/PricingCards";

export function PricingPreview() {
  return (
    <section className="py-24 md:py-32">
      <div className="wrap-wide">
        <SectionHeading
          tag="Nº 009 · Pricing"
          align="center"
          title={
            <>
              Simple pricing. <span className="italic-blue">Start free.</span>
            </>
          }
          sub="Every plan starts with a 14-day free trial — no credit card required."
        />
        <Reveal className="mt-14">
          <PricingCards />
        </Reveal>
        <div className="mt-10 text-center">
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-blue hover:gap-2.5"
            style={{ transition: "gap .2s" }}
          >
            Compare all features
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
