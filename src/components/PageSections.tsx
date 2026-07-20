import { Fragment, type ReactNode } from "react";
import { useC } from "@/content/ContentProvider";
import { resolveLayout } from "@/lib/sections";

/* Renders a page's sections in the order (and visibility) the team set in the
 * admin's Structure panel — stored as the `layout.<page>` content block and
 * riding the normal draft → publish pipeline. Pages pass their built-in
 * sections as an id → node map; anything the layout hides is skipped.
 *
 * Back-compat: the home page's legacy `section.home.<id>` toggles ("false"
 * hides) are still honored, so anything the team hid before this system
 * existed stays hidden. The Editor keeps both in sync when it writes.
 *
 * Template-library instances (kind:"lib", Phase E) are ignored here for now. */
export function PageSections({ page, sections }: { page: string; sections: Record<string, ReactNode> }) {
  const c = useC();
  const entries = resolveLayout(page, c(`layout.${page}`));
  const legacyHidden = (id: string) => page === "home" && id !== "hero" && id !== "cta" && c(`section.home.${id}`) === "false";

  return (
    <>
      {entries.map((e) => {
        if (e.kind === "lib") return null; // template instances land in Phase E
        const id = e.id!;
        const node = sections[id];
        if (!node || e.hidden || legacyHidden(id)) return null;
        return <Fragment key={id}>{node}</Fragment>;
      })}
    </>
  );
}
