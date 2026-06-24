import type { LucideIcon } from "lucide-react";
import { Reveal } from "./Reveal";

export type Feature = { icon: LucideIcon; title: string; body: string };

export function FeatureTriple({ items }: { items: Feature[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {items.map((f, i) => (
        <Reveal key={f.title} delay={i * 0.08}>
          <div className="h-full rounded-3xl border border-line bg-white p-7 shadow-soft">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-mist text-blue">
              <f.icon className="h-5.5 w-5.5" />
            </span>
            <h3 className="mt-5 text-[19px] font-semibold text-ink">{f.title}</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{f.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
