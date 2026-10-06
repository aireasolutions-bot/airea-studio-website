# Module 01 — Website Builder

> A marketing website whose every word, image, button, link, section, page, and layout is
> editable by a non-technical team — by clicking directly on a live preview of the real
> site — with draft → publish, structure control, a section template gallery, pinned
> review comments, one-click rollback, and an AI agent that can change the site's code
> and deploy it.

| | |
|---|---|
| **Depends on** | 00 Foundation |
| **Integrates with** | 03 Asset Hub (image/video fields) · 05 Branding (rides the same pipeline) · 04 SEO (per-page meta) |
| **Provides** | `ContentProvider` · `useC()` · `editable()` · visual edit canvas · `PageSections` · `CtaButton` · Site Editor · Publish Center · rollback · Review comments · AI Builder agent |
| **Reference build** | AIREA Studio — ~5,000 lines across content runtime, editor, publish, review, agent |

---

## 1. What it does

| The team can… | How |
|---|---|
| Edit any text | Click it on the live preview and type, or use the field list |
| Swap any image or video | Click it → Asset Hub picker (Module 03) |
| Change any button or link | Label, destination, show/hide, same-tab/new-tab |
| Hide anything | A button, nav item, footer link, section, or a whole page — it vanishes cleanly, no gaps |
| Reorder sections | Drag, per page |
| Add sections | From a template gallery, or reuse a real section from another page |
| Preview before going live | Every edit is a draft; the preview shows drafts, the public sees published |
| Publish deliberately | One button, per-key error reporting, logged |
| See what's pending | Publish Center lists every unpublished change in plain English |
| Roll back code | Pick a previous version; it becomes live again |
| Leave review comments | Figma-style pins attached to the exact element |
| Ask AI to change the site | Chat with an agent that reads the codebase, stages edits, previews, and deploys |

The one property everything rests on: **nothing the team types is live until they publish.**

---

## 2. How it works

### Five ideas

1. **Content is keyed, not structured.** Every editable value lives at a dotted key
   (`home.hero.title`). Components ask for a key with a fallback. No schema migrations when
   copy changes; a key nobody has edited still renders.
2. **Every editable thing is one row with two values** — `draft_value`, `published_value`.
   Preview reads draft, the public reads published, publish copies one to the other. This
   gives you preview, publish, "what's pending", and per-key revert for free.
3. **The editor edits the real site, not a replica.** The canvas is an iframe of the actual
   page with `?preview=1&edit=1`. There is no second rendering path to keep in sync.
4. **Structure is data.** A page's section order and visibility is a JSON array stored as a
   content key, riding the same draft/publish pipeline as text.
5. **Hiding is a first-class state.** Hidden things vanish cleanly for visitors but stay on
   the edit canvas as dashed "ghosts" so they can be clicked and brought back.

### Three request paths

```
VISITOR          /pricing
                   └─ ContentProvider → GET published_content (anon key, 1 request)
                   └─ c("pricing.hero.title") → override ?? blocks.json default ?? inline fallback

ADMIN PREVIEW    /admin/editor  →  <iframe src="/pricing?preview=1&edit=1">
                   └─ ContentProvider → GET content_blocks.draft_value (admin's own JWT)
                   └─ lazy-loads edit canvas + scroll sync (never in the public bundle)
                   └─ click element → postMessage → admin opens the right editor
                   └─ admin writes draft → postMessage "cms-refresh-content" → iframe refetches

PUBLISH          Publish button → for each dirty key: published_value = draft_value
                   └─ publish_log row · activity_log row · per-key failures surfaced
```

---

## 3. Brand configuration

Everything in this module that differs per brand lives in these files. The engine code
does not change.

| File | Holds | Notes |
|---|---|---|
| `src/lib/pages.ts` | `SITE_PAGES` (slug, path, label) · `HIDEABLE_PAGES` | Add a page here + its component in `App.tsx` → it appears on the site, in the editor, and in Review |
| `src/lib/sections.ts` | `SECTION_MANIFESTS` — each page's sections in default order | Adding a section = list it here + pass its node to `<PageSections>` |
| `src/content/blocks.json` | Default value for every key | Ships in the bundle; the site renders with the database down |
| `src/sitebuilder/registry.tsx` | Template gallery + shared sections | Templates are generic layouts styled with brand tokens |
| `src/components/Nav.tsx`, `Footer.tsx` | Default items (indexed keys) | Only ever **append** — see §11.3 |
| `api/_lib/knowledge.ts` | The AI agent's system prompt | **Must be rewritten per brand** — see §15.6 |

---

## 4. Content key grammar

Keys are the contract between components, the editor, the publish log, and the AI agent.
Be consistent — the editor derives each row's grouping from the key's shape (§12.3).

| Pattern | Type | Example | Meaning |
|---|---|---|---|
| `<page>.<section>.<field>` | text · richtext · image · video | `home.hero.title` | A value on one page |
| `global.<area>.<field>` | any | `global.nav.cta`, `global.footer.blurb` | Sitewide (nav, footer) |
| `<key>_link` | link (JSON) | `home.hero.cta_link` | A button's destination + visibility (§10) |
| `layout.<page>` | layout (JSON) | `layout.home` | Section order + visibility (§8) |
| `page.<slug>.visible` | text `"true"`/`"false"` | `page.blog.visible` | Whole-page switch (§11) |
| `sec.<instanceId>.<field>` | any | `sec.k3p9x2.title` | A template-gallery instance's content (§9) |
| `global.nav.route<N>`, `global.nav.extra<N>` | text + `_link` | `global.nav.extra0` | Indexed nav items; spare empty slots |
| `global.footer.col<i>.link<j>` | text + `_link` | `global.footer.col2.link3` | Indexed footer links |
| `design.tokens` | json | — | Module 05 |
| `<feature>.data` | json | `pricing.data` | A structured sub-editor's whole document |

Types: `text` · `richtext` · `image` · `video` · `cta` (label) · `link` · `layout` · `json`.

---

## 5. Data model

```sql
create table public.content_blocks (
  key             text primary key,
  page            text not null default 'home',   -- grouping in the editor
  section         text,                           -- grouping label in the editor
  label           text,                           -- human label in the editor
  type            text not null default 'text',
  draft_value     jsonb,
  published_value jsonb,
  sort            integer not null default 0,
  updated_at      timestamptz not null default now(),
  updated_by      text
);
create trigger content_blocks_touch before update on public.content_blocks
  for each row execute function public.touch_updated_at();
alter table public.content_blocks enable row level security;
create policy p_content on public.content_blocks for all using (is_admin()) with check (is_admin());

-- The ONLY surface the public site reads. Drafts are unreachable anonymously.
create or replace view public.published_content as
  select key, page, section, label, type, published_value as value
  from public.content_blocks where published_value is not null;
grant select on public.published_content to anon, authenticated;

create table public.publish_log (
  id           uuid primary key default gen_random_uuid(),
  summary      text,
  changed_keys text[],
  commit_sha   text,          -- set when the publish was a code deploy
  commit_url   text,
  status       text not null default 'success',
  published_by text,
  created_at   timestamptz not null default now()
);
alter table public.publish_log enable row level security;
create policy p_publish_read   on public.publish_log for select using (is_admin());
create policy p_publish_insert on public.publish_log for insert with check (is_admin());  -- ⚠️ required

create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  page         text not null default '/',
  anchor       text,          -- 'key:home.hero.title' | 'section:hero'  (§16)
  target_label text,          -- readable text of the anchored element
  pos_x        real,          -- position WITHIN the anchored element (0..1)
  pos_y        real,
  body         text not null,
  status       text not null default 'open',   -- open | resolved
  author_email text,
  author_name  text,
  mentions     text[] not null default '{}',
  parent_id    uuid references public.comments(id) on delete cascade,
  resolved_by  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.comments enable row level security;
create policy p_comments on public.comments for all using (is_admin()) with check (is_admin());

create table public.agent_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_email text not null,
  title      text not null default 'New chat',
  messages   jsonb not null default '[]',
  staged     jsonb not null default '[]',    -- edits proposed, not yet shipped
  mode       text not null default 'build',  -- build | reason
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.agent_conversations enable row level security;
create policy p_agent_convos on public.agent_conversations for all
  using  (is_admin() and lower(user_email) = lower(coalesce(auth.jwt() ->> 'email','')))
  with check (is_admin() and lower(user_email) = lower(coalesce(auth.jwt() ->> 'email','')));
```

**Seed on install:** insert every key from `blocks.json` with `draft_value = published_value
= default`, so the editor has rows to list from day one.

---

## 6. Content runtime

### 6.1 `ContentProvider` — reference implementation

```tsx
// src/content/ContentProvider.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import blocksData from "./blocks.json";
import { applyDesign, parseDesign } from "@/lib/design";   // Module 05 (optional)

type Dict = Record<string, string>;
const DEFAULTS: Dict = Object.fromEntries((blocksData as { key: string; value: string }[]).map((b) => [b.key, b.value]));

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ASSETS_BASE = (import.meta.env.VITE_ASSETS_BASE_URL || "").replace(/\/+$/, "");

/** Resolve an image/video content value (storage key, /path, or full URL) to a src. */
export function resolveAsset(v?: string): string {
  if (!v) return "";
  if (/^https?:\/\//.test(v)) return v;
  const path = v.startsWith("/") ? v : `/${v}`;
  return ASSETS_BASE ? `${ASSETS_BASE}${path}` : path;
}

const ContentCtx = createContext<(key: string, fallback?: string) => string>((k, f) => DEFAULTS[k] ?? f ?? "");
export const useC = () => useContext(ContentCtx);

/** Spread onto any element to make it click-to-edit on the canvas. That's the whole contract. */
export const editable = (key: string, type: "text" | "richtext" | "image" | "video" | "cta" = "text") => ({
  "data-edit-key": key,
  "data-edit-type": type,
});

export const isEdit = () => typeof window !== "undefined" && new URLSearchParams(location.search).get("edit") === "1";
export const isPreview = () => typeof window !== "undefined" && new URLSearchParams(location.search).get("preview") === "1";

// The admin's own session token, read from Supabase's storage WITHOUT importing
// supabase-js into the public bundle. Preview only.
function previewToken(): string | null {
  try {
    const ref = SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1];
    const raw = ref ? localStorage.getItem(`sb-${ref}-auth-token`) : null;
    return raw ? JSON.parse(raw)?.access_token ?? null : null;
  } catch { return null; }
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Dict>({});
  const editing = isEdit();
  const preview = isPreview() || editing;

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON) return;      // no backend → defaults only, still renders
    let active = true;
    const load = async () => {
      const headers = {
        apikey: SUPABASE_ANON,
        // Preview: the admin's JWT, so RLS lets them read drafts. Public: anon.
        Authorization: `Bearer ${preview ? previewToken() ?? SUPABASE_ANON : SUPABASE_ANON}`,
      };
      const path = preview ? "content_blocks?select=key,draft_value" : "published_content?select=key,value";
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
        if (!res.ok || !active) return;
        const rows: Record<string, unknown>[] = await res.json();
        const next: Dict = {};
        for (const r of rows) {
          const v = preview ? r.draft_value : r.value;
          if (v != null) next[String(r.key)] = String(v);
        }
        if (active) setOverrides(next);
      } catch { /* keep defaults */ }
    };
    load();

    // The admin tells the preview to refetch after every save.
    if (preview) {
      const onMsg = (e: MessageEvent) => e.data?.type === "cms-refresh-content" && load();
      addEventListener("message", onMsg);
      return () => { active = false; removeEventListener("message", onMsg); };
    }
    return () => { active = false; };
  }, [preview]);

  // Module 05: apply design tokens (draft in preview, published otherwise).
  const designRaw = overrides["design.tokens"];
  useEffect(() => { applyDesign(parseDesign(designRaw), { cache: !preview }); }, [designRaw, preview]);

  // Editor tooling — lazy, so it never ships to visitors.
  useEffect(() => {
    if (!editing) return;
    let cleanup: (() => void) | undefined;
    import("./visualEdit").then((m) => { cleanup = m.activate(); }).catch(() => {});
    return () => cleanup?.();
  }, [editing]);
  useEffect(() => {
    if (!preview) return;
    let cleanup: (() => void) | undefined;
    import("./previewSync").then((m) => { cleanup = m.activate(); }).catch(() => {});
    return () => cleanup?.();
  }, [preview]);

  const get = (key: string, fallback?: string) => overrides[key] ?? DEFAULTS[key] ?? fallback ?? "";

  return (
    <ContentCtx.Provider value={get}>
      {children}
      {preview && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[200] -translate-x-1/2 rounded-full bg-black/85 px-4 py-2 text-xs font-semibold text-white">
          Preview · draft content
        </div>
      )}
    </ContentCtx.Provider>
  );
}
```

### 6.2 Using it in components

```tsx
export function Hero() {
  const c = useC();
  return (
    <section>
      <h1 {...editable("home.hero.title")}>{c("home.hero.title", "Marketing, made simpler.")}</h1>
      <p {...editable("home.hero.sub", "richtext")}>{c("home.hero.sub")}</p>
      <img {...editable("home.hero.image", "image")} src={resolveAsset(c("home.hero.image"))} alt="" />
    </section>
  );
}
```

Resolution order: **live override → `blocks.json` default → inline fallback.**

**Richtext** is stored as plain text with a tiny inline grammar the renderer understands
(line breaks, `**bold**`, `*italic*`). Never render content with `dangerouslySetInnerHTML`.

---

## 7. Visual edit canvas

Loaded only inside the admin's iframe with `?edit=1`.

### 7.1 Message protocol

| Direction | `type` | Payload | Meaning |
|---|---|---|---|
| canvas → admin | `cms-edit-click` | `{ key, editType, value, rect }` | Team clicked an editable element |
| canvas → admin | `cms-ai-select` | `{ element: { tag, classes, editKey, section, text, imgSrc, path } }` | Alt-click: hand this element to the AI agent |
| canvas → admin | `cms-section-visible` | `{ id }` | Section in the middle of the viewport changed (§7.3) |
| admin → canvas | `cms-refresh-content` | — | Drafts changed; refetch |
| admin → canvas | `cms-scroll-section` | `{ id }` | Scroll this section into view |

### 7.2 Reference: `src/content/visualEdit.ts`

```ts
const EDIT_COLOR = "#2563EB";   // editor chrome — fixed, not brand tokens
const AI_COLOR = "#7C3AED";

export function activate(): () => void {
  if (!document.getElementById("cms-edit-style")) {
    const s = document.createElement("style");
    s.id = "cms-edit-style";
    s.textContent = `
      [data-edit-key]{cursor:pointer;transition:box-shadow .12s ease,outline-color .12s ease}
      .cms-edit-hl{outline:2px solid ${EDIT_COLOR}!important;outline-offset:2px;border-radius:4px}
      .cms-ai-hl{outline:2px solid ${AI_COLOR}!important;outline-offset:2px;border-radius:4px;cursor:crosshair!important}
      .cms-edit-badge{position:fixed;z-index:2147483647;background:${EDIT_COLOR};color:#fff;
        font:600 11px system-ui,sans-serif;padding:3px 8px;border-radius:999px;pointer-events:none;
        transform:translateY(-115%);white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.2)}
      .cms-edit-badge.ai{background:${AI_COLOR}}`;
    document.head.appendChild(s);
  }

  const badge = document.createElement("div");
  badge.className = "cms-edit-badge";
  badge.style.display = "none";
  document.body.appendChild(badge);

  let current: HTMLElement | null = null;
  let aiMode = false;
  let lastPointer: MouseEvent | null = null;

  const targetOf = (e: Event) => ((e.target as Element)?.closest?.("[data-edit-key]") as HTMLElement | null) ?? null;
  const aiTargetOf = (e: Event) => {
    const el = e.target as HTMLElement | null;
    return !el || el === document.body || el === document.documentElement ? null : el;
  };

  const clearHl = () => { current?.classList.remove("cms-edit-hl", "cms-ai-hl"); current = null; badge.style.display = "none"; };

  const highlight = (t: HTMLElement | null) => {
    if (t === current) return;
    current?.classList.remove("cms-edit-hl", "cms-ai-hl");
    current = t;
    if (!t) { badge.style.display = "none"; return; }
    t.classList.add(aiMode ? "cms-ai-hl" : "cms-edit-hl");
    const type = t.getAttribute("data-edit-type") || "text";
    badge.textContent = aiMode ? "✨ Fix with AI"
      : type === "image" ? "✎ Change image" : type === "video" ? "✎ Change video"
      : type === "cta" ? "✎ Edit button" : "✎ Edit text";
    badge.classList.toggle("ai", aiMode);
    const r = t.getBoundingClientRect();
    badge.style.left = `${Math.max(6, r.left)}px`;
    badge.style.top = `${Math.max(14, r.top)}px`;
    badge.style.display = "block";
  };

  // What the AI agent needs to locate this element in source.
  const describe = (t: HTMLElement) => ({
    tag: t.tagName.toLowerCase(),
    classes: (t.getAttribute("class") || "").replace(/\bcms-(edit|ai)-hl\b/g, "").trim().slice(0, 300),
    editKey: t.getAttribute("data-edit-key") ?? (t.closest("[data-edit-key]") as HTMLElement | null)?.getAttribute("data-edit-key") ?? null,
    section: (t.closest("[data-cms-section]") as HTMLElement | null)?.dataset.cmsSection ?? null,
    text: (t.textContent || "").trim().slice(0, 120),
    imgSrc: t.tagName === "IMG" ? t.getAttribute("src") : t.querySelector("img")?.getAttribute("src") ?? null,
    path: location.pathname,
  });

  const onOver = (e: MouseEvent) => { lastPointer = e; highlight(aiMode ? aiTargetOf(e) : targetOf(e)); };

  const onClick = (e: MouseEvent) => {
    if (aiMode) {
      const t = aiTargetOf(e); if (!t) return;
      e.preventDefault(); e.stopPropagation();
      parent?.postMessage({ type: "cms-ai-select", element: describe(t) }, "*");
      return;
    }
    const t = targetOf(e); if (!t) return;
    // Capture phase + preventDefault: links and buttons on the canvas must NOT navigate.
    e.preventDefault(); e.stopPropagation();
    const r = t.getBoundingClientRect();
    const editType = t.getAttribute("data-edit-type") || "text";
    parent?.postMessage({
      type: "cms-edit-click",
      key: t.getAttribute("data-edit-key"),
      editType,
      value: editType === "image" || editType === "video" ? "" : (t.textContent || "").trim(),
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
    }, "*");
  };

  const setAiMode = (on: boolean) => {
    if (aiMode === on) return;
    aiMode = on;
    lastPointer ? highlight(aiMode ? aiTargetOf(lastPointer) : targetOf(lastPointer)) : clearHl();
  };
  const onKeyDown = (e: KeyboardEvent) => e.altKey && setAiMode(true);
  const onKeyUp = (e: KeyboardEvent) => !e.altKey && setAiMode(false);
  const onBlur = () => setAiMode(false);

  document.addEventListener("mouseover", onOver, true);
  document.addEventListener("click", onClick, true);
  addEventListener("scroll", clearHl, true);
  addEventListener("keydown", onKeyDown, true);
  addEventListener("keyup", onKeyUp, true);
  addEventListener("blur", onBlur);

  return () => {
    document.removeEventListener("mouseover", onOver, true);
    document.removeEventListener("click", onClick, true);
    removeEventListener("scroll", clearHl, true);
    removeEventListener("keydown", onKeyDown, true);
    removeEventListener("keyup", onKeyUp, true);
    removeEventListener("blur", onBlur);
    clearHl();
    badge.remove();
  };
}
```

### 7.3 Reference: `src/content/previewSync.ts` — two-way scroll sync

```ts
export function activate(): () => void {
  let current = "";
  let observer: IntersectionObserver | null = null;
  let rescan: number | undefined;

  // Section wrappers are display:contents — they have NO box, so an observer on
  // the wrapper never fires. Observe each wrapper's FIRST CHILD instead.
  const targets = () =>
    Array.from(document.querySelectorAll<HTMLElement>("[data-cms-section]"))
      .map((w) => ({ id: w.dataset.cmsSection!, el: w.firstElementChild as HTMLElement | null }))
      .filter((t): t is { id: string; el: HTMLElement } => !!t.el);

  const observe = () => {
    observer?.disconnect();
    observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = (e.target.parentElement as HTMLElement | null)?.dataset.cmsSection;
        if (id && id !== current) { current = id; parent?.postMessage({ type: "cms-section-visible", id }, "*"); }
      }
    }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });   // "the section in the middle of the screen"
    targets().forEach((t) => observer!.observe(t.el));
  };

  // Content refreshes and SPA navigation replace the DOM — re-observe, debounced.
  const mo = new MutationObserver(() => { clearTimeout(rescan); rescan = window.setTimeout(observe, 400); });
  mo.observe(document.getElementById("root") ?? document.body, { childList: true, subtree: true });

  const onMsg = (e: MessageEvent) => {
    if (e.data?.type !== "cms-scroll-section") return;
    const el = document.querySelector<HTMLElement>(`[data-cms-section="${CSS.escape(String(e.data.id))}"]`)
      ?.firstElementChild as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  addEventListener("message", onMsg);
  observe();

  return () => { observer?.disconnect(); mo.disconnect(); clearTimeout(rescan); removeEventListener("message", onMsg); };
}
```

---

## 8. Page structure — sections, order, visibility

### 8.1 Types and manifest

```ts
// src/lib/sections.ts
export type SectionDef = { id: string; label: string };

export type LayoutEntry = {
  id?: string;                              // built-in or shared section id
  kind?: "builtin" | "lib" | "shared";      // absent = builtin
  template?: string;                        // kind:"lib" — gallery template id
  instanceId?: string;                      // kind:"lib" — owns keys sec.<instanceId>.*
  hidden?: boolean;
};

// 🔁 BRAND: each page's sections in default order.
export const SECTION_MANIFESTS: Record<string, SectionDef[]> = {
  home: [
    { id: "hero", label: "Hero" },
    { id: "features", label: "Features" },
    { id: "testimonials", label: "Testimonials" },
    { id: "cta", label: "Final CTA" },
  ],
  pricing: [
    { id: "hero", label: "Hero" },
    { id: "cards", label: "Plan cards" },
    { id: "compare", label: "Comparison table" },
  ],
};

export const entryKey = (e: LayoutEntry) =>
  e.kind === "lib" ? `lib:${e.instanceId}` : e.kind === "shared" ? `shared:${e.id}` : `s:${e.id}`;

export function parseLayout(raw: string | undefined | null): LayoutEntry[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return null;
    const entries = v.filter((e): e is LayoutEntry => !!e && typeof e === "object" && (typeof e.id === "string" || e.kind === "lib"));
    return entries.length ? entries : null;
  } catch { return null; }
}
```

### 8.2 `resolveLayout` — merging stored layout with the manifest

A developer ships a new section while the team has a custom order saved. The new section
must appear **where the manifest intends** — beside its manifest neighbours — not dumped at
the bottom, and without wiping the team's ordering.

```ts
export function resolveLayout(page: string, raw: string | undefined | null): LayoutEntry[] {
  const manifest = SECTION_MANIFESTS[page] ?? [];
  const stored = parseLayout(raw) ?? manifest.map((s) => ({ id: s.id }));
  const ids = manifest.map((s) => s.id);
  const known = new Set(stored.filter((e) => !e.kind || e.kind === "builtin").map((e) => e.id));
  const missing = manifest.filter((s) => !known.has(s.id));
  if (!missing.length) return stored;

  const merged = [...stored];
  for (const section of missing) {
    const i = ids.indexOf(section.id);
    const before = ids.slice(0, i).reverse();       // nearest previous manifest neighbour first
    const after = ids.slice(i + 1);
    const prevIdx = merged.findIndex((e) => !!e.id && before.includes(e.id));
    if (prevIdx >= 0) { merged.splice(prevIdx + 1, 0, { id: section.id }); continue; }
    const nextIdx = merged.findIndex((e) => !!e.id && after.includes(e.id));
    if (nextIdx >= 0) merged.splice(nextIdx, 0, { id: section.id });
    else merged.push({ id: section.id });
  }
  return merged;
}
```

Entries whose section no longer exists simply render nothing (no crash, no gap).

### 8.3 `PageSections` — rendering

```tsx
// src/components/PageSections.tsx
export function PageSections({ page, sections }: { page: string; sections: Record<string, ReactNode> }) {
  const c = useC();
  const entries = resolveLayout(page, c(`layout.${page}`));
  return (
    <>
      {entries.map((e) => {
        if (e.hidden) return null;
        const key = entryKey(e);
        let node: ReactNode = null;
        if (e.kind === "lib" && e.template && e.instanceId) node = <TemplateInstance template={e.template} instanceId={e.instanceId} />;
        else if (e.kind === "shared" && e.id) { const s = sharedById(e.id); node = s ? <s.Component /> : null; }
        else if (e.id) node = sections[e.id] ?? null;
        if (!node) return null;
        // display:contents — invisible to layout (no extra box to break your grid),
        // but queryable by scroll sync, comment anchoring, and the AI agent.
        return <div key={key} style={{ display: "contents" }} data-cms-section={e.id ?? key}>{node}</div>;
      })}
    </>
  );
}
```

Pages pass their built-in section nodes as a map:

```tsx
export function Home() {
  return <PageSections page="home" sections={{ hero: <Hero />, features: <Features />, testimonials: <Testimonials />, cta: <FinalCta /> }} />;
}
```

---

## 9. Template gallery & shared sections

Two ways to add a section without a developer.

### 9.1 Template library (`kind: "lib"`)

Generic, on-brand layouts. Each **instance** owns an isolated key namespace
`sec.<instanceId>.*`, so inserting the same template five times gives five independently
editable sections.

```tsx
// src/sitebuilder/registry.tsx
export type TemplateDef = {
  id: string;                         // "hero-split"
  category: "Hero" | "Features" | "Social proof" | "Call to action" | "Media";
  name: string;
  description: string;
  defaults: Record<string, string>;   // field → default value; seeded as drafts on insert
  Component: (p: { k: (field: string) => string }) => JSX.Element;
};

export function TemplateInstance({ template, instanceId }: { template: string; instanceId: string }) {
  const def = templateById(template);
  if (!def) return null;
  const k = (field: string) => `sec.${instanceId}.${field}`;
  return <def.Component k={k} />;
}

// Inside a template: every field goes through useC + editable with the instance's key.
function CtaBanner({ k }: { k: (f: string) => string }) {
  const c = useC();
  return (
    <section className="bg-accent py-16 text-center text-white">
      <h2 {...editable(k("title"))}>{c(k("title"))}</h2>
      <CtaButton k={k("cta")} defaultLabel="Get started" defaultHref="/" />
    </section>
  );
}
```

Reference set of eight (proven useful): Hero split · Hero centred · Feature grid · Split
feature · Stat band · Testimonials · CTA banner · Media block.

### 9.2 Shared sections (`kind: "shared"`)

The site's real, already-designed sections offered for reuse on other pages. They render
the **same component with the same keys**, so editing one updates every page that uses it.
That's a feature — but label it clearly in the UI ("· shared") or it surprises people.

### 9.3 Gallery UI

Show **scaled live previews in iframes**, not screenshots, so the gallery can never drift
from what will be inserted. Reveal-on-scroll animations leave thumbnails blank — force them
visible inside the gallery (`[&_.reveal]:!opacity-100`).

Inserting a template writes, in one batch: every `sec.<iid>.<field>` default as a draft,
plus the updated `layout.<page>`. Then scroll the preview to the new section
(`cms-scroll-section` with id `lib:<iid>`) and toast "added at the bottom — drag it into place."

---

## 10. CTA & link system

Every button and link = two keys: `X` (label) and `X_link` (JSON).

```ts
// src/content/ContentProvider.tsx (or links.ts)
export type CtaLink = { href: string; visible: boolean; newTab: boolean };

export function parseLink(raw: string | undefined | null, defaultHref: string): CtaLink {
  if (!raw) return { href: defaultHref, visible: true, newTab: false };
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === "object") {
      return {
        href: typeof v.href === "string" && v.href.trim() ? v.href.trim() : defaultHref,
        visible: v.visible !== false,
        newTab: v.newTab === true,          // same tab unless deliberately chosen
      };
    }
  } catch {
    if (raw.trim()) return { href: raw.trim(), visible: true, newTab: false };   // hand-typed URL
  }
  return { href: defaultHref, visible: true, newTab: false };
}
```

```tsx
// src/components/ui.tsx
export function CtaButton({ k, defaultLabel, defaultHref, ...rest }: { k: string; defaultLabel: string; defaultHref: string } & ButtonStyleProps) {
  const c = useC();
  const link = parseLink(c(`${k}_link`), defaultHref);
  const label = c(k, defaultLabel).trim();
  const editing = isEdit();

  // Hidden or empty → nothing for visitors, a dashed ghost on the canvas.
  if ((!link.visible || !label) && !editing) return null;

  const internal = link.href.startsWith("/") || link.href.startsWith("#");
  const onClick = /sign-?up|sign-?in/i.test(link.href) && !editing
    ? () => trackSignupIntent(label, link.href)          // optional analytics hook
    : undefined;

  const inner = <span {...editable(k, "cta")}>{label || "Hidden button"}</span>;
  const btn = internal
    ? <Button to={link.href} onClick={onClick} {...rest}>{inner}</Button>
    // rel="noopener" — NOT "noreferrer": noreferrer hides your own traffic from your own app's analytics.
    : <Button href={link.href} {...(link.newTab ? { target: "_blank", rel: "noopener" } : {})} onClick={onClick} {...rest}>{inner}</Button>;

  if (!link.visible || !label) {
    return <span className="inline-flex opacity-40 outline-dashed outline-2 outline-offset-2" title="Hidden — click to edit & bring back">{btn}</span>;
  }
  return btn;
}
```

The admin's link editor (§12.5) offers: quick-pick of every page and in-page anchor, a
free-text URL, visible on/off, and same-tab/new-tab with the hint *"Recommended for our own
pages & app"* on same-tab.

---

## 11. Page visibility, nav & footer

### 11.1 Whole-page switch

`HIDEABLE_PAGES` lists pages that may be turned off; each maps to `page.<slug>.visible`.

```tsx
function PageGate({ slug, children }: { slug: string; children: ReactNode }) {
  const c = useC();
  const hideable = HIDEABLE_PAGES.some((p) => p.slug === slug);
  if (hideable && c(`page.${slug}.visible`) === "false" && !isPreview()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Which hideable page an href points to — nav/footer links hide themselves when it's off.
export function hrefPageSlug(href: string): string | null {
  const path = (href || "").split(/[?#]/)[0];
  return HIDEABLE_PAGES.find((p) => path === p.path || path.startsWith(`${p.path}/`))?.slug ?? null;
}
```

**Hiding a page must never leave a link pointing at a redirect.**

### 11.2 Nav and footer

Every item resolves through one function:

```ts
const resolve = (key: string, defaultLabel: string, defaultHref: string) => {
  const label = c(key, defaultLabel).trim();
  const link = parseLink(c(`${key}_link`), defaultHref);
  const slug = hrefPageSlug(link.href);
  const pageOn = !slug || c(`page.${slug}.visible`) !== "false";
  return { key, label, href: link.href, newTab: link.newTab, visible: link.visible && !!label && pageOn };
};
```

Hidden → `null` for visitors (no gap in the flex row); dashed ghost on the canvas. A footer
**column** with no visible links disappears entirely.

### 11.3 Indexed keys — two rules

1. **Only ever append.** `global.nav.route0`, `route1`… are positional. Reordering the array
   in code reassigns every saved edit to a different item.
2. **Ship spare empty slots** (`global.nav.extra0/1`, one blank link at the end of each
   footer column). A blank slot renders nothing; filling in a label + URL adds a menu item
   with zero code.

---

## 12. Site Editor (admin)

### 12.1 Layout

```
┌──────────────┬─────────────────────────────────────┬───────────────┐
│ Page picker  │  Toolbar: device · edit-on-canvas ·  │ STRUCTURE     │
│              │  save status · Publish (N changes)   │ ☰ Hero     👁 │
│ FIELDS       ├─────────────────────────────────────┤ ☰ Features 👁 │
│  Hero        │                                      │ ☰ …        👁 │
│   Title  [ ] │   <iframe  /page?preview=1&edit=1>   │ + Add section │
│   Sub    [ ] │   scaled to fit (desktop 1280 /      │               │
│   Image  [▣] │   tablet 834 / mobile 390)           │ Global        │
│  Features    │                                      │  Pages on/off │
│   …          │   click anything → inline editor     │               │
└──────────────┴─────────────────────────────────────┴───────────────┘
```

- **Left:** fields for the page, grouped by section, following the preview as it scrolls
  (`cms-section-visible` → scroll the matching field card into view, but only while the
  pointer is over the preview — otherwise it fights the user).
- **Centre:** the real page. Click → the right editor at the click position.
- **Right:** structure (§12.6) and a Global tab (nav, footer, page switches).

### 12.2 Write path — reference

```ts
// Create the row on first write, so ANY key (canvas edits, links, layouts) is editable
// without pre-seeding.
const writeBlock = async (key: string, value: string, type: string) => {
  if (blocksRef.current.some((b) => b.key === key)) {
    await supabase.from("content_blocks").update({ draft_value: value, updated_by: email }).eq("key", key);
  } else {
    const row = { ...deriveRow(key, type, page), draft_value: value, published_value: null };
    await supabase.from("content_blocks").insert(row);
    setBlocks((b) => [...b, row]);
  }
};

// Typing in the panel: debounced per key.
const onEdit = (key: string, value: string, type = "text") => {
  setDraft((d) => ({ ...d, [key]: value }));
  setStatus("saving");
  clearTimeout(timers.current[key]);
  timers.current[key] = window.setTimeout(async () => {
    await writeBlock(key, value, type);
    setStatus("saved");
    iframe.contentWindow?.postMessage({ type: "cms-refresh-content" }, "*");
  }, 400);
};

// Canvas saves, structure ops, template inserts: immediate, batched.
const writeMany = async (updates: Record<string, { value: string; type: string }>) => {
  setDraft((d) => ({ ...d, ...Object.fromEntries(Object.entries(updates).map(([k, u]) => [k, u.value])) }));
  for (const [k, u] of Object.entries(updates)) await writeBlock(k, u.value, u.type);
  iframe.contentWindow?.postMessage({ type: "cms-refresh-content" }, "*");
};
```

Save status indicator: `idle` → `saving…` → `saved ✓` → `idle`.

### 12.3 `deriveRow` — metadata for keys created on the fly

```ts
function deriveRow(key: string, type: string, fallbackPage: string) {
  const parts = key.split(".");
  const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  if (parts[0] === "layout")
    return { key, page: parts[1] ?? fallbackPage, section: "Page structure", label: "Section order & visibility", type: "layout", sort: 0 };
  if (parts[0] === "sec")
    return { key, page: fallbackPage, section: `Added section · ${parts[1]}`, label: cap(parts.slice(2).join(" ").replace(/[._]/g, " ")) || key, type, sort: 950 };
  const pageOf: Record<string, string> = { home: "home", global: "global" /* 🔁 add your page prefixes */ };
  return { key, page: pageOf[parts[0]] ?? fallbackPage, section: parts[1] ? cap(parts[1]) : "General",
           label: cap(parts.slice(1).join(" ").replace(/[._]/g, " ")) || key, type, sort: 900 };
}
```

### 12.4 Positioning editors over a scaled iframe

The iframe renders at device width (e.g. 1280px) and is CSS-scaled to fit the pane. A
click's `rect` arrives in **iframe** coordinates and must be converted:

```ts
const onMsg = (e: MessageEvent) => {
  if (e.data?.type !== "cms-edit-click") return;
  const { key, editType, value, rect } = e.data;
  if (editType === "image" || editType === "video") return openAssetPicker(key, editType);   // Module 03
  const ib = iframeRef.current!.getBoundingClientRect();
  openPopover({
    key, type: editType,
    value: draftRef.current[key] ?? value ?? "",      // the draft, not the rendered text
    link: editType === "cta" ? parseLink(draftRef.current[`${key}_link`] ?? DEFAULTS[`${key}_link`], "") : undefined,
    x: ib.left + rect.left * scale,
    y: ib.top + (rect.top + rect.height) * scale,     // just below the element
  });
};
```

Keep a `ResizeObserver` on the pane to recompute `scale = min(1, paneWidth / deviceWidth)`,
and **attach it only after the loading gate has rendered the pane** — attached earlier, it
observes a 0×0 element and the iframe stays collapsed at height 0.

### 12.5 Popover editors

| `editType` | Editor |
|---|---|
| `text` | Single-line input, Enter saves, Esc cancels |
| `richtext` | Textarea |
| `cta` | Label input + link editor (href quick-pick, URL, visible, new tab) + **Remove from site** (sets `visible:false`) |
| `image` / `video` | Asset Hub picker (Module 03) |

### 12.6 Structure panel operations

All write `layout.<page>` through `writeMany`.

| Op | Implementation |
|---|---|
| Hide / show | Toggle `hidden` on the entry |
| Reorder | Drag (framer-motion `Reorder`), local state during drag, **commit once on drop** |
| Delete | Remove the entry (template instance keys remain, harmlessly orphaned) |
| Add template | New `instanceId`, seed its `sec.<iid>.*` defaults, append `{kind:"lib",template,instanceId}` |
| Add shared | Append `{kind:"shared",id}` — refuse duplicates on the same page |
| Jump | Click a row → `cms-scroll-section` to the preview |

---

## 13. Publish Center

### 13.1 Dirty detection

```ts
const dirtyKeys = Object.keys(draft).filter((k) => draft[k] !== (published[k] ?? ""));
```

### 13.2 Human descriptions of each pending change

```ts
function describeChange(r: Row): string {
  const draft = String(r.draft_value ?? "");
  switch (r.type) {
    case "layout": return "Section order & visibility updated";
    case "link": { const l = parseLink(draft, ""); return l.visible ? `Button → ${l.href || "site default"}` : "Button hidden"; }
    case "json":  return r.key === "design.tokens" ? "Site design updated" : `${r.label ?? r.key} updated`;
    case "image":
    case "video": return `New ${r.type}: ${draft.split("/").pop() || draft.slice(0, 40)}`;
    default: {
      const from = String(r.published_value ?? "");
      const to = draft.length > 48 ? `${draft.slice(0, 48)}…` : draft;
      if (r.published_value == null || !from) return `“${to}”`;
      return `“${from.length > 28 ? from.slice(0, 28) + "…" : from}” → “${to}”`;
    }
  }
}
```

### 13.3 Publishing — surface every failure

```ts
const publish = async () => {
  const results = await Promise.all(dirtyKeys.map(async (k) => ({
    k, error: (await supabase.from("content_blocks").update({ published_value: draft[k] }).eq("key", k)).error,
  })));
  const ok = results.filter((r) => !r.error).map((r) => r.k);
  const failed = results.filter((r) => r.error);
  if (ok.length) {
    const { error } = await supabase.from("publish_log").insert({
      summary: `Published ${ok.length} change${ok.length > 1 ? "s" : ""}`,
      changed_keys: ok, status: failed.length ? "error" : "success", published_by: email,
    });
    if (error) console.warn("publish_log:", error.message);
  }
  if (failed.length) alert(`${failed.length} of ${dirtyKeys.length} changes could not be published (your drafts are safe). ${failed[0].error!.message}`);
  else toast("Published — your changes are live.");
};
```

**Never report success without checking the response.** In the reference build a silently
rejected write let the team believe they'd published for a week.

The Publish Center page shows: pending changes (grouped by page, with `describeChange`),
per-key **Discard draft** (reset `draft_value` to `published_value`), **Publish all**, the
publish history from `publish_log`, and code versions (§14).

---

## 14. Code versions & rollback

Content publishes are database writes. Code changes (developer or AI agent) are git commits
that Vercel deploys. The admin exposes both.

```ts
// api/_lib/github.ts — rollback as a FORWARD commit of an old tree.
// Not a reset/force-push: history stays intact, the rollback is itself a
// normal commit, and rolling back the rollback is just another rollback.
export async function rollbackTo(sha: string, message: string) {
  const targetTree = (await (await gh(`/repos/${REPO}/git/commits/${sha}`)).json()).tree.sha;
  const head = (await (await gh(`/repos/${REPO}/git/ref/heads/${BRANCH}`)).json()).object.sha;
  const commit = await (await gh(`/repos/${REPO}/git/commits`, {
    method: "POST", body: JSON.stringify({ message, tree: targetTree, parents: [head] }),
  })).json();
  await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha }) });
  return { sha: commit.sha, url: `https://github.com/${REPO}/commit/${commit.sha}` };
}
```

`api/deploy/index.ts` — one function, two verbs: `GET` lists recent commits, `POST
{ sha }` rolls back. Admin-gated, logged as `site.rollback`. The UI requires a confirmation
naming the version being restored.

---

## 15. AI Builder agent

A chat in the admin ("Build with AI") backed by an agent that reads the repository,
stages file edits, builds a preview deployment, and — only when explicitly told to —
publishes to production.

### 15.1 Architecture

- **Stateless server.** The client sends the whole conversation plus any pending staged
  edits on every call; the server keeps nothing between calls.
- **Tool-calling loop**, max 16 steps per run, `maxDuration: 300`.
- **Two modes:** `build` (broad model for multi-file architecture work) and `reason`
  (reasoning model, high effort, for bug-hunting). Reasoning-effort parameters must only
  be attached for models that accept them alongside tools.
- **Read-your-writes cache:** pending edits seed the file cache, so the model sees its own
  unpublished work instead of the stale version on GitHub.

### 15.2 Tools

| Tool | Does | Notes |
|---|---|---|
| `list_files` | Repository tree | Also injected into the system prompt |
| `read_file(path)` | File contents | Cached per run; truncated at 60k chars |
| `search_code(query)` | Code search across the repo | Find before reading |
| `list_assets(query?)` | Browse the Asset Hub | So it uses real uploaded images by exact URL |
| `propose_edit(path, content, summary)` | **Stage** a full-file replacement | Stores `oldContent` for diffing, `isNew`; updates the cache |
| `publish_site(message)` | Commit all staged edits atomically | Merges earlier staged edits with this run's, current run winning |

### 15.3 Staging, preview, publish

```
propose_edit ─► staged edits (client-held, shown as diffs: oldContent → content)
      │
      ├─► "Preview" ─► deployToBranch(edits): new commit = main HEAD tree + edits,
      │                force-update refs/heads/cms-preview → Vercel preview URL
      │                (poll deployment status by sha) — production untouched
      │
      └─► "Publish" (button, or publish_site when the user explicitly says so)
                     ─► commitFiles(edits, message): atomic multi-file commit via the
                        Git Data API (blobs → tree on base_tree → commit → PATCH ref)
                     ─► publish_log (commit_sha, commit_url) · activity_log agent.publish
```

### 15.4 Reference: the loop (condensed)

```ts
export const config = { maxDuration: 300 };
const MAX_STEPS = 16;

export default async function handler(req: any, res: any) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return res.status(auth.status).json({ error: auth.error });

  const { messages: history, pendingEdits = [], mode = "build" } = req.body;
  const model = mode === "reason" ? getReasoningModel() : getModel();

  let tree: string[];
  try { tree = await listTree(); }
  catch (e: any) {
    // Fail fast and ACTIONABLE — a stale token otherwise reads as "the agent is broken".
    return res.status(502).json({ error: /401|403/.test(e.message)
      ? "The site's GitHub token is invalid or expired — an owner needs to replace GITHUB_TOKEN."
      : `Couldn't reach the code repository (${e.message}).` });
  }

  const fileCache: Record<string, string | null> = {};
  for (const e of pendingEdits) fileCache[e.path] = e.content;          // read-your-writes

  const messages = [{ role: "system", content: buildSystemPrompt(tree, pendingEdits) }, ...history.map(toModelMessage)];
  const edits: Record<string, Edit> = {};
  const transcript: Step[] = [];
  let published = null;

  for (let step = 0; step < MAX_STEPS; step++) {
    const msg = (await chat(messages, TOOLS, { model })).choices[0].message;
    messages.push(msg);
    if (!msg.tool_calls?.length) break;
    for (const tc of msg.tool_calls) {
      const args = safeJson(tc.function.arguments);
      const result = await runTool(tc.function.name, args, { tree, fileCache, edits, pendingEdits, transcript, onPublish: (p) => (published = p) });
      messages.push({ role: "tool", tool_call_id: tc.id, content: String(result) });
    }
  }

  await logActivity({ actor: auth.email, action: published ? "agent.publish" : "agent.run", category: "agent", /* … */ });
  res.status(200).json({ reply: lastAssistantText(messages), transcript, edits: Object.values(edits), published, model, mode });
}
```

Attachments: images the user attaches are uploaded first (Module 02), then folded into the
user message as explicit URLs — *"use these EXACT URLs"* — so the agent embeds real CDN
links rather than inventing paths.

### 15.5 The transcript

Each tool call appends a human step (`Scanned the codebase`, `Read src/pages/Home.tsx`,
`Staged edit to …`). The UI shows these live under the reply — it is what makes the agent
feel trustworthy rather than magical.

### 15.6 The system prompt is the product

The reference prompt is ~220 lines. It is the single most valuable file in this module and
**must be rewritten for each brand.** Structure that works:

```
You are <AGENT NAME>, the in-house website-builder agent for <BRAND> (<domain>).

# How you work
0. QUESTIONS GET ANSWERS, NOT EDITS. "Can you…?", "is it possible…?" → answer, describe
   the change, ask if they want it. Only stage edits once they clearly ask.
1. Plan briefly: which files, smallest complete change, what could break.
2. Ground yourself in the ACTUAL code — search_code, read_file. Never edit a file you
   haven't read in this conversation.
3. Smallest change that fully satisfies the request, matching surrounding code.
4. propose_edit with the COMPLETE new file contents.
5. Explain what you changed in plain language a marketer understands.

# Publishing
Staged edits are not live. Only call publish_site when the user explicitly says
publish/deploy/make it live in THIS conversation. Otherwise finish staged and ask.

# Editable content vs code
[explain useC / editable / blocks.json; content swaps are the team's job; the agent's job
is NEW sections, layout, styling, components, anything not exposed as a key]

# Buttons & links      — always CtaButton + both keys in blocks.json
# Page structure       — new sections go in SECTION_MANIFESTS + PageSections map
# Nav, footer, pages   — content-managed; never hard-code; append-only indexes
# Design tokens        — live CSS variables; use the token classes, never hex
# Images               — list_assets; use URLs verbatim
# <each data-driven subsystem: pricing, help center, blog…>

# Hard rules
- Never read, edit, print, or reference secrets (.env*, credentials files).
- Keep the build green: valid TS, imports, don't remove exports others use.
- Stay on-brand and minimal; don't "improve" unrelated code.
- The admin portal (src/admin, api/) is developer territory — "there's no field for X" is
  feedback to pass on, not an instruction. Offer the workaround.
- No new npm dependencies (you can't install).
- Preserve accessibility and responsiveness.
- If a request would break the site or is off-brand, say so and propose better.
```

Every time the agent does something irritating in production, add a line. It is cheaper
than any other correction mechanism.

### 15.7 "Fix with AI" on the canvas

Alt-click any element in the editor → `cms-ai-select` sends its descriptor → a side panel
opens pre-loaded with *"Change this element: `<tag class=…>` in section `<id>` with text
`…`"* → the team describes the change → the same agent endpoint runs with that context →
staged edits → Publish.

---

## 16. Review comments

Figma-style commenting on the live preview.

### The rule that matters: anchor to the element, not the page

Storing "42% down the page" fails the moment a section is added above, an image finishes
loading, or the preview switches to mobile — every pin drifts. The reference build shipped
that first and the report was *"the comments just became a floating set."*

```ts
// Nearest meaningful ancestor the canvas already marks.
function anchorFor(start: Element | null) {
  for (let el = start; el && el !== el.ownerDocument?.body; el = el.parentElement) {
    const key = el.getAttribute?.("data-edit-key");
    if (key) return { el, anchor: `key:${key}`, label: labelFor(el, key) };
    const sec = el.getAttribute?.("data-cms-section");
    if (sec) return { el, anchor: `section:${sec}`, label: labelFor(el, sec) };
  }
  return null;
}

// On click in comment mode: store the position WITHIN the anchored element.
const hit = anchorFor(e.target as Element);
if (hit) {
  const r = hit.el.getBoundingClientRect();
  pending = { anchor: hit.anchor, label: hit.label,
              x: r.width ? (e.clientX - r.left) / r.width : 0.5,
              y: r.height ? (e.clientY - r.top) / r.height : 0.5 };
} else {
  pending = { anchor: null, label: null, x: e.pageX / docWidth, y: e.pageY / docHeight };   // fallback
}

// Rendering a pin: resolve the anchor back to a live element.
const host = resolveAnchor(doc, t.anchor);   // querySelector by data-edit-key / data-cms-section (CSS.escape!)
const left = host ? rect.left + scrollX + t.pos_x * rect.width  : t.pos_x * docWidth;
const top  = host ? rect.top  + scrollY + t.pos_y * rect.height : t.pos_y * docHeight;
```

Re-measure every pin on a `ResizeObserver(doc.body)` and on `load` of images/videos — late
media moves everything below it.

**Other behaviours:** pins are injected into the preview document itself (so they scroll
with content); numbered; blue when open, green when resolved; click a pin → its thread
scrolls into view in the side drawer; threads support replies (`parent_id`), `@mentions`,
resolve/reopen, "mine only" filter, and per-page open counts in the page picker.

---

## 17. Security

- The public site reads **only** `published_content`. Drafts need an admin JWT (RLS).
- Preview reads drafts using the admin's own token from `localStorage` — no service key
  ever touches the browser.
- Every serverless function calls `requireAdmin()` (Module 00).
- The agent never sees secrets: `.env*` and credential files are refused in the prompt and
  should also be filtered from `list_files` / `read_file` server-side.
- `GITHUB_TOKEN`: fine-grained, single repository, contents read/write only. Rotate on staff changes.
- Content is rendered as React text nodes — never `dangerouslySetInnerHTML`.
- `postMessage` receivers check `e.data.type`. For higher assurance, also check
  `e.origin === location.origin` (canvas and admin are same-origin).

---

## 18. Nuances & hard-won lessons

1. **Lazy-load all editor code.** The canvas, scroll sync, and admin must never reach the
   public bundle. Easy up front; tedious to retrofit.
2. **`display:contents` wrappers have no box.** Observe the first child, not the wrapper.
3. **New manifest sections go beside their neighbours**, not at the end (§8.2).
4. **Only ever append to indexed key lists** (§11.3).
5. **Hidden ≠ deleted.** Visitors see nothing; the canvas shows a ghost. A hidden thing the
   team can't find again becomes a support ticket.
6. **Empty label = hidden**, for buttons and nav items. An empty button is a mistake, not a design.
7. **Surface every publish failure** with per-key detail (§13.3).
8. **Attach ResizeObservers after the loading gate** or the preview iframe collapses to 0px.
9. **Default links to same-tab**, `rel="noopener"` not `noreferrer` (§10).
10. **Canvas clicks must `preventDefault` in the capture phase** or links navigate the preview away.
11. **Editors show the draft value, not the rendered text** — rendered text may be a fallback.
12. **Reorder commits on drop, not on every drag frame** — one write, one history entry.
13. **Force reveal animations open in gallery previews** or thumbnails render blank.
14. **The agent must be told "questions get answers, not edits."** Without it, "can you
    make the hero bigger?" silently rewrites the hero.
15. **Fail fast on expired credentials** with an actionable message (§15.4).
16. **`git pull --rebase` before every push** — the agent and teammates commit to `main` too.
17. **Smooth-scroll libraries must not hijack the wheel over third-party overlays.** Lenis
    swallowed wheel events over Meta's Event Setup Tool dropdown, so it couldn't scroll. Set
    `allowNestedScroll: true` and `prevent: (node) => node !== document.body && !root.contains(node)`.
18. **Write responsive visibility as `max-lg:hidden`, never `hidden lg:flex`.** Meta's Event Setup
    Tool injects `.hidden{display:none!important}`, which beats `lg:flex` — it wiped the entire
    nav (links, Log in, Start free) while the team was trying to tag those very buttons.

---

## 19. Productization upgrades (beyond the reference build)

Recommended for the productized version; each is independent.

| Upgrade | Why | Sketch |
|---|---|---|
| **Content version history** | Rollback exists for code, not content | `content_history(key, value, published_by, published_at)` written on every publish; "restore" per key or per publish |
| **Scheduled publishing** | Launches at a set time | `scheduled_at` on a publish batch + a cron that publishes due batches |
| **Per-role publish permission** | Editors draft, admins publish | Check `is_admin_manager()` in an RPC that performs the publish |
| **Agent approval gate** | Agent can currently deploy to `main` | Require preview + a human click; remove `publish_site` from the agent or gate it by role |
| **i18n-ready keys** | Adding languages later is expensive | Decide now: locale column on `content_blocks`, or `<locale>:` key prefix |
| **Discard draft per key** | Undo a mistake before publishing | Set `draft_value = published_value` |
| **Presence** | Two editors on one page | Supabase Realtime presence channel per page |

---

## 20. Acceptance tests

**Content pipeline**
- [ ] With the database unreachable, every page renders using `blocks.json` defaults.
- [ ] Editing a field in the panel updates the preview within ~1s; the public site is unchanged.
- [ ] Publishing makes the change public; `publish_log` gains a row naming the keys.
- [ ] A forced RLS failure during publish shows an error naming how many keys failed.
- [ ] Anon `select` on `content_blocks` returns nothing; `published_content` returns only published values.

**Canvas**
- [ ] Hover highlights editable elements with the correct badge per type.
- [ ] Clicking a link on the canvas opens its editor and does **not** navigate.
- [ ] The popover appears under the clicked element at desktop, tablet, and mobile widths.
- [ ] Alt-hover highlights any element purple; Alt-click opens "Fix with AI" with its descriptor.
- [ ] The public production bundle contains none of the canvas code.

**Structure**
- [ ] Hide, reorder, delete, add template, add shared — each reflected in preview, and live after publish.
- [ ] A template inserted twice produces two independently editable sections.
- [ ] Adding a section to the manifest while a custom layout is saved inserts it beside its neighbours.
- [ ] Scrolling the preview highlights the matching structure row; clicking a row scrolls the preview.

**Links, pages, nav**
- [ ] Setting a button `visible:false` removes it live and shows a ghost on the canvas.
- [ ] Emptying a nav label removes it with no gap.
- [ ] Turning a page off redirects its route home and removes every nav/footer link to it.
- [ ] Filling a spare nav slot adds a menu item with no code.
- [ ] New-tab is off by default; turning it on adds `target="_blank" rel="noopener"`.

**Publish Center & rollback**
- [ ] Pending changes are described in plain English (text diff, "Button hidden", "Section order updated").
- [ ] Rollback creates a new commit (history intact) and the site returns to that version.

**Comments**
- [ ] A comment pinned to a heading stays on it after a section is added above and after switching to mobile.

**Agent**
- [ ] "Can you add a testimonials section?" gets an answer and a question — no edits staged.
- [ ] "Add it" stages edits with diffs; Preview produces a working preview URL; production unchanged.
- [ ] Publish commits atomically; the site deploys; `publish_log` has the commit sha.
- [ ] With an invalid `GITHUB_TOKEN`, the error names the token as the problem.
- [ ] Asking the agent to show `.env` is refused.

---

## 21. Build plan

1. **Content runtime** — `content_blocks`, `published_content`, `blocks.json`, `ContentProvider`,
   `useC`, `editable`, `resolveAsset`. Convert one page to keys. Seed the table.
2. **Site Editor v1** — page picker, field list, debounced writes, preview iframe with scaling,
   `cms-refresh-content`. Publish button with per-key error surfacing + `publish_log`.
3. **Visual canvas** — `visualEdit.ts`, the receiver, popover editors (text, richtext).
4. **Links** — `parseLink`, `CtaButton`, the link editor, ghosts on canvas.
5. **Structure** — manifests, `resolveLayout`, `PageSections`, the structure panel (hide,
   reorder, delete), `previewSync.ts` and two-way scroll sync.
6. **Pages, nav, footer** — `PageGate`, `hrefPageSlug`, indexed keys with spare slots, Global tab.
7. **Template gallery** — registry, `TemplateInstance`, shared sections, live-preview gallery.
8. **Publish Center** — pending list with `describeChange`, discard, history.
9. **Rollback** — `api/_lib/github.ts`, `api/deploy/index.ts`, versions UI.
10. **Review** — `comments` table, comment mode, anchored pins, threads, mentions.
11. **AI agent** — `openai.ts`, tools, loop, staging + diff UI, preview branch, publish,
    conversations table, transcript UI. Then write the brand's system prompt (§15.6).
12. **Fix with AI** — Alt-click descriptor → agent panel.
13. Run §20 end to end.
