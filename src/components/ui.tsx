import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useMagnetic } from "@/hooks/useMagnetic";
import { scrollToTarget } from "@/hooks/useSmoothScroll";
import { useC, editable, parseLink, isEdit } from "@/content/ContentProvider";

/* ---------------- Button ---------------- */

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "ghost" | "dark" | "soft";
  size?: "md" | "lg";
  to?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  arrow?: boolean;
  magnetic?: boolean;
  iconLeft?: ReactNode;
};

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-blue text-white shadow-[0_12px_30px_-10px_rgba(0,71,255,0.65)] hover:bg-blue-ink hover:shadow-[0_18px_44px_-12px_rgba(0,71,255,0.75)]",
  ghost:
    "bg-white text-ink border border-line-2 hover:border-ink-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
  dark: "bg-ink text-white hover:bg-black",
  soft: "bg-blue-mist text-blue-ink hover:bg-[#dce6ff]",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  to,
  href,
  onClick,
  className,
  arrow,
  magnetic,
  iconLeft,
}: ButtonProps) {
  const magRef = useMagnetic<HTMLSpanElement>(0.3);
  const classes = cn(
    "group inline-flex items-center justify-center gap-2 rounded-full font-semibold leading-none transition-all duration-300 ease-out will-change-transform",
    size === "lg" ? "px-7 py-4 text-[15px]" : "px-5 py-3 text-[14px]",
    VARIANTS[variant],
    className
  );

  const content = (
    <>
      {iconLeft}
      {children}
      {arrow && (
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      )}
    </>
  );

  let el: ReactNode;
  if (to && to.includes("#")) {
    el = (
      <button
        className={classes}
        onClick={() => {
          const hash = to.slice(to.indexOf("#"));
          if (window.location.pathname === "/" || to.startsWith("#")) {
            scrollToTarget(hash);
          } else {
            window.location.href = to;
          }
          onClick?.();
        }}
      >
        {content}
      </button>
    );
  } else if (to) {
    el = (
      <Link to={to} className={classes} onClick={onClick}>
        {content}
      </Link>
    );
  } else if (href) {
    el = (
      <a href={href} target="_blank" rel="noreferrer" className={classes} onClick={onClick}>
        {content}
      </a>
    );
  } else {
    el = (
      <button className={classes} onClick={onClick}>
        {content}
      </button>
    );
  }

  if (magnetic) return <span ref={magRef} className="inline-flex">{el}</span>;
  return el;
}

/* ---------------- CtaButton ----------------
 * A fully content-managed Button: label from content key `k`, destination +
 * visibility from `${k}_link` ({"href", "visible"} — see parseLink). The team
 * edits label, URL, and show/hide from the admin (panel or click-on-canvas).
 * Hidden buttons render nothing on the live site, but stay visible (ghosted)
 * on the edit canvas so they can be clicked and re-enabled. */

type CtaButtonProps = Omit<ButtonProps, "children" | "to" | "href"> & {
  k: string;
  defaultLabel: string;
  defaultHref: string;
};

export function CtaButton({ k, defaultLabel, defaultHref, ...rest }: CtaButtonProps) {
  const c = useC();
  const link = parseLink(c(`${k}_link`), defaultHref);
  const label = <span {...editable(k, "cta")}>{c(k, defaultLabel)}</span>;
  const internal = link.href.startsWith("/") || link.href.startsWith("#");

  if (!link.visible && !isEdit()) return null;

  const btn = internal ? (
    <Button to={link.href} {...rest}>{label}</Button>
  ) : (
    <Button href={link.href} {...rest}>{label}</Button>
  );

  if (!link.visible) {
    // Edit canvas only: show the hidden button ghosted so it stays editable.
    return (
      <span className="inline-flex rounded-full opacity-40 outline-dashed outline-2 outline-offset-2 outline-ink-3" title="Hidden — click to edit & re-enable">
        {btn}
      </span>
    );
  }
  return btn;
}

/* ---------------- Tag / Eyebrow ---------------- */

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 tag", className)}>
      <span className="h-px w-6 bg-current opacity-40" />
      {children}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-line-2 bg-white/70 px-3.5 py-1.5 text-[12.5px] font-medium text-ink-2 backdrop-blur",
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue" />
      </span>
      {children}
    </span>
  );
}

/* ---------------- Section heading ---------------- */

export function SectionHeading({
  tag,
  title,
  sub,
  align = "left",
  className,
  light = false,
}: {
  tag?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  align?: "left" | "center";
  className?: string;
  light?: boolean;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {tag && (
        <Tag className={cn("mb-5", light ? "text-white/60" : "text-ink-3")}>{tag}</Tag>
      )}
      <h2
        className={cn(
          "font-display text-[clamp(32px,5vw,58px)] leading-[1.03] tracking-[-0.01em]",
          light ? "text-white" : "text-ink"
        )}
      >
        {title}
      </h2>
      {sub && (
        <p
          className={cn(
            "mt-5 text-[clamp(15px,1.5vw,18px)]",
            align === "center" && "mx-auto",
            light ? "text-white/65" : "text-ink-2",
            "max-w-xl"
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
