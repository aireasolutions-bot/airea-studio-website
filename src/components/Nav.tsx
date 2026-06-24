import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./ui";
import { cn } from "@/lib/cn";
import { SOLUTIONS, SIGN_UP_URL, SIGN_IN_URL } from "@/lib/site";
import { scrollToTarget } from "@/hooks/useSmoothScroll";

const ROUTE_LINKS = [
  { label: "How it works", to: "/how-it-works" },
  { label: "FAQ", to: "/faq" },
];

const HASH_LINKS = [
  { label: "One photo", hash: "#campaign" },
  { label: "The Wall", hash: "#wall" },
];

export function Nav() {
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

  const goHash = (hash: string) => {
    setOpen(false);
    if (location.pathname === "/") {
      scrollToTarget(hash);
    } else {
      navigate("/");
      setTimeout(() => scrollToTarget(hash), 650);
    }
  };

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
            {ROUTE_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
            {HASH_LINKS.map((l) => (
              <button
                key={l.hash}
                onClick={() => goHash(l.hash)}
                className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                {l.label}
              </button>
            ))}

            <div
              className="relative"
              onMouseEnter={() => setSolOpen(true)}
              onMouseLeave={() => setSolOpen(false)}
            >
              <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink">
                Solutions
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
                  {SOLUTIONS.map((s) => (
                    <Link
                      key={s.to}
                      to={s.to}
                      className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-blue-mist"
                    >
                      <div className="text-[14px] font-semibold text-ink">{s.label}</div>
                      <div className="text-[12.5px] text-ink-3">{s.desc}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link
              to="/pricing"
              className="rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
            >
              Pricing
            </Link>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <a
              href={SIGN_IN_URL}
              className="px-3 py-2 text-[13.5px] font-medium text-ink-2 transition-colors hover:text-ink"
            >
              Log in
            </a>
            <Button href={SIGN_UP_URL} variant="primary" magnetic arrow>
              Start free
            </Button>
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
        <div className="flex h-full flex-col px-6 pb-8 pt-24">
          <div className="flex flex-col gap-1">
            {ROUTE_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="border-b border-line py-4 font-display text-3xl text-ink"
              >
                {l.label}
              </Link>
            ))}
            {HASH_LINKS.map((l) => (
              <button
                key={l.hash}
                onClick={() => goHash(l.hash)}
                className="border-b border-line py-4 text-left font-display text-3xl text-ink"
              >
                {l.label}
              </button>
            ))}
            {SOLUTIONS.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="border-b border-line py-4 font-display text-3xl text-ink"
              >
                {s.label}
              </Link>
            ))}
            <Link
              to="/pricing"
              className="border-b border-line py-4 font-display text-3xl text-ink"
            >
              Pricing
            </Link>
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <Button href={SIGN_UP_URL} variant="primary" size="lg" arrow>
              Start 14-day free trial
            </Button>
            <a
              href={SIGN_IN_URL}
              className="text-center text-sm font-medium text-ink-2"
            >
              Log in
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
