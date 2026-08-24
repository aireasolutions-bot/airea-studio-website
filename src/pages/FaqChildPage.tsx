import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, FolderOpen } from "lucide-react";
import { CtaButton } from "@/components/ui";
import { Seo } from "@/components/Seo";
import { Markdown } from "@/components/Markdown";
import { FaqAccordion } from "@/components/FaqAccordion";
import { faqSchema, breadcrumbSchema } from "@/lib/seo";
import { SIGN_UP_URL } from "@/lib/site";
import { fetchFaq, fetchFaqItem, itemsInCategory, answerText, type FaqData, type FaqItem } from "@/lib/faq";
import { isPreview } from "@/content/ContentProvider";
import { trackContentView } from "@/lib/analytics";

/* /faq/<slug> — one route, two shapes. Categories and questions share a slug
 * namespace (the admin enforces uniqueness), so this resolves the slug against
 * categories first, then questions. Every question gets a standalone,
 * crawlable page: that's what search engines and LLMs index and recommend. */

export function FaqChildPage() {
  const { slug = "" } = useParams();
  const [data, setData] = useState<FaqData | null>(null);
  const [draft, setDraft] = useState<FaqItem | null>(null); // preview-only fetch
  const [checkedDraft, setCheckedDraft] = useState(false);

  useEffect(() => {
    let live = true;
    setData(null); setDraft(null); setCheckedDraft(false);
    fetchFaq().then((d) => live && setData(d));
    return () => { live = false; };
  }, [slug]);

  const category = data?.categories.find((c) => c.slug === slug) ?? null;
  const published = data?.items.find((i) => i.slug === slug) ?? null;

  // Admin previewing an unpublished question: their session passes RLS, so a
  // direct fetch returns the draft that the public list query can't see.
  useEffect(() => {
    if (!data || category || published || !isPreview()) { setCheckedDraft(!!data); return; }
    let live = true;
    fetchFaqItem(slug).then((it) => { if (live) { setDraft(it); setCheckedDraft(true); } });
    return () => { live = false; };
  }, [data, category, published, slug]);

  const item = published ?? draft;

  useEffect(() => {
    if (item && !isPreview()) trackContentView(item.question, "page");
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div className="min-h-[60vh]" />;
  if (!category && !item && checkedDraft) return <Navigate to="/faq" replace />;

  /* ── category page ── */
  if (category) {
    const items = itemsInCategory(data, category.slug);
    const others = data.categories.filter((c) => c.slug !== category.slug && itemsInCategory(data, c.slug).length);
    return (
      <>
        <Seo
          path={`/faq/${category.slug}`}
          title={`${category.name} — AIREA Studio Help Center`}
          description={category.description || `Answers about ${category.name.toLowerCase()} from the AIREA Studio help center.`}
          jsonLd={[
            faqSchema(items.map((it) => ({ q: it.question, a: answerText(it.answer, 500) }))),
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "FAQ", path: "/faq" },
              { name: category.name, path: `/faq/${category.slug}` },
            ]),
          ]}
        />
        <section className="relative overflow-hidden pb-24 pt-32 md:pt-40">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
          <div className="wrap-wide">
            <nav className="flex items-center gap-1.5 text-[13px] text-ink-3">
              <Link to="/faq" className="font-medium hover:text-ink">Help center</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-ink-2">{category.name}</span>
            </nav>
            <div className="mt-6 flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-mist">
                <FolderOpen className="h-6 w-6 text-blue" />
              </div>
              <div>
                <h1 className="font-display text-[clamp(30px,4.5vw,48px)] leading-[1.05] tracking-[-0.015em] text-ink">{category.name}</h1>
                {category.description && <p className="mt-2 max-w-2xl text-[15.5px] text-ink-2">{category.description}</p>}
              </div>
            </div>
            <div className="mt-10">
              <FaqAccordion items={items} />
            </div>
            {others.length > 0 && (
              <div className="mt-12">
                <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">More topics</div>
                <div className="flex flex-wrap gap-2">
                  {others.map((c) => (
                    <Link key={c.id} to={`/faq/${c.slug}`} className="rounded-full border border-line-2 bg-white px-4 py-2 text-[13.5px] font-medium text-ink-2 transition-colors hover:border-blue/40 hover:text-blue">
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

  /* ── question page ── */
  if (!item) return <div className="min-h-[60vh]" />;
  const home = data.categories.find((c) => item.categories.includes(c.slug)) ?? null;
  const related = home
    ? itemsInCategory(data, home.slug).filter((i) => i.slug !== item.slug).slice(0, 5)
    : [];

  return (
    <>
      <Seo
        path={`/faq/${item.slug}`}
        title={`${item.question} — AIREA Studio`}
        description={answerText(item.answer, 160)}
        noindex={item.status !== "published"}
        jsonLd={[
          faqSchema([{ q: item.question, a: answerText(item.answer, 1200) }]),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "FAQ", path: "/faq" },
            ...(home ? [{ name: home.name, path: `/faq/${home.slug}` }] : []),
            { name: item.question, path: `/faq/${item.slug}` },
          ]),
        ]}
      />
      <section className="relative overflow-hidden pb-24 pt-32 md:pt-40">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
        <div className="wrap">
          <nav className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink-3">
            <Link to="/faq" className="font-medium hover:text-ink">Help center</Link>
            {home && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link to={`/faq/${home.slug}`} className="font-medium hover:text-ink">{home.name}</Link>
              </>
            )}
          </nav>
          {item.status !== "published" && (
            <div className="mt-4 inline-flex items-center rounded-full bg-amber-100 px-3.5 py-1.5 text-[12.5px] font-semibold text-amber-800">
              Draft preview — not visible to customers yet
            </div>
          )}
          <h1 className="mt-5 max-w-3xl font-display text-[clamp(28px,4vw,44px)] leading-[1.08] tracking-[-0.015em] text-ink">{item.question}</h1>
          <div className="prose-airea mt-8 max-w-2xl text-[15.5px] leading-relaxed text-ink-2 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-[22px] [&_h2]:text-ink [&_p]:mb-4">
            <Markdown content={item.answer} />
          </div>

          {related.length > 0 && (
            <div className="mt-14">
              <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Related questions</div>
              <ul className="space-y-2">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link to={`/faq/${r.slug}`} className="text-[14.5px] font-medium text-blue hover:underline">
                      {r.question}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-14 flex flex-col items-start gap-5 rounded-3xl border border-line bg-paper p-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-2xl text-ink">Ready to try it yourself?</h3>
              <p className="mt-1 text-[14.5px] text-ink-2">Start free in minutes — no marketing experience needed.</p>
            </div>
            <CtaButton k="faq.contact.cta" defaultLabel="Start 14-day free trial" defaultHref={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow />
          </div>

          <Link to="/faq" className="mt-10 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-2 hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Back to help center
          </Link>
        </div>
      </section>
    </>
  );
}
