import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/gsap";

export function useCountUp(end: number, duration = 1.6, startFrom = 0) {
  const [val, setVal] = useState(startFrom);
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setVal(end);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          const t0 = performance.now();
          const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / (duration * 1000));
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(startFrom + (end - startFrom) * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.45 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [end, duration, startFrom]);

  return { ref, val };
}
