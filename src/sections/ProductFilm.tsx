import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/ui";
import { useC, resolveAsset, editable } from "@/content/ContentProvider";

export function ProductFilm() {
  const c = useC();
  return (
    <section className="py-24 md:py-32">
      <div className="wrap-wide">
        <SectionHeading
          align="center"
          tag={<span {...editable("home.film.tag")}>{c("home.film.tag")}</span>}
          title={
            <>
              <span {...editable("home.film.title_lead")}>{c("home.film.title_lead")}</span>
              <span className="italic-blue" {...editable("home.film.title_accent")}>{c("home.film.title_accent")}</span>
              <span {...editable("home.film.title_tail")}>{c("home.film.title_tail")}</span>
            </>
          }
        />
        <Reveal className="mt-12">
          <div className="relative mx-auto max-w-4xl">
            <span
              className="absolute inset-x-10 -bottom-6 -z-10 h-24 rounded-full blur-3xl"
              style={{ background: "rgba(0,71,255,0.25)" }}
            />
            <div className="overflow-hidden rounded-[28px] border border-line bg-ink p-2 shadow-[0_40px_90px_-30px_rgba(16,24,40,0.5)]">
              <span style={{ display: "contents" }} {...editable("home.film.poster", "image")}>
                <video
                  key={c("home.film.video")}
                  className="w-full rounded-[20px]"
                  src={resolveAsset(c("home.film.video"))}
                  poster={resolveAsset(c("home.film.poster", "assets/video/airea-widescreen-poster.jpg"))}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  {...editable("home.film.video", "image")}
                />
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
