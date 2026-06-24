import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { FAQ } from "@/lib/site";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-2xl divide-y divide-line border-y border-line">
      {FAQ.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="text-[16px] font-semibold text-ink">{item.q}</span>
              <Plus
                className={cn(
                  "h-5 w-5 shrink-0 text-blue transition-transform duration-300",
                  isOpen && "rotate-45"
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                isOpen ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-xl text-[15px] leading-relaxed text-ink-2">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
