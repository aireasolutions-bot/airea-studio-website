import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/ui";
import { PricingCards } from "@/components/PricingCards";
import { useC, editable } from "@/content/ContentProvider";

export function PricingPreview() {
  const c = useC();
  return (
    <section className="py-24 md:py-32">
      <div className="wrap-wide">
        <SectionHeading
          tag={<span {...editable("home.pricing.tag")}>{c("home.pricing.tag", "Pricing")}</span>}
          align="center"
          title={
            <>
              <span {...editable("home.pricing.title_lead")}>{c("home.pricing.title_lead", "Simple pricing. ")}</span>
              <span className="italic-blue" {...editable("home.pricing.title_accent")}>{c("home.pricing.title_accent", "Start free.")}</span>
            </>
          }
          sub={<span {...editable("home.pricing.sub", "richtext")}>{c("home.pricing.sub", "Every plan starts with a 14-day free trial — no credit card required.")}</span>}
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
            <span {...editable("home.pricing.compare_link")}>{c("home.pricing.compare_link", "Compare all features")}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
