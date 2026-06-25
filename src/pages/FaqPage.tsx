import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Search } from "lucide-react";
import { Button, Eyebrow } from "@/components/ui";
import { RobotHead } from "@/components/RobotHead";
import { cn } from "@/lib/cn";
import { scrollToTarget } from "@/hooks/useSmoothScroll";
import { FAQ_CATEGORIES } from "@/lib/faq";
import { SIGN_UP_URL } from "@/lib/site";
import { useC, editable } from "@/content/ContentProvider";

export function FaqPage() {
  const c = useC();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [active, setActive] = useState(FAQ_CATEGORIES[0].id);

  const q = query.trim().toLowerCase();
  const cats = useMemo(() => {
    if (!q) return FAQ_CATEGORIES;
    return FAQ_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter((it) =>
        (it.q + " " + it.a.join(" ")).toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length);
  }, [q]);

  useEffect(() => {
    if (q) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.cat!);
        });
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    document.querySelectorAll("[data-cat]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [q]);

  const total = FAQ_CATEGORIES.reduce((n, cat) => n + cat.items.length, 0);

  return (
    <>
      {/* header */}
      <section className="relative overflow-hidden pb-12 pt-32 md:pt-40">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" />
        <div className="wrap text-center">
          <div className="mb-6 flex justify-center">
            <RobotHead size={96} />
          </div>
          <div className="flex justify-center">
            <Eyebrow><span {...editable("faq.eyebrow")}>{c("faq.eyebrow")}</span></Eyebrow>
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-[clamp(40px,6.5vw,72px)] leading-[1.02] tracking-[-0.02em] text-ink" {...editable("faq.title")}>
            {c("faq.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[clamp(15px,1.5vw,18px)] text-ink-2" {...editable("faq.intro", "richtext")}>
            {c("faq.intro")}
          </p>

          <div className="mx-auto mt-8 flex max-w-md items-center gap-2.5 rounded-full border border-line-2 bg-white px-5 py-3.5 shadow-soft focus-within:border-blue">
            <Search className="h-4.5 w-4.5 shrink-0 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${total} questions…`}
              className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-[12px] font-medium text-ink-3 hover:text-ink">
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* body */}
      <section className="pb-24 md:pb-28">
        <div className="wrap-wide grid gap-12 lg:grid-cols-[260px_1fr] lg:gap-16">
          {/* sidebar */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1">
              <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3" {...editable("faq.sidebar.heading")}>
                {c("faq.sidebar.heading", "Categories")}
              </div>
              {FAQ_CATEGORIES.map((cat, ci) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToTarget(`#${cat.id}`, -90)}
                  className={cn(
                    "block w-full rounded-xl px-3 py-2 text-left text-[13.5px] transition-colors",
                    active === cat.id && !q
                      ? "bg-blue-mist font-semibold text-blue-ink"
                      : "text-ink-2 hover:bg-ink/5 hover:text-ink"
                  )}
                >
                  <span {...editable(`faq.cat${ci}.title`)}>{c(`faq.cat${ci}.title`, cat.title)}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* content */}
          <div className="min-w-0">
            {cats.length === 0 && (
              <div className="rounded-3xl border border-line bg-paper p-10 text-center">
                <p className="text-ink-2">
                  No questions match “{query}”.{" "}
                  <button onClick={() => setQuery("")} className="font-semibold text-blue">
                    Clear search
                  </button>
                </p>
              </div>
            )}

            <div className="space-y-14">
              {cats.map((cat) => {
                const ci = FAQ_CATEGORIES.findIndex((x) => x.id === cat.id);
                return (
                <section key={cat.id} id={cat.id} data-cat={cat.id} className="scroll-mt-24">
                  <h2 className="mb-5 font-display text-[clamp(24px,3vw,34px)] tracking-[-0.01em] text-ink" {...editable(`faq.cat${ci}.title`)}>
                    {c(`faq.cat${ci}.title`, cat.title)}
                  </h2>
                  <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                    {cat.items.map((it, i) => {
                      const id = `${cat.id}-${i}`;
                      const ii = FAQ_CATEGORIES[ci].items.findIndex((x) => x.q === it.q);
                      const isOpen = open === id;
                      return (
                        <div key={id}>
                          <button
                            onClick={() => setOpen(isOpen ? null : id)}
                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-canvas"
                          >
                            <span className="text-[15.5px] font-semibold text-ink" {...editable(`faq.cat${ci}.item${ii}.q`)}>{c(`faq.cat${ci}.item${ii}.q`, it.q)}</span>
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
                              isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                            )}
                          >
                            <div className="overflow-hidden">
                              <div className="space-y-3 px-5 pb-5 pt-0.5">
                                {it.a.map((p, j) => (
                                  <p key={j} className="max-w-2xl text-[14.5px] leading-relaxed text-ink-2" {...editable(`faq.cat${ci}.item${ii}.a${j}`, "richtext")}>
                                    {c(`faq.cat${ci}.item${ii}.a${j}`, p)}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
                );
              })}
            </div>

            {/* contact CTA */}
            <div className="mt-14 flex flex-col items-start gap-5 rounded-3xl border border-line bg-paper p-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-2xl text-ink" {...editable("faq.contact.title")}>{c("faq.contact.title", "Still have a question?")}</h3>
                <p className="mt-1 text-[14.5px] text-ink-2" {...editable("faq.contact.body", "richtext")}>
                  <span>{c("faq.contact.body", "Start free in minutes, or email us at ")}</span>
                  <a href="mailto:info@aireastudio.ai" className="font-semibold text-blue">
                    info@aireastudio.ai
                  </a>
                  .
                </p>
              </div>
              <Button href={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow>
                <span {...editable("faq.contact.cta")}>{c("faq.contact.cta", "Start 14-day free trial")}</span>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
