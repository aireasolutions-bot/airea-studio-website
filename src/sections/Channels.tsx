import { FileText, Mail, Megaphone, Share2 } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Marquee } from "@/components/Marquee";
import { SectionHeading } from "@/components/ui";
import { CHANNELS, PLATFORMS } from "@/lib/site";

const ICONS = [Share2, Megaphone, Mail, FileText];

const CHIPS = [
  ...PLATFORMS,
  { name: "Email", src: "" },
  { name: "YouTube", src: "" },
  { name: "LinkedIn", src: "" },
  { name: "Web & Blog", src: "" },
];

export function Channels() {
  return (
    <section className="py-24 md:py-32">
      <div className="wrap-wide">
        <SectionHeading
          tag="Nº 005 · Every channel"
          title={
            <>
              One brief. Built for <span className="italic-blue">every surface</span>.
            </>
          }
          sub="Studio writes and designs natively for each channel — not one asset awkwardly stretched to fit them all."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNELS.map((c, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal key={c.title} delay={i * 0.06}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-mist opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-mist text-blue">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="mt-5 inline-block rounded-full border border-line bg-canvas px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                      {c.tag}
                    </span>
                    <h3 className="mt-3 text-[19px] font-semibold text-ink">{c.title}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{c.body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-14 rounded-3xl border border-line bg-paper py-7">
          <Marquee speed={28}>
            {CHIPS.map((c, i) => (
              <div key={`${c.name}-${i}`} className="flex items-center gap-2.5 opacity-70">
                {c.src ? (
                  <img src={c.src} alt={c.name} className="h-6 w-auto" />
                ) : (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-ink/5 font-mono text-[10px] text-ink">
                    ✦
                  </span>
                )}
                <span className="whitespace-nowrap font-mono text-[13px] font-medium uppercase tracking-wider text-ink-2">
                  {c.name}
                </span>
              </div>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
