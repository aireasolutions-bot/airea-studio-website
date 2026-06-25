import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/ui";
import { TESTIMONIALS } from "@/lib/site";
import { useC, editable } from "@/content/ContentProvider";

export function Testimonials() {
  const c = useC();
  return (
    <section className="border-y border-line bg-white py-24 md:py-32">
      <div className="wrap-wide">
        <SectionHeading
          tag={<span {...editable("home.testimonials.tag")}>{c("home.testimonials.tag", "In the field")}</span>}
          title={
            <>
              <span {...editable("home.testimonials.title_lead")}>{c("home.testimonials.title_lead", "The work looks like ")}</span>
              <span className="italic-blue" {...editable("home.testimonials.title_accent")}>{c("home.testimonials.title_accent", "you")}</span>
              <span {...editable("home.testimonials.title_tail")}>{c("home.testimonials.title_tail", " — at ten times the pace.")}</span>
            </>
          }
        />

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.role} delay={i * 0.08}>
              <figure className="flex h-full flex-col rounded-3xl border border-line bg-canvas p-7">
                <div className="font-display text-5xl leading-none text-blue/30">"</div>
                <blockquote className="-mt-2 text-[16px] leading-relaxed text-ink" {...editable(`home.testimonials.item${i}.quote`, "richtext")}>
                  {c(`home.testimonials.item${i}.quote`, t.quote)}
                </blockquote>
                <figcaption className="mt-6 border-t border-line pt-4">
                  <div className="text-[14px] font-semibold text-ink" {...editable(`home.testimonials.item${i}.name`)}>{c(`home.testimonials.item${i}.name`, t.name)}</div>
                  <div className="text-[13px] text-ink-3" {...editable(`home.testimonials.item${i}.role`)}>{c(`home.testimonials.item${i}.role`, t.role)}</div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
