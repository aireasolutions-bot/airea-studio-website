import { type ReactNode } from "react";
import { useC } from "@/content/ContentProvider";
import { resolveLayout, entryKey } from "@/lib/sections";
import { TemplateInstance, sharedById } from "@/sitebuilder/registry";

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
        if (e.hidden) return null;
        const key = entryKey(e);
        let node: ReactNode = null;
        if (e.kind === "lib" && e.template && e.instanceId) {
          // A section added from the template gallery.
          node = <TemplateInstance template={e.template} instanceId={e.instanceId} />;
        } else if (e.kind === "shared" && e.id) {
          // A section adopted from another page (renders its own global keys).
          const shared = sharedById(e.id);
          node = shared ? <shared.Component /> : null;
        } else if (e.id) {
          if (legacyHidden(e.id)) return null;
          node = sections[e.id] ?? null;
        }
        if (!node) return null;
        // display:contents keeps layout identical; the marker lets the admin's
        // preview sync scrolling with the fields panel (see previewSync.ts).
        return (
          <div key={key} style={{ display: "contents" }} data-airea-section={e.id ?? key}>
            {node}
          </div>
        );
      })}
    </>
  );
}
