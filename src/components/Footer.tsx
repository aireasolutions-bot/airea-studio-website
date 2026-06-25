import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";
import { useC, editable } from "@/content/ContentProvider";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "How it works", to: "/how-it-works" },
      { label: "One photo → campaign", to: "/#campaign" },
      { label: "The Wall", to: "/#wall" },
      { label: "FAQ", to: "/faq" },
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
  const c = useC();
  return (
    <footer className="border-t border-line bg-paper">
      <div className="wrap-wide grid grid-cols-2 gap-10 py-16 md:grid-cols-6">
        <div className="col-span-2">
          <Logo />
          <p className="mt-4 max-w-xs text-[14px] text-ink-2" {...editable("global.footer.blurb", "richtext")}>
            {c(
              "global.footer.blurb",
              "The AI marketing OS. One source in, a full on-brand campaign out — across every channel."
            )}
          </p>
          <p className="tag mt-6">{SITE.domain}</p>
        </div>
        {COLS.map((col, i) => (
          <div key={col.title}>
            <div className="mb-4 text-[12px] font-semibold uppercase tracking-wider text-ink-3" {...editable(`global.footer.col${i}.title`)}>
              {c(`global.footer.col${i}.title`, col.title)}
            </div>
            <ul className="space-y-2.5">
              {col.links.map((l, j) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-[14px] text-ink-2 transition-colors hover:text-blue"
                    {...editable(`global.footer.col${i}.link${j}`)}
                  >
                    {c(`global.footer.col${i}.link${j}`, l.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="wrap-wide flex flex-col items-center justify-between gap-3 py-6 text-[13px] text-ink-3 sm:flex-row">
          <span>
            © {new Date().getFullYear()}{" "}
            <span {...editable("global.footer.copyright")}>
              {c("global.footer.copyright", "AIREA Studio. All rights reserved.")}
            </span>
          </span>
          <span className="font-mono tracking-wide" {...editable("global.footer.tagline")}>
            {c("global.footer.tagline", "Built for teams that move fast.")}
          </span>
        </div>
      </div>
    </footer>
  );
}
