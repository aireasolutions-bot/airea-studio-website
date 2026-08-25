import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, FolderOpen, Search, Star } from "lucide-react";
import { CtaButton, EditableEyebrow } from "@/components/ui";
import { PageSections } from "@/components/PageSections";
import { RobotHead } from "@/components/RobotHead";
import { FaqAccordion } from "@/components/FaqAccordion";
import { SIGN_UP_URL } from "@/lib/site";
import { fetchFaq, itemsInCategory, topItems, answerText, type FaqData } from "@/lib/faq";
import { useC, editable } from "@/content/ContentProvider";
import { Seo } from "@/components/Seo";
import { faqSchema, breadcrumbSchema } from "@/lib/seo";

/* Help center hub: search + category cards + Top FAQs. Individual questions
 * live on category pages (/faq/<category>) and their own standalone pages
 * (/faq/<question>) — managed in the admin's Help Center. */


/* Emails and URLs typed into the contact copy become live links automatically —
 * the team writes one plain sentence in the admin and never touches markup.
 * (The old version appended a hard-coded email AFTER the editable text, which
 * doubled it the moment someone typed the address into the copy.) */
const LINKIFY = /(https?:\/\/[^\s<]+[^\s<.,:;!?)\]]|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;
function Linkify({ text }: { text: string }) {
  return (
    <>
      {text.split(LINKIFY).map((part, i) => {
        if (i % 2 === 0) return part;
        const href = part.includes("@") && !part.startsWith("http") ? `mailto:${part}` : part;
        return (
          <a key={i} href={href} className="font-semibold text-blue hover:underline">
            {part}
          </a>
        );
      })}
    </>
  );
}

export function FaqPage() {
  const c = useC();
  const navigate = useNavigate();
  const [data, setData] = useState<FaqData | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let live = true;
    fetchFaq().then((d) => live && setData(d));
    return () => { live = false; };
  }, []);

  // Old deep links (/faq#right-for-me) used category anchors — category slugs
  // kept those ids, so forward the hash to the category's real page.
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && data?.categories.some((cat) => cat.slug === hash)) {
      navigate(`/faq/${hash}`, { replace: true });
    }
  }, [data, navigate]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q || !data) return [];
    return data.items
      .filter((it) => (it.question + " " + it.answer).toLowerCase().includes(q))
      .slice(0, 12);
  }, [q, data]);

  const top = data ? topItems(data) : [];

  const header = (
    <section className="relative overflow-hidden pb-12 pt-32 md:pt-40">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" />
      <div className="wrap text-center">
        <div className="mb-6 flex justify-center">
          <RobotHead size={96} />
        </div>
        <div className="flex justify-center">
          <EditableEyebrow k="faq.eyebrow" defaultLabel="Help center" />
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-[clamp(40px,6.5vw,72px)] leading-[1.02] tracking-[-0.02em] text-ink" {...editable("faq.title")}>
          {c("faq.title")}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[clamp(15px,1.5vw,18px)] text-ink-2" {...editable("faq.intro", "richtext")}>
          {c("faq.intro")}
        </p>

        <div className="relative mx-auto mt-8 max-w-md">
          <div className="flex items-center gap-2.5 rounded-full border border-line-2 bg-white px-5 py-3.5 shadow-soft focus-within:border-blue">
            <Search className="h-4.5 w-4.5 shrink-0 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={data ? `Search ${data.items.length} answers…` : "Search answers…"}
              className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-[12px] font-medium text-ink-3 hover:text-ink">
                Clear
              </button>
            )}
          </div>

          {q && (
            <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-line bg-white text-left shadow-lift">
              {results.length === 0 ? (
                <p className="px-5 py-4 text-[14px] text-ink-2">No answers match “{query}”.</p>
              ) : (
                results.map((it) => (
                  <Link
                    key={it.id}
                    to={`/faq/${it.slug}`}
                    className="block border-b border-line px-5 py-3.5 transition-colors last:border-0 hover:bg-canvas"
                  >
                    <span className="block text-[14px] font-semibold text-ink">{it.question}</span>
                    <span className="mt-0.5 block text-[12.5px] text-ink-3">{answerText(it.answer, 110)}</span>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const body = (
    <section className="pb-24 md:pb-28">
      <div className="wrap-wide">
        {/* category cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(data?.categories ?? []).map((cat) => {
            const count = data ? itemsInCategory(data, cat.slug).length : 0;
            if (!count) return null;
            return (
              <Link
                key={cat.id}
                to={`/faq/${cat.slug}`}
                className="group flex flex-col rounded-3xl border border-line bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-blue/40 hover:shadow-lift"
              >
                <FolderOpen className="h-6 w-6 text-blue" />
                <h2 className="mt-4 text-[16px] font-semibold leading-snug text-ink">{cat.name}</h2>
                {cat.description && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{cat.description}</p>}
                <span className="mt-auto flex items-center gap-1 pt-4 text-[13px] font-semibold text-blue">
                  {count} {count === 1 ? "answer" : "answers"}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>

        {/* top faqs — every item the team flags, no fixed number */}
        {top.length > 0 && (
          <div className="mt-16">
            <div className="mb-5 flex items-center gap-2.5">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <h2 className="font-display text-[clamp(24px,3vw,34px)] tracking-[-0.01em] text-ink" {...editable("faq.top.heading")}>
                {c("faq.top.heading", "Top FAQs")}
              </h2>
            </div>
            <FaqAccordion items={top} />
          </div>
        )}

        {/* contact CTA */}
        <div className="mt-14 flex flex-col items-start gap-5 rounded-3xl border border-line bg-paper p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-2xl text-ink" {...editable("faq.contact.title")}>{c("faq.contact.title", "Still have a question?")}</h3>
            <p className="mt-1 text-[14.5px] text-ink-2" {...editable("faq.contact.body", "richtext")}>
              <Linkify text={c("faq.contact.body", "Start free in minutes, or email us at info@aireastudio.ai.")} />
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <CtaButton k="faq.contact.demo" defaultLabel="Book a demo" defaultHref="mailto:info@aireastudio.ai?subject=Demo%20request" variant="ghost" size="lg" />
            <CtaButton k="faq.contact.cta" defaultLabel="Start 14-day free trial" defaultHref={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow />
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <>
      <Seo
        path="/faq"
        jsonLd={
          data
            ? [
                faqSchema(top.map((it) => ({ q: it.question, a: answerText(it.answer, 500) }))),
                breadcrumbSchema([{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }]),
              ]
            : undefined
        }
      />
      <PageSections page="faq" sections={{ header, body }} />
    </>
  );
}
