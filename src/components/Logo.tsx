import { cn } from "@/lib/cn";

type LogoProps = {
  wordmark?: boolean;
  className?: string;
  light?: boolean;
};

export function Logo({ wordmark = true, className, light = false }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5 select-none", className)}>
      <img
        src="/assets/brand/logo.png"
        alt="AIREA Studio"
        draggable={false}
        className={cn("h-[26px] w-auto md:h-7", light && "brightness-0 invert")}
      />
      {wordmark && (
        <span
          className={cn(
            "font-mono text-[12.5px] font-medium uppercase tracking-[0.2em]",
            light ? "text-white" : "text-ink"
          )}
        >
          AIREA&nbsp;Studio
        </span>
      )}
    </span>
  );
}
