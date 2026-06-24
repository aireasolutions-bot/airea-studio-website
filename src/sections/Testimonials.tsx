import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/ui";
import { TESTIMONIALS } from "@/lib/site";

export function Testimonials() {
  return (
    <section className="border-y border-line bg-white py-24 md:py-32">
      <div className="wrap-wide">
        <SectionHeading
          tag="In the field"
          title={
            <>
              The work looks like <span className="italic-blue">you</span> — at
              ten times the pace.
            </>
          }
        />

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.role} delay={i * 0.08}>
              <figure className="flex h-full flex-col rounded-3xl border border-line bg-canvas p-7">
                <div className="font-display text-5xl leading-none text-blue/30">"</div>
                <blockquote className="-mt-2 text-[16px] leading-relaxed text-ink">
                  {t.quote}
                </blockquote>
                <figcaption className="mt-6 border-t border-line pt-4">
                  <div className="text-[14px] font-semibold text-ink">{t.name}</div>
                  <div className="text-[13px] text-ink-3">{t.role}</div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
