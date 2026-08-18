import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";
import { hrefPageSlug, pageVisibleKey } from "@/lib/pages";
import { useC, editable, parseLink, isEdit } from "@/content/ContentProvider";

/* Footer links are fully content-managed: label at `global.footer.col{i}.link{j}`,
 * destination + visibility at `…link{j}_link`. A link disappears when hidden,
 * emptied, or its destination page is switched off; a column disappears when
 * none of its links are visible. Each column ends with one spare slot (empty by
 * default) so the team can add a link without code. Ghosts show on the edit
 * canvas only. */

const COLS = [
  {
    title: "Product",
    links: [
      { label: "How it works", to: "/how-it-works" },
      { label: "One photo → campaign", to: "/#campaign" },
      { label: "The Wall", to: "/#wall" },
      { label: "FAQ", to: "/faq" },
      { label: "Pricing", to: "/pricing" },
      { label: "", to: "/" }, // spare slot — fill label + URL in the admin to add a link
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "Small business", to: "/small-business" },
      { label: "E-commerce", to: "/ecommerce" },
      { label: "Service providers", to: "/small-business" },
      { label: "Agencies", to: "/pricing" },
      { label: "", to: "/" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", to: "/" },
      { label: "Blog", to: "/blog" },
      { label: "Careers", to: "/" },
      { label: "Contact", to: "/" },
      { label: "", to: "/" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Terms of Service", to: "/terms-of-service" },
      { label: "Security", to: "/" },
      { label: "", to: "/" },
    ],
  },
];

export function Footer() {
  const c = useC();
  const editing = isEdit();

  const resolve = (colIdx: number, linkIdx: number) => {
    const def = COLS[colIdx].links[linkIdx];
    const key = `global.footer.col${colIdx}.link${linkIdx}`;
    const label = c(key, def.label).trim();
    const link = parseLink(c(`${key}_link`), def.to);
    const pageSlug = hrefPageSlug(link.href);
    const pageOn = !pageSlug || c(pageVisibleKey(pageSlug)) !== "false";
    return { key, label, href: link.href, visible: link.visible && !!label && pageOn, newTab: link.newTab };
  };

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
        {COLS.map((col, i) => {
          const links = col.links.map((_, j) => resolve(i, j));
          if (!links.some((l) => l.visible) && !editing) return null;
          return (
            <div key={col.title}>
              <div className="mb-4 text-[12px] font-semibold uppercase tracking-wider text-ink-3" {...editable(`global.footer.col${i}.title`)}>
                {c(`global.footer.col${i}.title`, col.title)}
              </div>
              <ul className="space-y-2.5">
                {links.map((l) => {
                  if (!l.visible) {
                    if (!editing) return null;
                    return (
                      <li key={l.key}>
                        <span
                          {...editable(l.key, "cta")}
                          title="Hidden — click to edit & bring it back"
                          className="inline-block rounded px-1 text-[12.5px] text-ink-3 opacity-50 outline-dashed outline-1 outline-offset-2 outline-ink-3"
                        >
                          {l.label || "Hidden link"}
                        </span>
                      </li>
                    );
                  }
                  const internal = l.href.startsWith("/") || l.href.startsWith("#");
                  return (
                    <li key={l.key}>
                      {internal ? (
                        <Link to={l.href} className="text-[14px] text-ink-2 transition-colors hover:text-blue" {...editable(l.key, "cta")}>
                          {l.label}
                        </Link>
                      ) : (
                        <a href={l.href} {...(l.newTab ? { target: "_blank", rel: "noopener" } : {})} className="text-[14px] text-ink-2 transition-colors hover:text-blue" {...editable(l.key, "cta")}>
                          {l.label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
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
