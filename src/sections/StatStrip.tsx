import { useCountUp } from "@/hooks/useCountUp";
import { STATS } from "@/lib/site";

function Stat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, val } = useCountUp(value);
  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-[clamp(40px,6vw,68px)] leading-none tracking-tight text-ink">
        {val}
        <span className="text-blue">{suffix}</span>
      </div>
      <div className="mt-2 text-[13.5px] text-ink-2">{label}</div>
    </div>
  );
}

export function StatStrip() {
  return (
    <section className="relative border-y border-line bg-white">
      <div className="wrap-wide grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-4">
        {STATS.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </div>
    </section>
  );
}
