import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";

export function PageHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">{eyebrow}</p>
      <h1 className="mt-1 font-display text-[clamp(26px,3.4vw,38px)] tracking-tight text-ink">{title}</h1>
      {sub && <p className="mt-1.5 max-w-2xl text-[14.5px] text-ink-2">{sub}</p>}
    </div>
  );
}

export function Roadmap({ icon: Icon, title, items }: { icon: LucideIcon; title: string; items: string[] }) {
  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
      <div className="flex items-center gap-3 border-b border-line bg-blue-mist/40 px-6 py-4">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue text-white">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-[15px] font-semibold text-ink">{title}</div>
          <div className="text-[12.5px] text-ink-2">Shipping in the next admin update</div>
        </div>
        <span className="ml-auto rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-blue-ink">
          In progress
        </span>
      </div>
      <ul className="grid gap-x-8 gap-y-3 p-6 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14px] text-ink-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
