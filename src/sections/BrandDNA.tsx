import { Check, Globe, Mail, Megaphone, Share2 } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/ui";
import { RobotHead } from "@/components/RobotHead";
import { useC, editable } from "@/content/ContentProvider";

const LEARNS = [
  "Voice, tone & phrasing",
  "Colors, logo & type",
  "Products, offers & pricing",
  "Audience & campaign goals",
];

const NODES = [
  { icon: Share2, label: "Social", pos: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" },
  { icon: Megaphone, label: "Paid ads", pos: "right-0 top-1/2 -translate-y-1/2 translate-x-1/2" },
  { icon: Mail, label: "Email", pos: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2" },
  { icon: Globe, label: "Web & blog", pos: "left-0 top-1/2 -translate-y-1/2 -translate-x-1/2" },
];

export function BrandDNA() {
  const c = useC();
  return (
    <section className="relative overflow-hidden border-y border-line bg-white py-24 md:py-32">
      <div className="wrap-wide grid items-center gap-16 lg:grid-cols-2">
        {/* copy */}
        <div>
          <SectionHeading
            tag={<span {...editable("home.branddna.tag")}>{c("home.branddna.tag", "Brand DNA")}</span>}
            title={
              <>
                <span {...editable("home.branddna.title_lead")}>{c("home.branddna.title_lead", "Everything flows from your ")}</span>
                <span className="italic-blue" {...editable("home.branddna.title_accent")}>{c("home.branddna.title_accent", "Brand DNA")}</span>
                <span {...editable("home.branddna.title_tail")}>{c("home.branddna.title_tail", ".")}</span>
              </>
            }
            sub={<span {...editable("home.branddna.sub", "richtext")}>{c("home.branddna.sub", "Train it once. Studio learns how you sound and look, then every campaign, ad, and email it makes is on brand by default — no style guide babysitting.")}</span>}
          />
          <Reveal className="mt-8 grid grid-cols-2 gap-3" delay={0.1}>
            {LEARNS.map((l, i) => (
              <div
                key={l}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas px-3.5 py-3"
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue text-white">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-[13.5px] font-medium text-ink" {...editable(`home.branddna.learn${i}`)}>{c(`home.branddna.learn${i}`, l)}</span>
              </div>
            ))}
          </Reveal>
        </div>

        {/* hub */}
        <Reveal className="relative mx-auto aspect-square w-full max-w-[440px]" delay={0.05}>
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 h-full w-full"
            fill="none"
            stroke="var(--blue)"
            strokeWidth="0.5"
          >
            <line className="dna-flow" x1="50" y1="50" x2="50" y2="9" />
            <line className="dna-flow" x1="50" y1="50" x2="91" y2="50" />
            <line className="dna-flow" x1="50" y1="50" x2="50" y2="91" />
            <line className="dna-flow" x1="50" y1="50" x2="9" y2="50" />
          </svg>

          {/* center */}
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="relative grid h-32 w-32 place-items-center rounded-full border border-line bg-canvas shadow-card md:h-36 md:w-36">
              <span className="absolute inset-0 animate-pulse-ring rounded-full" />
              <RobotHead size={92} float={false} />
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-white" {...editable("home.branddna.center_label")}>
              {c("home.branddna.center_label", "Brand DNA")}
            </div>
          </div>

          {/* nodes */}
          {NODES.map((n, i) => (
            <div key={n.label} className={`absolute ${n.pos} z-10`}>
              <div className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 shadow-soft">
                <n.icon className="h-4 w-4 text-blue" />
                <span className="text-[12.5px] font-semibold text-ink" {...editable(`home.branddna.node${i}.label`)}>{c(`home.branddna.node${i}.label`, n.label)}</span>
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
