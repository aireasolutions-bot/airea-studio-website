import { useState } from "react";
import { FileWarning, Film } from "lucide-react";
import { cn } from "@/lib/cn";

/* Asset thumbnail.
 *
 * The library is mostly wide UI screenshots (up to 4:1) on a white background.
 * A square `object-cover` crop of one of those shows a meaningless white sliver
 * of its middle — the grid looked like rows of empty boxes and nobody could
 * tell one asset from another. So: contain the WHOLE image inside the tile and
 * put it on a checkerboard, which reads as "this is a canvas" and gives white
 * and transparent artwork something to sit against.
 *
 * Also handles the two states a plain <img> renders as a blank box: still
 * loading, and failed to load. */

export function AssetThumb({
  src,
  filename,
  kind = "image",
  className,
}: {
  src: string;
  filename: string;
  kind?: "image" | "video" | string | null;
  className?: string;
}) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-checker", className)}>
      {state === "error" ? (
        <div className="flex flex-col items-center gap-1 px-2 text-center">
          <FileWarning className="h-5 w-5 text-ink-3" />
          <span className="line-clamp-2 text-[10px] leading-tight text-ink-3">Preview unavailable</span>
        </div>
      ) : kind === "video" ? (
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          className="max-h-full max-w-full object-contain"
          onLoadedMetadata={() => setState("ok")}
          onError={() => setState("error")}
        />
      ) : (
        <img
          src={src}
          alt={filename}
          loading="lazy"
          decoding="async"
          className={cn("max-h-full max-w-full object-contain transition-opacity duration-200", state === "ok" ? "opacity-100" : "opacity-0")}
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
        />
      )}

      {/* a quiet shimmer while it loads, so the grid never looks broken */}
      {state === "loading" && <div className="absolute inset-0 animate-pulse bg-ink/[0.04]" />}

      {kind === "video" && state !== "error" && (
        <span className="absolute bottom-1.5 left-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink/70 text-white">
          <Film className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
