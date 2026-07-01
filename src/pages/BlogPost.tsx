import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, ExternalLink } from "lucide-react";
import { Button, Eyebrow } from "@/components/ui";
import { Seo } from "@/components/Seo";
import { Markdown } from "@/components/Markdown";
import { breadcrumbSchema } from "@/lib/seo";
import { SIGN_UP_URL } from "@/lib/site";
import { fetchPostBySlug, articleSchema, formatDate, type BlogPost as Post } from "@/lib/blog";

export function BlogPost() {
  const { slug = "" } = useParams();
  const [post, setPost] = useState<Post | null | undefined>(undefined); // undefined = loading
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setPost(undefined);
    setError(null);
    fetchPostBySlug(slug)
      .then((p) => live && setPost(p))
      .catch((e) => live && setError(e?.message || "Couldn't load this article."));
    return () => {
      live = false;
    };
  }, [slug]);

  // loading
  if (post === undefined && !error) {
    return (
      <div className="wrap pb-24 pt-36 md:pt-44">
        <div className="mx-auto max-w-[720px] space-y-5">
          <div className="h-4 w-24 animate-pulse rounded bg-ink/[0.06]" />
          <div className="h-12 w-full animate-pulse rounded bg-ink/[0.08]" />
          <div className="h-72 w-full animate-pulse rounded-3xl bg-ink/[0.05]" />
          <div className="h-4 w-full animate-pulse rounded bg-ink/[0.05]" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-ink/[0.05]" />
        </div>
      </div>
    );
  }

  // not found / error
  if (error || post === null) {
    return (
      <>
        <Seo path={`/blog/${slug}`} title="Article not found — AIREA Studio" noindex />
        <div className="wrap grid min-h-[60vh] place-items-center py-32 text-center">
          <div>
            <h1 className="font-display text-4xl text-ink">{error ? "Something went wrong" : "Article not found"}</h1>
            <p className="mx-auto mt-3 max-w-md text-ink-2">
              {error || "This article may have moved or is no longer published."}
            </p>
            <Link to="/blog" className="mt-6 inline-flex items-center gap-1.5 font-semibold text-blue">
              <ArrowLeft className="h-4 w-4" /> Back to the journal
            </Link>
          </div>
        </div>
      </>
    );
  }

  const p = post as Post;
  const sources = Array.isArray(p.sources) ? p.sources.filter((s) => s?.url) : [];

  return (
    <>
      <Seo
        path={`/blog/${p.slug}`}
        type="article"
        title={p.seo_title || p.title}
        description={p.seo_description || p.excerpt || undefined}
        image={p.cover_image || undefined}
        jsonLd={[
          articleSchema(p),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: p.title, path: `/blog/${p.slug}` },
          ]),
        ]}
      />

      <article className="relative pb-24 pt-32 md:pt-40">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-blue-radial" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-grid opacity-[0.3] [mask-image:radial-gradient(ellipse_at_top,black,transparent_60%)]" />

        {/* header */}
        <header className="wrap">
          <div className="mx-auto max-w-[760px]">
            <Link to="/blog" className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-2 transition-colors hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> The AIREA Journal
            </Link>
            <div className="mt-6 flex items-center gap-3">
              {p.category && <Eyebrow>{p.category}</Eyebrow>}
            </div>
            <h1 className="mt-5 font-display text-[clamp(32px,5vw,56px)] leading-[1.05] tracking-[-0.02em] text-ink">
              {p.title}
            </h1>
            {p.excerpt && <p className="mt-5 text-[clamp(16px,1.7vw,20px)] leading-relaxed text-ink-2">{p.excerpt}</p>}
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13.5px] text-ink-3">
              <span className="font-medium text-ink-2">{p.author || "The AIREA Team"}</span>
              {p.published_at && (
                <>
                  <span aria-hidden>·</span>
                  <time dateTime={p.published_at}>{formatDate(p.published_at)}</time>
                </>
              )}
              {p.reading_minutes ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {p.reading_minutes} min read
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </header>

        {/* cover */}
        {p.cover_image && (
          <div className="wrap mt-10">
            <div className="mx-auto max-w-[960px] overflow-hidden rounded-[28px] border border-line">
              <img src={p.cover_image} alt="" className="aspect-[16/8] w-full object-cover" />
            </div>
          </div>
        )}

        {/* body */}
        <div className="wrap mt-12">
          <div className="mx-auto max-w-[720px]">
            <Markdown content={p.body} />

            {/* tags */}
            {p.tags && p.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span key={t} className="rounded-full border border-line bg-paper px-3 py-1 text-[12.5px] text-ink-2">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* sources */}
            {sources.length > 0 && (
              <div className="mt-12 rounded-3xl border border-line bg-paper p-7">
                <h2 className="font-display text-lg text-ink">Sources & further reading</h2>
                <ul className="mt-4 space-y-2.5">
                  {sources.map((s, i) => (
                    <li key={i}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener nofollow"
                        className="inline-flex items-start gap-1.5 text-[14px] text-blue underline decoration-blue/25 underline-offset-2 hover:decoration-blue"
                      >
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">{s.title || s.url}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA */}
            <div className="mt-14 overflow-hidden rounded-[28px] border border-line bg-[radial-gradient(120%_140%_at_0%_0%,#0047FF_0%,#0033B8_100%)] p-8 text-white md:p-10">
              <h2 className="font-display text-[clamp(22px,3vw,32px)] leading-tight tracking-[-0.01em]">
                Put this into practice — without lifting a finger
              </h2>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/80">
                AIREA Studio turns one brief into a full, on-brand campaign across every channel. Train your Brand DNA once, then ship in minutes.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href={SIGN_UP_URL} variant="ghost" size="lg" magnetic arrow>
                  Start 14-day free trial
                </Button>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center rounded-full border border-white/25 px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
                >
                  See how it works
                </Link>
              </div>
            </div>

            {/* back */}
            <div className="mt-12 border-t border-line pt-8">
              <Link to="/blog" className="inline-flex items-center gap-1.5 font-semibold text-blue">
                <ArrowLeft className="h-4 w-4" /> More from the journal
              </Link>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
