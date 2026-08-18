import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { CtaButton } from "./ui";
import { cn } from "@/lib/cn";
import { SOLUTIONS, SIGN_UP_URL, SIGN_IN_URL } from "@/lib/site";
import { hrefPageSlug, pageVisibleKey } from "@/lib/pages";
import { scrollToTarget } from "@/hooks/useSmoothScroll";
import { useC, editable, parseLink, isEdit } from "@/content/ContentProvider";

/* Every menu item is fully content-managed: label at its key, destination +
 * visibility at `${key}_link` ({"href","visible"}). An item disappears from the
 * live site when it's hidden, its label is emptied, or the page it points to is
 * switched off (Global → Pages) — no ghost gaps. On the edit canvas hidden
 * items stay as dashed ghosts so they can be clicked and brought back. */

// NOTE: keys are indexed — only ever APPEND to these lists.
const ROUTE_LINKS = [
  { key: "global.nav.route0", label: "How it works", href: "/how-it-works" },
  { key: "global.nav.route1", label: "FAQ", href: "/faq" },
  { key: "global.nav.route2", label: "Blog", href: "/blog" },
];
const HASH_LINKS = [
  { key: "global.nav.hash0", label: "One photo", href: "/#campaign" },
  { key: "global.nav.hash1", label: "The Wall", href: "/#wall" },
];
// Spare slots — empty by default; fill the label + URL in the admin to add a
// brand-new menu item without code.
const EXTRA_LINKS = [
  { key: "global.nav.extra0", label: "", href: "/" },
  { key: "global.nav.extra1", label: "", href: "/" },
];

type NavItem = { key: string; label: string; href: string; visible: boolean; newTab: boolean };

function useNavItems() {
  const c = useC();
  const resolve = (key: string, defaultLabel: string, defaultHref: string): NavItem => {
    const label = c(key, defaultLabel).trim();
    const link = parseLink(c(`${key}_link`), defaultHref);
    const pageSlug = hrefPageSlug(link.href);
    const pageOn = !pageSlug || c(pageVisibleKey(pageSlug)) !== "false";
    return { key, label, href: link.href, visible: link.visible && !!label && pageOn, newTab: link.newTab };
  };
  return { c, resolve };
}

export function Nav() {
  const { c, resolve } = useNavItems();
  const editing = isEdit();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [solOpen, setSolOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? y / h : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => setOpen(false), [location.pathname]);

  const goHash = (href: string) => {
    setOpen(false);
    const hash = href.slice(href.indexOf("#"));
    if (location.pathname === "/") {
      scrollToTarget(hash);
    } else {
      navigate("/");
      setTimeout(() => scrollToTarget(hash), 650);
    }
  };

  // One item, rendered for desktop or mobile. Hidden → null on the live site,
  // dashed ghost on the edit canvas.
  const item = (it: NavItem, mobile = false): ReactNode => {
    const cls = mobile
      ? "border-b border-line py-4 text-left font-display text-3xl text-ink"
      : "rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink";
    if (!it.visible) {
      if (!editing) return null;
      return (
        <span
          key={it.key}
          {...editable(it.key, "cta")}
          title="Hidden — click to edit & bring it back"
          className={cn(
            "rounded-lg px-3 py-2 text-[12px] font-medium text-ink-3 opacity-50 outline-dashed outline-1 outline-offset-2 outline-ink-3",
            mobile && "py-4 text-xl"
          )}
        >
          {it.label || "Hidden item"}
        </span>
      );
    }
    const isHash = it.href.includes("#");
    const internal = it.href.startsWith("/") || it.href.startsWith("#");
    if (isHash && internal) {
      return (
        <button key={it.key} onClick={() => goHash(it.href)} className={cls} {...editable(it.key, "cta")}>
          {it.label}
        </button>
      );
    }
    if (internal) {
      return (
        <Link key={it.key} to={it.href} className={cls} {...editable(it.key, "cta")}>
          {it.label}
        </Link>
      );
    }
    return (
      <a key={it.key} href={it.href} {...(it.newTab ? { target: "_blank", rel: "noopener" } : {})} className={cls} {...editable(it.key, "cta")}>
        {it.label}
      </a>
    );
  };

  const routeItems = ROUTE_LINKS.map((l) => resolve(l.key, l.label, l.href));
  const hashItems = HASH_LINKS.map((l) => resolve(l.key, l.label, l.href));
  const extraItems = EXTRA_LINKS.map((l) => resolve(l.key, l.label, l.href));
  const pricingItem = resolve("global.nav.pricing_label", "Pricing", "/pricing");
  const solutionItems = SOLUTIONS.map((s, i) => resolve(`global.nav.solution${i}.label`, s.label, s.to));
  const solutionsLabel = c("global.nav.solutions_label", "Solutions").trim();
  const solutionsVisible = !!solutionsLabel && solutionItems.some((s) => s.visible);

  return (
    <>
      <div
        className="fixed left-0 top-0 z-[120] h-[2px] bg-blue"
        style={{ width: `${progress * 100}%` }}
      />
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[110] transition-all duration-300",
          scrolled
            ? "border-b border-line bg-canvas/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <div className="wrap-wide flex h-[64px] items-center justify-between gap-6">
          <Link to="/" aria-label="AIREA Studio home">
            <Logo />
          </Link>

          {/* desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {routeItems.map((it) => item(it))}
            {hashItems.map((it) => item(it))}
            {extraItems.map((it) => item(it))}

            {(solutionsVisible || editing) && (
              <div
                className="relative"
                onMouseEnter={() => setSolOpen(true)}
                onMouseLeave={() => setSolOpen(false)}
              >
                <button
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                    solutionsVisible ? "text-ink-2 hover:bg-ink/5 hover:text-ink" : "text-ink-3 opacity-50 outline-dashed outline-1 outline-offset-2 outline-ink-3"
                  )}
                >
                  <span {...editable("global.nav.solutions_label")}>{solutionsLabel || "Solutions (hidden)"}</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>
                <div
                  className={cn(
                    "absolute left-0 top-full w-64 pt-3 transition-all duration-200",
                    solOpen
                      ? "pointer-events-auto translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-1 opacity-0"
                  )}
                >
                  <div className="card overflow-hidden p-2">
                    {solutionItems.map((it, i) =>
                      it.visible ? (
                        <Link key={it.key} to={it.href} className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-blue-mist">
                          <div className="text-[14px] font-semibold text-ink" {...editable(it.key, "cta")}>{it.label}</div>
                          <div className="text-[12.5px] text-ink-3" {...editable(`global.nav.solution${i}.desc`)}>
                            {c(`global.nav.solution${i}.desc`, SOLUTIONS[i]?.desc ?? "")}
                          </div>
                        </Link>
                      ) : editing ? (
                        <span key={it.key} {...editable(it.key, "cta")} className="block rounded-xl px-3 py-2.5 text-[13px] text-ink-3 opacity-50 outline-dashed outline-1 -outline-offset-2 outline-ink-3">
                          {it.label || "Hidden item"}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              </div>
            )}

            {item(pricingItem)}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {parseLink(c("global.nav.login_link"), SIGN_IN_URL).visible && (
              <a
                href={parseLink(c("global.nav.login_link"), SIGN_IN_URL).href}
                {...(parseLink(c("global.nav.login_link"), SIGN_IN_URL).newTab ? { target: "_blank", rel: "noopener" } : {})}
                className="px-3 py-2 text-[13.5px] font-medium text-ink-2 transition-colors hover:text-ink"
                {...editable("global.nav.login", "cta")}
              >
                {c("global.nav.login", "Log in")}
              </a>
            )}
            <CtaButton k="global.nav.cta" defaultLabel="Start free" defaultHref={SIGN_UP_URL} variant="primary" magnetic arrow />
          </div>

          {/* mobile toggle */}
          <button
            className="grid h-10 w-10 place-items-center rounded-xl border border-line-2 bg-white/70 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* mobile menu */}
      <div
        className={cn(
          "fixed inset-0 z-[105] bg-canvas transition-all duration-300 lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto px-6 pb-8 pt-24">
          <div className="flex flex-col gap-1">
            {routeItems.map((it) => item(it, true))}
            {hashItems.map((it) => item(it, true))}
            {extraItems.map((it) => item(it, true))}
            {solutionItems.map((it) => item(it, true))}
            {item(pricingItem, true)}
          </div>
          <div className="mt-auto flex flex-col gap-3 pt-8">
            <CtaButton k="global.nav.cta_mobile" defaultLabel="Start 14-day free trial" defaultHref={SIGN_UP_URL} variant="primary" size="lg" arrow />
            {parseLink(c("global.nav.login_link"), SIGN_IN_URL).visible && (
              <a
                href={parseLink(c("global.nav.login_link"), SIGN_IN_URL).href}
                {...(parseLink(c("global.nav.login_link"), SIGN_IN_URL).newTab ? { target: "_blank", rel: "noopener" } : {})}
                className="text-center text-sm font-medium text-ink-2"
                {...editable("global.nav.login", "cta")}
              >
                {c("global.nav.login", "Log in")}
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
