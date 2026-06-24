import { cn } from "@/lib/cn";

type PhoneFrameProps = {
  src: string;
  alt?: string;
  className?: string;
  /** screen width in px (frame scales around it) */
  width?: number;
  glare?: boolean;
};

export function PhoneFrame({
  src,
  alt = "",
  className,
  width = 300,
  glare = true,
}: PhoneFrameProps) {
  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width }}
    >
      <div className="relative rounded-[2.6rem] bg-ink p-[6px] shadow-[0_2px_4px_rgba(16,24,40,0.08),0_40px_80px_-32px_rgba(16,24,40,0.45)] ring-1 ring-black/5">
        {/* side buttons */}
        <span className="absolute -left-[2px] top-24 h-12 w-[3px] rounded-l bg-ink/80" />
        <span className="absolute -right-[2px] top-20 h-8 w-[3px] rounded-r bg-ink/80" />
        <div className="relative overflow-hidden rounded-[2.2rem] bg-white">
          {/* dynamic island */}
          <div className="absolute left-1/2 top-2 z-20 h-[22px] w-[78px] -translate-x-1/2 rounded-full bg-ink" />
          <img src={src} alt={alt} className="block w-full" draggable={false} />
          {glare && (
            <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-transparent via-white/0 to-white/20" />
          )}
        </div>
      </div>
    </div>
  );
}
