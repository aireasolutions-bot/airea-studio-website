import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { Markdown } from "@/components/Markdown";
import type { FaqItem } from "@/lib/faq";

/* The hybrid the team asked for: questions expand in place (fast to scan),
 * while every answer ALSO exists as its own page at /faq/<slug> — the
 * standalone URL search engines and LLMs index and recommend. The "Full
 * answer" link inside each open row is that page. */

export function FaqAccordion({ items, defaultOpen }: { items: FaqItem[]; defaultOpen?: string }) {
  const [open, setOpen] = useState<string | null>(defaultOpen ?? null);
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
      {items.map((it) => {
        const isOpen = open === it.slug;
        return (
          <div key={it.id} id={it.slug} className="scroll-mt-28">
            <button
              onClick={() => setOpen(isOpen ? null : it.slug)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-canvas"
              aria-expanded={isOpen}
            >
              <span className="text-[15.5px] font-semibold text-ink">{it.question}</span>
              <Plus className={cn("h-5 w-5 shrink-0 text-blue transition-transform duration-300", isOpen && "rotate-45")} />
            </button>
            <div className={cn("grid transition-all duration-300 ease-out", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
              <div className="overflow-hidden">
                <div className="px-5 pb-5 pt-0.5">
                  <div className="max-w-2xl text-[14.5px] leading-relaxed text-ink-2 [&_h2]:mt-4 [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:text-ink [&_p]:mb-3">
                    <Markdown content={it.answer} />
                  </div>
                  <Link
                    to={`/faq/${it.slug}`}
                    className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-blue hover:underline"
                  >
                    Full answer <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
