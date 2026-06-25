import { FileText, Mail, Megaphone, Share2 } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { Marquee } from "@/components/Marquee";
import { SectionHeading } from "@/components/ui";
import { CHANNELS, PLATFORMS } from "@/lib/site";
import { useC, editable } from "@/content/ContentProvider";

const ICONS = [Share2, Megaphone, Mail, FileText];

const CHIPS = [
  ...PLATFORMS,
  { name: "Email", src: "" },
  { name: "YouTube", src: "" },
  { name: "LinkedIn", src: "" },
  { name: "Web & Blog", src: "" },
];

export function Channels() {
  const c = useC();
  return (
    <section className="py-24 md:py-32">
      <div className="wrap-wide">
        <SectionHeading
          tag={<span {...editable("home.channels.tag")}>{c("home.channels.tag", "Every channel")}</span>}
          title={
            <>
              <span {...editable("home.channels.title_lead")}>{c("home.channels.title_lead", "One brief. Built for ")}</span>
              <span className="italic-blue" {...editable("home.channels.title_accent")}>{c("home.channels.title_accent", "every surface")}</span>
              <span {...editable("home.channels.title_tail")}>{c("home.channels.title_tail", ".")}</span>
            </>
          }
          sub={<span {...editable("home.channels.sub", "richtext")}>{c("home.channels.sub", "Studio writes and designs natively for each channel — not one asset awkwardly stretched to fit them all.")}</span>}
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNELS.map((ch, i) => {
            const Icon = ICONS[i];
            return (
              <Reveal key={ch.title} delay={i * 0.06}>
                <div className="group relative h-full overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-card">
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-mist opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-mist text-blue">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="mt-5 inline-block rounded-full border border-line bg-canvas px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-ink-3" {...editable(`home.channels.item${i}.tag`)}>
                      {c(`home.channels.item${i}.tag`, ch.tag)}
                    </span>
                    <h3 className="mt-3 text-[19px] font-semibold text-ink" {...editable(`home.channels.item${i}.title`)}>{c(`home.channels.item${i}.title`, ch.title)}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-2" {...editable(`home.channels.item${i}.body`)}>{c(`home.channels.item${i}.body`, ch.body)}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-14 rounded-3xl border border-line bg-paper py-7">
          <Marquee speed={28}>
            {CHIPS.map((chip, i) => (
              <div key={`${chip.name}-${i}`} className="flex items-center gap-2.5 opacity-70">
                {chip.src ? (
                  <img src={chip.src} alt={chip.name} className="h-6 w-auto" />
                ) : (
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-ink/5 font-mono text-[10px] text-ink">
                    ✦
                  </span>
                )}
                <span className="whitespace-nowrap font-mono text-[13px] font-medium uppercase tracking-wider text-ink-2" {...editable(`home.channels.chip${i}`)}>
                  {c(`home.channels.chip${i}`, chip.name)}
                </span>
              </div>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
