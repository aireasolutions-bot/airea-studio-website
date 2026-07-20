// Visual click-to-edit overlay. Activated ONLY on the live site when it's loaded
// inside the admin canvas with ?edit=1, and lazy-loaded so it never ships in the
// normal public bundle. It highlights any element tagged with editable()
// ([data-edit-key]) and, on click, tells the parent admin window which element was
// clicked + where, so the admin can show the right editor (text or image).
export function activate(): () => void {
  const STYLE_ID = "airea-edit-style";
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement("style");
    s.id = STYLE_ID;
    s.textContent = `
      [data-edit-key]{ cursor: pointer; transition: box-shadow .12s ease, outline-color .12s ease; }
      .airea-edit-hl{ outline: 2px solid #0047FF !important; outline-offset: 2px; border-radius: 4px; box-shadow: 0 0 0 4px rgba(0,71,255,.12) !important; }
      .airea-edit-badge{ position: fixed; z-index: 2147483647; background:#0047FF; color:#fff;
        font: 600 11px Inter, system-ui, sans-serif; padding:3px 8px; border-radius: 999px;
        pointer-events:none; transform: translateY(-115%); white-space:nowrap; box-shadow: 0 4px 12px rgba(0,0,0,.2); }
    `;
    document.head.appendChild(s);
  }

  const badge = document.createElement("div");
  badge.className = "airea-edit-badge";
  badge.style.display = "none";
  document.body.appendChild(badge);

  let current: HTMLElement | null = null;
  const targetOf = (e: Event) =>
    ((e.target as Element)?.closest?.("[data-edit-key]") as HTMLElement | null) ?? null;

  const clearHl = () => {
    if (current) current.classList.remove("airea-edit-hl");
    current = null;
    badge.style.display = "none";
  };

  const onOver = (e: MouseEvent) => {
    const t = targetOf(e);
    if (t === current) return;
    if (current) current.classList.remove("airea-edit-hl");
    current = t;
    if (!t) {
      badge.style.display = "none";
      return;
    }
    t.classList.add("airea-edit-hl");
    const type = t.getAttribute("data-edit-type") || "text";
    const r = t.getBoundingClientRect();
    badge.textContent =
      type === "image" ? "✎ Change image"
      : type === "video" ? "✎ Change video"
      : type === "cta" ? "✎ Edit button"
      : "✎ Edit text";
    badge.style.left = `${Math.max(6, r.left)}px`;
    badge.style.top = `${Math.max(14, r.top)}px`;
    badge.style.display = "block";
  };

  const onClick = (e: MouseEvent) => {
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

  document.addEventListener("mouseover", onOver, true);
  document.addEventListener("click", onClick, true);
  window.addEventListener("scroll", clearHl, true);

  return () => {
    document.removeEventListener("mouseover", onOver, true);
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("scroll", clearHl, true);
    clearHl();
    badge.remove();
  };
}
