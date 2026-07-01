import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { Button, Eyebrow } from "@/components/ui";
import { RobotHead } from "@/components/RobotHead";
import { Seo } from "@/components/Seo";
import { breadcrumbSchema } from "@/lib/seo";
import { SIGN_UP_URL } from "@/lib/site";
import { fetchPublishedPosts, blogListSchema, formatDate, type BlogCard } from "@/lib/blog";

function CoverArt({ post, className }: { post: BlogCard; className?: string }) {
  if (post.cover_image)
    return <img src={post.cover_image} alt="" loading="lazy" className={`h-full w-full object-cover ${className || ""}`} />;
  // Branded fallback when no cover image is set yet.
  return (
    <div className={`relative grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(120%_120%_at_20%_0%,#0047FF_0%,#0033B8_55%,#001A63_100%)] ${className || ""}`}>
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
      <span className="select-none font-display text-[15px] font-semibold uppercase tracking-[0.28em] text-white/85">
        {post.category || "AIREA"}
      </span>
    </div>
  );
}

function Meta({ post, light }: { post: BlogCard; light?: boolean }) {
  const dim = light ? "text-white/70" : "text-ink-3";
  return (
    <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] ${dim}`}>
      <span>{post.author || "The AIREA Team"}</span>
      {post.published_at && (
        <>
          <span aria-hidden>·</span>
          <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
        </>
      )}
      {post.reading_minutes ? (
        <>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {post.reading_minutes} min read
          </span>
        </>
      ) : null}
    </div>
  );
}

function Card({ post }: { post: BlogCard }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:border-line-2 hover:shadow-soft"
    >
      <div className="aspect-[16/10] overflow-hidden">
        <CoverArt post={post} className="transition-transform duration-500 group-hover:scale-[1.04]" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        {post.category && (
          <span className="mb-3 w-fit rounded-full bg-blue-mist px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-blue-ink">
            {post.category}
          </span>
        )}
        <h3 className="font-display text-[21px] leading-[1.2] tracking-[-0.01em] text-ink transition-colors group-hover:text-blue">
          {post.title}
        </h3>
        {post.excerpt && <p className="mt-2.5 line-clamp-3 text-[14.5px] leading-relaxed text-ink-2">{post.excerpt}</p>}
        <div className="mt-5 pt-1">
          <Meta post={post} />
        </div>
      </div>
    </Link>
  );
}

export function Blog() {
  const [posts, setPosts] = useState<BlogCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchPublishedPosts()
      .then((p) => live && setPosts(p))
      .catch((e) => live && setError(e?.message || "Couldn't load posts."));
    return () => {
      live = false;
    };
  }, []);

  const [featured, ...rest] = posts || [];

  return (
    <>
      <Seo
        path="/blog"
        title="AI Marketing Insights & Guides — AIREA Studio Blog"
        description="Practical, current guides on AI marketing, content, ads, SEO, email, and growth for small businesses and e-commerce brands. From the team behind AIREA Studio."
        jsonLd={[
          blogListSchema(posts || []),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
        ]}
      />

      {/* header */}
      <section className="relative overflow-hidden pb-14 pt-32 md:pt-40">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-blue-radial" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_65%)]" />
        <div className="wrap text-center">
          <div className="mb-6 flex justify-center">
            <RobotHead size={92} />
          </div>
          <div className="flex justify-center">
            <Eyebrow>The AIREA Journal</Eyebrow>
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-[clamp(40px,6.5vw,72px)] leading-[1.02] tracking-[-0.02em] text-ink">
            AI marketing, made practical
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[clamp(15px,1.5vw,18px)] text-ink-2">
            Current, no-fluff guides on using AI to plan, create, and ship marketing that actually grows a small business — researched and written by the AIREA team.
          </p>
        </div>
      </section>

      {/* body */}
      <section className="pb-24 md:pb-28">
        <div className="wrap-wide">
          {error && (
            <div className="rounded-3xl border border-line bg-paper p-10 text-center text-ink-2">{error}</div>
          )}

          {!error && posts === null && (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-3xl border border-line bg-white">
                  <div className="aspect-[16/10] animate-pulse bg-ink/[0.05]" />
                  <div className="space-y-3 p-6">
                    <div className="h-3 w-20 animate-pulse rounded bg-ink/[0.06]" />
                    <div className="h-5 w-4/5 animate-pulse rounded bg-ink/[0.08]" />
                    <div className="h-4 w-full animate-pulse rounded bg-ink/[0.05]" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!error && posts && posts.length === 0 && (
            <div className="mx-auto max-w-lg rounded-3xl border border-line bg-paper p-12 text-center">
              <h2 className="font-display text-2xl text-ink">Fresh insights are on the way</h2>
              <p className="mt-2 text-ink-2">Our first articles are being researched right now. Check back very soon.</p>
              <div className="mt-6 flex justify-center">
                <Button href={SIGN_UP_URL} variant="primary" size="lg" magnetic arrow>
                  Start your free trial
                </Button>
              </div>
            </div>
          )}

          {!error && posts && posts.length > 0 && (
            <>
              {/* featured */}
              <Link
                to={`/blog/${featured.slug}`}
                className="group mb-12 grid overflow-hidden rounded-[28px] border border-line bg-white transition-all duration-300 hover:border-line-2 hover:shadow-soft lg:grid-cols-2"
              >
                <div className="aspect-[16/10] overflow-hidden lg:aspect-auto">
                  <CoverArt post={featured} className="transition-transform duration-500 group-hover:scale-[1.04]" />
                </div>
                <div className="flex flex-col justify-center p-8 md:p-12">
                  <div className="mb-4 flex items-center gap-2.5">
                    <span className="rounded-full bg-blue px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                      Featured
                    </span>
                    {featured.category && (
                      <span className="text-[12px] font-semibold uppercase tracking-wider text-blue-ink">{featured.category}</span>
                    )}
                  </div>
                  <h2 className="font-display text-[clamp(26px,3.4vw,40px)] leading-[1.08] tracking-[-0.015em] text-ink transition-colors group-hover:text-blue">
                    {featured.title}
                  </h2>
                  {featured.excerpt && <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-2">{featured.excerpt}</p>}
                  <div className="mt-6">
                    <Meta post={featured} />
                  </div>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-blue">
                    Read article <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>

              {/* rest */}
              {rest.length > 0 && (
                <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((p) => (
                    <Card key={p.id} post={p} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
