// Preview ⇆ admin scroll sync. Loaded ONLY inside the admin's preview iframe
// (lazy import from ContentProvider), never in the public bundle.
//
// → parent: posts "airea-section-visible" with the section id currently in the
//   middle of the viewport, so the Editor can follow along in its panels.
// ← parent: listens for "airea-scroll-section" and scrolls that section into
//   view when the team clicks it in the Page structure panel.
export function activate(): () => void {
  let current = "";
  let observer: IntersectionObserver | null = null;
  let rescan: number | undefined;

  const targets = () =>
    Array.from(document.querySelectorAll<HTMLElement>("[data-airea-section]"))
      .map((w) => ({ id: w.dataset.aireaSection!, el: w.firstElementChild as HTMLElement | null }))
      .filter((t): t is { id: string; el: HTMLElement } => !!t.el);

  const observe = () => {
    observer?.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const wrapper = e.target.parentElement as HTMLElement | null;
          const id = wrapper?.dataset.aireaSection;
          if (id && id !== current) {
            current = id;
            window.parent?.postMessage({ type: "airea-section-visible", id }, "*");
          }
        }
      },
      // "the section occupying the middle of the screen"
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );
    targets().forEach((t) => observer!.observe(t.el));
  };

  // SPA navigations / content refreshes swap the DOM — re-observe, debounced.
  const mo = new MutationObserver(() => {
    window.clearTimeout(rescan);
    rescan = window.setTimeout(observe, 400);
  });
  mo.observe(document.getElementById("root") ?? document.body, { childList: true, subtree: true });

  const onMsg = (e: MessageEvent) => {
    if (e.data?.type !== "airea-scroll-section") return;
    const el = document.querySelector<HTMLElement>(`[data-airea-section="${CSS.escape(String(e.data.id))}"]`)
      ?.firstElementChild as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  window.addEventListener("message", onMsg);

  observe();

  return () => {
    observer?.disconnect();
    mo.disconnect();
    window.clearTimeout(rescan);
    window.removeEventListener("message", onMsg);
  };
}
