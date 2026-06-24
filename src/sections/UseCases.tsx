import { Check } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/ui";
import { USE_CASES } from "@/lib/site";

export function UseCases() {
  return (
    <section className="py-24 md:py-32">
      <div className="wrap-wide">
        <SectionHeading
          tag="Nº 007 · Who it's for"
          title={
            <>
              Built for teams that <span className="italic-blue">punch above</span>{" "}
              their weight.
            </>
          }
          sub="From a one-person shop to a lean growth team — Studio gives you agency-level output without the agency."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((u, i) => (
            <Reveal key={u.title} delay={i * 0.06}>
              <div className="flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-blue/30 hover:shadow-card">
                <span className="font-mono text-[12px] text-blue">0{i + 1}</span>
                <h3 className="mt-3 text-[20px] font-semibold leading-snug text-ink">
                  {u.title}
                </h3>
                <p className="mt-2 text-[14px] text-ink-2">{u.body}</p>
                <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
                  {u.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-[13.5px] text-ink-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
