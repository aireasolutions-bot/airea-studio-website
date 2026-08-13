// Visual click-to-edit overlay. Activated ONLY on the live site when it's loaded
// inside the admin canvas with ?edit=1, and lazy-loaded so it never ships in the
// normal public bundle. It highlights any element tagged with editable()
// ([data-edit-key]) and, on click, tells the parent admin window which element was
// clicked + where, so the admin can show the right editor (text or image).
//
// Hold ⌥/Alt to switch to AI mode: EVERY element highlights (purple) and a
// click sends a descriptor to the admin's "Fix with AI" panel instead.
export function activate(): () => void {
  const STYLE_ID = "airea-edit-style";
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      [data-edit-key]{ cursor: pointer; transition: box-shadow .12s ease, outline-color .12s ease; }
      .airea-edit-hl{ outline: 2px solid #0047FF !important; outline-offset: 2px; border-radius: 4px; box-shadow: 0 0 0 4px rgba(0,71,255,.12) !important; }
      .airea-ai-hl{ outline: 2px solid #7C3AED !important; outline-offset: 2px; border-radius: 4px; box-shadow: 0 0 0 4px rgba(124,58,237,.14) !important; cursor: crosshair !important; }
      .airea-edit-badge{ position: fixed; z-index: 2147483647; background:#0047FF; color:#fff;
        font: 600 11px Inter, system-ui, sans-serif; padding:3px 8px; border-radius: 999px;
        pointer-events:none; transform: translateY(-115%); white-space:nowrap; box-shadow: 0 4px 12px rgba(0,0,0,.2); }
      .airea-edit-badge.ai{ background:#7C3AED; }
    `;
    document.head.appendChild(s);
  }

  const badge = document.createElement("div");
  badge.className = "airea-edit-badge";
  badge.style.display = "none";
  document.body.appendChild(badge);

  let current: HTMLElement | null = null;
  let aiMode = false;
  let lastPointer: MouseEvent | null = null;

  const targetOf = (e: Event) =>
    ((e.target as Element)?.closest?.("[data-edit-key]") as HTMLElement | null) ?? null;

  // AI mode targets any meaningful element (skip the page chrome wrappers).
  const aiTargetOf = (e: Event): HTMLElement | null => {
    const el = e.target as HTMLElement | null;
    if (!el || el === document.body || el === document.documentElement) return null;
    return el;
  };

  const clearHl = () => {
    if (current) current.classList.remove("airea-edit-hl", "airea-ai-hl");
    current = null;
    badge.style.display = "none";
  };

  const highlight = (t: HTMLElement | null) => {
    if (t === current) return;
    if (current) current.classList.remove("airea-edit-hl", "airea-ai-hl");
    current = t;
    if (!t) {
      badge.style.display = "none";
      return;
    }
    t.classList.add(aiMode ? "airea-ai-hl" : "airea-edit-hl");
    const r = t.getBoundingClientRect();
    if (aiMode) {
      badge.textContent = "✨ Fix with AI";
      badge.classList.add("ai");
    } else {
      const type = t.getAttribute("data-edit-type") || "text";
      badge.textContent =
        type === "image" ? "✎ Change image"
        : type === "video" ? "✎ Change video"
        : type === "cta" ? "✎ Edit button"
        : "✎ Edit text";
      badge.classList.remove("ai");
    }
    badge.style.left = `${Math.max(6, r.left)}px`;
    badge.style.top = `${Math.max(14, r.top)}px`;
    badge.style.display = "block";
  };

  const onOver = (e: MouseEvent) => {
    lastPointer = e;
    highlight(aiMode ? aiTargetOf(e) : targetOf(e));
  };

  // Compact descriptor the agent can locate in source (classes + text + keys).
  const describe = (t: HTMLElement) => {
    const section = (t.closest("[data-airea-section]") as HTMLElement | null)?.dataset.aireaSection ?? null;
    return {
      tag: t.tagName.toLowerCase(),
      classes: (t.getAttribute("class") || "").replace(/\bairea-(edit|ai)-hl\b/g, "").trim().slice(0, 300),
      editKey: t.getAttribute("data-edit-key") || (t.closest("[data-edit-key]") as HTMLElement | null)?.getAttribute("data-edit-key") || null,
      section,
      text: (t.textContent || "").trim().slice(0, 120),
      imgSrc: t.tagName === "IMG" ? (t as HTMLImageElement).getAttribute("src") : t.querySelector("img")?.getAttribute("src") ?? null,
      path: window.location.pathname,
    };
  };

  const onClick = (e: MouseEvent) => {
    if (aiMode) {
      const t = aiTargetOf(e);
      if (!t) return;
      e.preventDefault();
      e.stopPropagation();
      window.parent?.postMessage({ type: "airea-ai-select", element: describe(t) }, "*");
      return;
    }
    const t = targetOf(e);
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    const r = t.getBoundingClientRect();
    const editType = t.getAttribute("data-edit-type") || "text";
    window.parent?.postMessage(
      {
        type: "airea-edit-click",
        key: t.getAttribute("data-edit-key"),
        editType,
        value: editType === "image" || editType === "video" ? "" : (t.textContent || "").trim(),
        rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      },
      "*"
    );
  };

  const setAiMode = (on: boolean) => {
    if (aiMode === on) return;
    aiMode = on;
    // re-evaluate the highlight under the cursor with the new mode
    if (lastPointer) highlight(aiMode ? aiTargetOf(lastPointer) : targetOf(lastPointer));
    else clearHl();
  };
  const onKeyDown = (e: KeyboardEvent) => e.altKey && setAiMode(true);
  const onKeyUp = (e: KeyboardEvent) => !e.altKey && setAiMode(false);
  const onBlur = () => setAiMode(false);

  document.addEventListener("mouseover", onOver, true);
  document.addEventListener("click", onClick, true);
  window.addEventListener("scroll", clearHl, true);
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("blur", onBlur);

  return () => {
    document.removeEventListener("mouseover", onOver, true);
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("scroll", clearHl, true);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("blur", onBlur);
    clearHl();
    badge.remove();
  };
}
