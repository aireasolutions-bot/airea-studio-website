import { Check } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/ui";
import { USE_CASES } from "@/lib/site";
import { useC, editable } from "@/content/ContentProvider";

export function UseCases() {
  const c = useC();
  return (
    <section className="py-24 md:py-32">
      <div className="wrap-wide">
        <SectionHeading
          tag={<span {...editable("home.usecases.tag")}>{c("home.usecases.tag", "Who it's for")}</span>}
          title={
            <>
              <span {...editable("home.usecases.title_lead")}>{c("home.usecases.title_lead", "Built for teams that ")}</span>
              <span className="italic-blue" {...editable("home.usecases.title_accent")}>{c("home.usecases.title_accent", "punch above")}</span>
              <span {...editable("home.usecases.title_tail")}>{c("home.usecases.title_tail", " their weight.")}</span>
            </>
          }
          sub={<span {...editable("home.usecases.sub", "richtext")}>{c("home.usecases.sub", "From a one-person shop to a lean growth team — Studio gives you agency-level output without the agency.")}</span>}
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {USE_CASES.map((u, i) => (
            <Reveal key={u.title} delay={i * 0.06}>
              <div className="flex h-full flex-col rounded-3xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-blue/30 hover:shadow-card">
                <span className="font-mono text-[12px] text-blue">0{i + 1}</span>
                <h3 className="mt-3 text-[20px] font-semibold leading-snug text-ink" {...editable(`home.usecases.item${i}.title`)}>
                  {c(`home.usecases.item${i}.title`, u.title)}
                </h3>
                <p className="mt-2 text-[14px] text-ink-2" {...editable(`home.usecases.item${i}.body`, "richtext")}>{c(`home.usecases.item${i}.body`, u.body)}</p>
                <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
                  {u.points.map((p, j) => (
                    <li key={p} className="flex items-start gap-2 text-[13.5px] text-ink-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                      <span {...editable(`home.usecases.item${i}.point${j}`)}>{c(`home.usecases.item${i}.point${j}`, p)}</span>
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
