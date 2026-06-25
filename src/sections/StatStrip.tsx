import { useCountUp } from "@/hooks/useCountUp";
import { STATS } from "@/lib/site";
import { useC, editable } from "@/content/ContentProvider";

function Stat({
  value,
  suffix,
  label,
  i,
}: {
  value: number;
  suffix: string;
  label: string;
  i: number;
}) {
  const c = useC();
  const { ref, val } = useCountUp(value);
  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-[clamp(40px,6vw,68px)] leading-none tracking-tight text-ink">
        {val}
        <span className="text-blue" {...editable(`home.stats.item${i}.suffix`)}>
          {c(`home.stats.item${i}.suffix`, suffix)}
        </span>
      </div>
      <div className="mt-2 text-[13.5px] text-ink-2" {...editable(`home.stats.item${i}.label`)}>
        {c(`home.stats.item${i}.label`, label)}
      </div>
    </div>
  );
}

export function StatStrip() {
  return (
    <section className="relative border-y border-line bg-white">
      <div className="wrap-wide grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-4">
        {STATS.map((s, i) => (
          <Stat key={s.label} {...s} i={i} />
        ))}
      </div>
    </section>
  );
}
