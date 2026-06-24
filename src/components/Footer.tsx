import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "How it works", to: "/#how" },
      { label: "One photo → campaign", to: "/#campaign" },
      { label: "The Wall", to: "/#wall" },
      { label: "Pricing", to: "/pricing" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Small business", to: "/small-business" },
      { label: "E-commerce", to: "/ecommerce" },
      { label: "Service providers", to: "/small-business" },
      { label: "Agencies", to: "/pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/" },
      { label: "Blog", to: "/" },
      { label: "Careers", to: "/" },
      { label: "Contact", to: "/" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", to: "/" },
      { label: "Terms", to: "/" },
      { label: "Security", to: "/" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="wrap-wide grid grid-cols-2 gap-10 py-16 md:grid-cols-6">
        <div className="col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-[14px] text-ink-2">
            The AI marketing OS. One source in, a full on-brand campaign out —
            across every channel.
          </p>
          <p className="tag mt-6">Nº 001 · {SITE.domain}</p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <div className="mb-4 text-[12px] font-semibold uppercase tracking-wider text-ink-3">
              {col.title}
            </div>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-[14px] text-ink-2 transition-colors hover:text-blue"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="wrap-wide flex flex-col items-center justify-between gap-3 py-6 text-[13px] text-ink-3 sm:flex-row">
          <span>© {new Date().getFullYear()} AIREA Studio. All rights reserved.</span>
          <span className="font-mono tracking-wide">
            Built for teams that move fast.
          </span>
        </div>
      </div>
    </footer>
  );
}
