# Marketing Site + Self-Serve Admin Portal — Build Blueprint

**What this is:** a complete specification of a production system that has been running and
iterated on for months — a marketing website whose every word, link, image, section, page,
price, blog post, help article, pixel and design token is editable by a non-technical
marketing team, plus an AI agent that can read and write the codebase and deploy.

**Why it exists:** to be rebuilt for a different brand without rediscovering the same
problems. Roughly 24,000 lines across 126 files, and a large share of the design decisions
below were paid for with production bugs. Read §22 (Hard-won lessons) before you design
anything — several "obvious simplifications" are traps that were already fallen into.

**How to use it:** treat this as the requirements document, not as code to copy. The
architecture and contracts matter; the brand, copy, colours and section list are meant to be
replaced. Anything marked 🔁 is brand-specific and should be swapped.

---

## 1. What the system does

Two audiences, one codebase.

**Visitors** get a fast, animated marketing site — static-feeling, fully responsive, good
Core Web Vitals, real link previews, and content that search engines and AI assistants can
actually read.

**The marketing team** gets an admin portal at `/admin` where they can, with no developer
involved and no deploy:

| Capability | What they can actually do |
|---|---|
| Edit any text | Click it on a live preview of the page and type |
| Edit any image/video | Pick from an asset library, or upload |
| Change any link | Including where every button points |
| Hide anything | A button, a nav item, a section, a whole page |
| Reorder sections | Drag to reorder, per page |
| Add new sections | From a template gallery, or reuse a section from another page |
| Manage pricing | Plans, features, comparison table |
| Change the design | Colours, fonts (including custom uploads), corner radius — sitewide |
| Write blog posts | Markdown editor with media, or have an AI agent research and draft |
| Manage a help centre | Categories, questions, per-question pages |
| Install tracking | Pixels for 11 providers, one field each, or ask an AI wizard |
| Manage SEO | Per-page titles, descriptions, OG images, structured data |
| Leave comments | Pinned to the exact element on the page, like Figma |
| Review and publish | See every pending change, publish deliberately, roll back |
| Ask an AI agent | To change the actual site code and deploy it |

The critical property: **the team edits drafts and publishes deliberately.** Nothing they
type is live until they say so.

---

## 2. Stack

```
Frontend     React 18 + TypeScript + Vite 5
Styling      Tailwind 3.4 (tokens wired to CSS variables — see §11)
Routing      react-router-dom 6
Animation    framer-motion, GSAP, Lenis (smooth scroll), three.js (optional hero canvas)
Icons        lucide-react
Backend      Vercel serverless functions (api/*.ts)
Edge         Vercel Edge Middleware (middleware.ts) — crawler prerendering
Database     Supabase (Postgres + Row Level Security + Auth)
Auth         Supabase magic links, delivered via Resend for deliverability
File storage Cloudflare R2 (S3-compatible) + presigned browser uploads
AI           OpenAI (function calling); code access via GitHub API
Hosting      Vercel, deployed from GitHub main
```

**Deliberately not used:** no CMS product (Contentful/Sanity), no page-builder library, no
state management library, no component library. The content layer is ~400 lines and fits
the app exactly; a general-purpose CMS would have been more code and less control.

**Why Vite + SPA rather than Next.js:** the animation work (GSAP timelines, Lenis, WebGL)
is client-side anyway, the admin is a lazy-loaded bundle the public never downloads, and
the one thing SSR was genuinely needed for — crawlers and link previews — is solved by 150
lines of edge middleware (§18). If you are starting fresh and don't need heavy animation,
Next.js App Router is a reasonable alternative and removes the need for §18 entirely.

---

## 3. Architectural principles

These five ideas carry the whole system. Everything else is detail.

**1. Content is keyed, not structured.**
Every editable string lives at a dotted key (`home.hero.title`). Components ask for a key
and supply a fallback. There is no schema to migrate when copy changes, and a component
that asks for a key nobody has edited still renders.

**2. Every editable thing is one row with two values.**
`draft_value` and `published_value`. The public site reads published; the admin preview
reads draft. Publishing copies draft → published. This one pattern gives you preview,
publish, "unpublished changes" detection, and rollback for free.

**3. The admin edits the real site, not a replica.**
The editor is an iframe of the actual page with `?edit=1`. There is no separate rendering
path to keep in sync, so what they see is what ships. Editing overlays are lazy-loaded and
never reach the public bundle.

**4. Structure is data.**
Which sections a page has, in what order, and whether each is visible, is a JSON array
stored as a content block — riding the same draft/publish pipeline as text.

**5. Hiding is a first-class state, everywhere.**
Every element that can be hidden vanishes cleanly on the live site (no gaps, no empty
containers) but remains visible as a dashed "ghost" on the edit canvas so it can be clicked
and brought back. A hidden thing the team can't find again is a support ticket.

---

## 4. Data model

Complete and copy-paste ready. Adjust names, keep the shapes.

```sql
-- ─────────────────────────────────────────────────────────────
-- Access control. Membership in admin_users IS the permission.
-- ─────────────────────────────────────────────────────────────
create table public.admin_users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  role       text not null default 'editor',   -- owner | admin | editor
  full_name  text,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so RLS policies can call it without recursing into RLS.
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.admin_users a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email','')));
$$;

create or replace function public.is_admin_manager() returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.admin_users a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))
      and a.role in ('owner','admin'));
$$;
grant execute on function public.is_admin(), public.is_admin_manager() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- The content spine. Every editable string, image, link, layout.
-- ─────────────────────────────────────────────────────────────
create table public.content_blocks (
  key             text primary key,          -- 'home.hero.title'
  page            text not null default 'home',
  section         text,                      -- grouping label in the admin
  label           text,                      -- human label in the admin
  type            text not null default 'text',
                  -- text | richtext | image | video | cta | link | layout | json
  draft_value     jsonb,
  published_value jsonb,
  sort            integer not null default 0,
  updated_at      timestamptz not null default now(),
  updated_by      text
);

-- The public site reads ONLY this view. Draft values are unreachable anonymously.
create view public.published_content as
  select key, page, section, label, type, published_value as value
  from public.content_blocks where published_value is not null;

-- ─────────────────────────────────────────────────────────────
-- Media library (files live in R2; this is the searchable index)
-- ─────────────────────────────────────────────────────────────
create table public.assets (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,   -- object key in R2
  filename     text not null,
  url          text not null,          -- public URL
  type         text,                   -- image | video | font | doc
  content_type text,
  folder       text,
  size_bytes   bigint,
  width        integer,
  height       integer,
  alt          text,
  uploaded_by  text,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Figma-style review comments, pinned to page elements
-- ─────────────────────────────────────────────────────────────
create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  page         text not null default '/',
  anchor       text,          -- 'key:home.hero.title' | 'section:hero'  ← see §16
  target_label text,          -- readable text of the anchored element
  pos_x        real,          -- fraction WITHIN the anchored element
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

-- ─────────────────────────────────────────────────────────────
-- Blog
-- ─────────────────────────────────────────────────────────────
create table public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  excerpt         text,
  body            text,           -- markdown
  cover_image     text,
  status          text not null default 'draft',   -- draft | published
  seo_title       text,
  seo_description text,
  keywords        text,
  category        text,
  tags            text[],
  sources         jsonb,          -- [{url,title}] citations from the AI agent
  research        jsonb,          -- the agent's research trail, for transparency
  author          text default 'Team',
  reading_minutes integer,
  word_count      integer,
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz,
  scheduled_for   timestamptz
);

create table public.blog_settings (
  id                 integer primary key default 1,
  enabled            boolean not null default false,
  autopublish        boolean not null default false,
  cadence            text default 'weekly',
  frequency_per_week integer default 2,
  themes             text[],
  tone               text,
  min_words          integer default 1200,
  last_run_at        timestamptz,
  updated_at         timestamptz not null default now(),
  updated_by         text
);

-- ─────────────────────────────────────────────────────────────
-- Help centre. Questions carry category SLUGS, so one question can
-- appear under several topics. `top` drives the hub's featured list.
-- ─────────────────────────────────────────────────────────────
create table public.faq_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort        integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.faq_items (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  question   text not null,
  answer     text not null default '',   -- markdown
  categories text[] not null default '{}',
  top        boolean not null default false,
  sort       integer not null default 0,
  status     text not null default 'draft',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Tracking pixels, installed without a deploy
-- ─────────────────────────────────────────────────────────────
create table public.tracking_tags (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null,       -- ga4 | gtm | meta | tiktok | … | custom
  label       text not null,
  config      jsonb not null default '{}',   -- {"id": "G-XXXX"}
  custom_head text,                -- raw HTML, owner/admin only
  custom_body text,
  enabled     boolean not null default false,
  notes       text,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Public view exposing ONLY enabled tags, and never the audit columns.
create view public.active_tracking_tags as
  select id, provider, config, custom_head, custom_body
  from public.tracking_tags where enabled = true;

-- ─────────────────────────────────────────────────────────────
-- Per-page SEO overrides (public read: the site renders them)
-- ─────────────────────────────────────────────────────────────
create table public.seo_meta (
  path        text primary key,     -- '/pricing'
  title       text,
  description text,
  og_image    text,
  canonical   text,
  noindex     boolean not null default false,
  keywords    text,
  priority    numeric,
  changefreq  text,
  jsonld      jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- ─────────────────────────────────────────────────────────────
-- Audit trails
-- ─────────────────────────────────────────────────────────────
create table public.publish_log (
  id           uuid primary key default gen_random_uuid(),
  summary      text,
  changed_keys text[],
  commit_sha   text,
  commit_url   text,
  status       text not null default 'success',
  published_by text,
  created_at   timestamptz not null default now()
);

create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  actor_email text,
  actor_role  text,
  action      text not null,       -- 'blog.publish', 'faq.delete', …
  category    text not null default 'system',
  target      text,
  target_type text,
  summary     text,
  status      text not null default 'success',
  duration_ms integer,
  metadata    jsonb,
  ip          text,
  user_agent  text
);

-- AI agent chat history, scoped to its owner
create table public.agent_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_email text not null,
  title      text not null default 'New chat',
  messages   jsonb not null default '[]',
  staged     jsonb not null default '[]',   -- edits proposed, not yet shipped
  mode       text not null default 'build',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Row Level Security

Enable RLS on **every** table, then:

```sql
-- Admin-only tables
create policy p_content   on public.content_blocks for all
  using (is_admin()) with check (is_admin());
-- identical shape for: assets, comments, blog_settings, activity_log (select only)

-- Public-read tables: the site must read these anonymously
create policy p_blog_public on public.blog_posts for select
  using (status = 'published' or is_admin());
create policy p_blog_admin  on public.blog_posts for all
  using (is_admin()) with check (is_admin());

create policy p_faq_items_public on public.faq_items for select using (status = 'published');
create policy p_faq_items_admin  on public.faq_items for all using (is_admin()) with check (is_admin());

create policy p_faq_cat_read  on public.faq_categories for select using (true);
create policy p_faq_cat_write on public.faq_categories for all using (is_admin()) with check (is_admin());

create policy p_seo_read  on public.seo_meta for select using (true);
create policy p_seo_write on public.seo_meta for all using (is_admin()) with check (is_admin());

-- Raw HTML injection is owner/admin only — an editor can install a known
-- pixel by ID but cannot paste arbitrary <script> into every page.
create policy p_tracking_read   on public.tracking_tags for select using (is_admin());
create policy p_tracking_write  on public.tracking_tags for insert
  with check (is_admin() and (provider <> 'custom' or is_admin_manager()));
create policy p_tracking_update on public.tracking_tags for update
  using (is_admin() and (provider <> 'custom' or is_admin_manager()))
  with check (is_admin() and (provider <> 'custom' or is_admin_manager()));
create policy p_tracking_delete on public.tracking_tags for delete
  using (is_admin() and (provider <> 'custom' or is_admin_manager()));

-- Agent chats are private to their owner
create policy p_agent_convos on public.agent_conversations for all
  using (is_admin() and lower(user_email) = lower(coalesce(auth.jwt() ->> 'email','')))
  with check (is_admin() and lower(user_email) = lower(coalesce(auth.jwt() ->> 'email','')));

-- ⚠️ SELECT-only policies silently swallow INSERTs. If a table is written to,
-- it needs an explicit INSERT policy. See §22.4 — this cost a day.
create policy p_publish        on public.publish_log for select using (is_admin());
create policy p_publish_insert on public.publish_log for insert with check (is_admin());
```

**`published_content` and `active_tracking_tags` are views with no RLS**, which is the
point: they are the narrow, safe public surface. Never let the anon key touch the base
tables directly.

---

## 5. The content pipeline

### Reading content

A single React context provides `c(key, fallback)`:

```tsx
const c = useC();
<h1>{c("home.hero.title", "Marketing, made simpler.")}</h1>
```

Resolution order: **live override → baked-in default → inline fallback**.

`src/content/blocks.json` holds the baked-in defaults, shipped in the bundle. This means
the site renders correctly with the database unreachable, and a brand-new key works before
anyone has ever edited it.

### The provider

On mount, `ContentProvider` fetches every content row in one request and holds it in a map:

- **Normal visitor** → `published_content` view, anon key.
- **Admin previewing** (`?preview=1`) → `content_blocks.draft_value`, using the admin's
  own JWT read from `localStorage`, so RLS authorises it. No serverless function needed.

It also applies the design tokens (§11), and lazily imports the edit-canvas and
scroll-sync modules **only** when `?edit=1` / `?preview=1` — the public bundle never
carries admin code.

### Marking something editable

```tsx
export const editable = (key: string, type = "text") => ({
  "data-edit-key": key,
  "data-edit-type": type,   // text | richtext | image | video | cta
});

<h1 {...editable("home.hero.title")}>{c("home.hero.title", "…")}</h1>
```

That one spread is the entire contract between a component and the visual editor.

### The visual edit canvas

`?edit=1` loads an overlay that:

1. Highlights any `[data-edit-key]` on hover, with a floating badge naming the field type.
2. On click, `postMessage`s to the parent admin window: `{ key, type, value, x, y }`.
3. The admin opens the right editor at those coordinates — a text box, an asset picker, or
   a link editor.
4. **Alt/Option-click** switches to AI mode (purple highlight) and sends a full element
   descriptor — tag, classes, nearest section, text, image src, path — so the AI agent can
   be asked to change *that specific component's code*.

`?preview=1` additionally loads a scroll-sync module: an `IntersectionObserver` posts
`airea-section-visible` upward so the admin's field list follows the preview, and listens
for `airea-scroll-section` so clicking a field scrolls the preview. Two-way sync, ~60
lines.

### Writing and publishing

```
Team edits    → debounced upsert into content_blocks.draft_value
Preview       → reads draft, live
Publish       → copy draft_value into published_value, log to publish_log
Public site   → reads published_content
```

Rows are created on demand. When a key has no row yet (a new field, a layout, a link), the
admin derives its `page`/`section`/`label`/`type` metadata from the key's shape so it files
itself correctly in the admin UI.

---

## 6. Section structure system

Lets the team reorder, hide and add sections on any page.

**The manifest** (`src/lib/sections.ts`) is the source of truth for what a page is made of:

```ts
export const SECTION_MANIFESTS: Record<string, SectionDef[]> = {
  home:    [{ id: "hero", label: "Hero" }, { id: "stats", label: "Stats strip" }, …],
  pricing: [{ id: "hero", label: "Hero" }, { id: "cards", label: "Plan cards" }, …],
};
```

**The stored layout** is a content block, `layout.<page>`, holding an array:

```ts
type LayoutEntry = {
  id?: string;                                  // built-in section
  kind?: "builtin" | "lib" | "shared";
  template?: string;                            // for kind:"lib"
  instanceId?: string;                          // for kind:"lib"
  hidden?: boolean;
};
```

`resolveLayout(page, stored)` merges the two: it honours the stored order and visibility,
appends any manifest section the stored layout doesn't know about (so shipping a new
section doesn't require touching the database), and drops entries whose section no longer
exists.

**Rendering** — pages hand `PageSections` a map of their built-in nodes:

```tsx
<PageSections page="home" sections={{ hero, stats, agent, … }} />
```

Each rendered section is wrapped in `<div style={{display:"contents"}} data-airea-section={id}>`.
`display:contents` is essential: the marker is invisible to layout (no extra box breaking
your grid or flex) but queryable by the editor, scroll-sync and comment anchoring.

---

## 7. Template gallery and cross-page reuse

Two ways to add a section without a developer:

**Template library** (`kind:"lib"`) — a registry of ~8 generic, on-brand layouts: split
hero, centred hero, feature grid, split feature, stat band, testimonials, CTA banner, media
block. Each has `defaults` and a `Component({k})` that reads keys under a per-instance
namespace `sec.<instanceId>.*`. Insert the same template five times and each instance edits
independently.

**Shared sections** (`kind:"shared"`) — the real, already-designed sections from other
pages, offered for reuse. These render the *same* component and therefore share content
keys. This is a feature (change once, updates everywhere) but must be labelled clearly in
the UI or it surprises people.

The gallery shows scaled live previews in iframes rather than screenshots, so it can never
drift from what will actually be inserted. Force reveal-animations open in preview
(`[&_.reveal]:!opacity-100`) or every thumbnail renders blank.

---

## 8. CTA / link system

Every button and link is two keys: `X` for the label, `X_link` for a JSON blob.

```jsonc
{ "href": "/pricing", "visible": true, "newTab": false }
```

```tsx
<CtaButton k="home.hero.cta" defaultLabel="Start free" defaultHref={SIGN_UP_URL} />
```

Behaviour:

- `visible: false` → renders nothing on the live site, a dashed ghost on the edit canvas.
- Empty label → same treatment (an empty button is a mistake, not a design).
- Internal `href` (`/…`, `#…`) → client-side router link; external → anchor.
- `newTab` defaults to **false**. Links open in the same tab unless someone deliberately
  chooses otherwise. (§22.6)
- New-tab links get `rel="noopener"` — **not** `noreferrer`, which strips the referrer and
  blinds your own analytics about traffic you sent to your own app.
- If the destination is a signup URL, the click fires a conversion event (§19).

The admin's link editor offers a quick-pick of every known page plus in-page anchors, a
free-text URL field, a visibility toggle, and a same-tab/new-tab toggle.

---

## 9. Page visibility

`HIDEABLE_PAGES` lists pages that may be switched off. Each maps to a content block
`page.<slug>.visible`.

- `PageGate` wraps the route: hidden → redirect home, unless previewing.
- Nav and footer links resolve their destination to a page slug (`hrefPageSlug`) and hide
  themselves automatically when that page is off. **Hiding a page must never leave a link
  pointing at a redirect.**

---

## 10. Nav and footer

Both are fully content-managed with indexed keys (`global.nav.route0`, `global.footer.col2.link3`).

Two rules that matter more than they sound:

1. **Keys are positional — only ever append.** Reordering the array in code silently
   reassigns everyone's edits to the wrong items.
2. **Ship spare empty slots.** Two blank nav slots and one blank link per footer column
   mean the team can add a menu item with zero code. A blank slot renders nothing.

---

## 11. Design system

The team changes colours, fonts and corner radius sitewide, with live preview.

**The mechanism:** Tailwind colours are declared as CSS variables holding raw RGB channels,
so opacity modifiers still work:

```js
// tailwind.config.js
colors: {
  canvas: "rgb(var(--c-canvas) / <alpha-value>)",
  ink:  { DEFAULT: "rgb(var(--c-ink) / <alpha-value>)", 2: "rgb(var(--c-ink-2) / <alpha-value>)" },
  blue: { DEFAULT: "rgb(var(--c-blue) / <alpha-value>)", ink: "rgb(var(--c-blue-ink) / <alpha-value>)" },
},
fontFamily: { sans: ["var(--font-sans)", …], display: ["var(--font-display)", …] },
```

A `design.tokens` content block stores the chosen values. `applyDesign()` writes them to
`document.documentElement.style` at runtime. Because every component already uses the
token classes, one write restyles the entire site.

**Details that matter:**

- **Cache tokens in `localStorage`** and apply them before first paint, or every visitor
  sees a flash of default brand colours.
- **Derive the accent family** from one base colour (hover, bright, sky, mist) rather than
  asking a marketer to pick five blues.
- **Check contrast** and warn in the UI when a chosen pair fails WCAG AA.
- **Custom font upload** works, but see §22.5 — you will need a same-origin proxy.
- 🔁 The token names (`--c-blue`, `--c-ink`) are brand-flavoured. Rename to
  `--c-accent`, `--c-fg` if you prefer; just keep the raw-channel format.

---

## 12. Admin portal

Lazy-loaded bundle at `/admin`, never downloaded by public visitors.

| Screen | Purpose |
|---|---|
| **Dashboard** | Pending changes, recent activity, quick links |
| **Build with AI** | Chat with the code agent (§13) |
| **Site editor** | Live preview + field list + structure panel. The main workspace |
| **Pricing Studio** | Plans, features, comparison table, live preview |
| **Design** | Colour, typography, radius, custom fonts, live preview |
| **Tracking** | Pixel manager + AI tracking wizard |
| **Assets** | Media library, drag-drop upload, folders, dimensions, copy URL |
| **Review** | Figma-style pinned comments and threads |
| **SEO** | Per-page meta, OG images, structured data, an SEO agent |
| **Blog** | Post list, markdown editor, AI research agent, autopilot settings |
| **Help Center** | FAQ categories and per-question pages |
| **Publish** | Every pending change, publish history, code versions, rollback |
| **Team** | Invite/remove members, set roles |
| **Activity** | Full audit log |

### The Site Editor in detail

Three panes:

- **Left** — page picker, then a scrollable list of every field on that page, grouped by
  section. Follows the preview as it scrolls.
- **Centre** — an iframe of the real page at `?preview=1&edit=1`, with desktop / tablet /
  mobile widths. Click anything to edit it in place.
- **Right (structure panel)** — drag to reorder sections, eye icon to hide, `+` to open
  the template gallery, trash to remove.

Plus a **"Fix with AI"** panel: Alt-click any element on the canvas to hand the AI agent
that exact component, then describe the change in words.

**Publishing surfaces real errors.** An early version reported success when RLS had
silently rejected the write, so the team believed they had published for a week. Never
report success without checking the response. (§22.4)

---

## 13. AI agents

Four agents share one architecture: an OpenAI function-calling loop (max ~16 steps) with a
long, hand-written system prompt describing this specific codebase's conventions.

**Model routing:** a general model (`gpt-5.5`) for broad multi-file work, a reasoning model
(`o3-mini`, high effort) for bug-hunting. Note: reasoning-effort and function tools can't
always be combined on the same endpoint — attach effort only for o-series models.

### 1. Website agent — reads and writes the codebase

| Tool | Purpose |
|---|---|
| `list_files` | Repository tree |
| `read_file` | Read a file |
| `search_code` | Search across the repo |
| `list_assets` | Browse the media library, so it uses real images |
| `propose_edit` | Stage a file change (never writes directly) |
| `publish_site` | Commit staged edits to GitHub → triggers deploy |

Edits are **staged, previewed, then published** — the same discipline as content. The agent
proposes; a human ships.

**The system prompt is the product.** ~220 lines encoding: which systems are
content-managed (never hard-code a price, a nav item, a link), that design changes belong
in tokens, that the admin portal itself is off-limits, when a question deserves an answer
rather than an edit, and how each subsystem works. Every time the agent did something
irritating, a line was added here. Budget real time for this file and keep updating it —
it is cheaper than any other correction mechanism.

### 2. Tracking wizard
Tools to list/create/delete tracking tags, plus live web research so it can look up an
unfamiliar provider's current snippet. It installs pixels for the team.

### 3. Blog agent
Researches the live web, shows every search and source as it goes, and writes a cited draft.
Can run on a cron for autopilot. Transparency here is not decoration — it is what makes an
AI-written draft trustworthy enough to publish.

### 4. SEO agent
Reads page content, proposes and writes per-page meta.

**Guardrails worth copying:**
- Every write is staged and reviewable.
- Fail fast and loudly on a bad credential — a stale GitHub token produced "I can't reach
  the repo", which read as the agent being broken rather than a config problem. Return an
  actionable 502.
- Conversations are stored per user, RLS-scoped.

---

## 14. Blog

Standard CMS on `blog_posts`, plus:

- **Markdown editor** with side-by-side live preview, and image/video insertion from the
  asset library at the cursor.
- **A custom Markdown renderer** (~250 lines) that outputs real React nodes rather than
  `dangerouslySetInnerHTML` — injection-safe by construction. Supports headings, ordered
  and unordered lists, blockquotes, code, rules, links, images, video files, and
  YouTube/Vimeo/Loom embeds.
- **Share a draft** by URL for review before publishing.
- **AI autopilot** — cadence, themes, tone, minimum length; optional auto-publish.

Renderer requirements learned the hard way (§22.7): accept `1)` as well as `1.` for
numbered lists, tolerate `[label] (url)` with a space, and render a lone video link as a
player.

---

## 15. Help centre

Worth building deliberately: AI assistants and search engines lean heavily on help content,
and it is often the highest-intent page on a marketing site.

**Structure:**
- `/help` — hub: search across every answer, category cards, and a "Top FAQs" list
  (whatever the team stars — no fixed count).
- `/help/<category>` — that topic's questions as an accordion.
- `/help/<question>` — **a standalone page per answer**, with breadcrumbs and related
  questions. This is the URL that gets indexed and cited.

The accordion and the standalone page render the same content; each open answer carries a
"Full answer →" link to its own page. Browsing stays fast; machines still get one clean URL
per question.

Categories are **tags** (`text[]` of slugs), so a question can live under several topics.
Categories and questions share one slug namespace, so `/help/<slug>` resolves either —
enforce uniqueness across both when saving.

Serve the whole (small) help centre in one request and filter client-side: search becomes
instant and category pages cost nothing.

**Also expose it as an API.** `GET /api/help` returns published Q&A as JSON with open CORS,
so a separate product/app can render contextual help from the same content the team edits
once. Managing marketing-site help and in-app help separately does not survive scale.

---

## 16. Review comments

Figma-style commenting on the live preview.

**The rule that matters:** anchor a comment to the **element**, not to the page.

Storing a comment at "42% down the page" seems fine and is not — the moment a section is
added above, an image finishes loading, or the preview switches to mobile, every pin drifts
and the whole board becomes meaningless. This happened, and the report was "the comments
just became a floating set."

Anchor instead to the nearest `[data-edit-key]` or `[data-airea-section]` — markers the
canvas already carries — storing `anchor: "key:home.hero.title"` plus the position *within*
that element. Re-measure pins on a `ResizeObserver` and on media load. Keep the page-fraction
path as a fallback for anything with no anchor.

Pins are injected into the preview document itself so they scroll and scale with content.

---

## 17. Asset hub

Cloudflare R2 (S3-compatible), with a three-mode upload endpoint:

1. **Small files (≤ 3 MB)** — base64 through the API. Simple, fits the serverless body limit.
2. **Large files** — the API returns a **presigned PUT URL**; the browser uploads straight
   to storage with real progress. No size ceiling.
3. **Register** — after a direct upload, the API verifies the object exists and indexes it.

**Storage credentials never reach the browser** in any mode.

Two things that will bite you:

- **Every uploader must share one engine.** A second upload path was written for the
  in-editor picker and it always used base64 — a 76 MB video died with an opaque `413`
  while the same file worked fine from the assets page. One function, imported twice.
- **The bucket's CORS must allow `PUT`** or direct uploads fail at the preflight, with a
  message that explains nothing. See §22.8.

---

## 18. SEO and the crawler layer

A client-rendered SPA serves crawlers an empty shell. Social scrapers and most AI crawlers
don't run JavaScript, so every URL previews as the homepage and help content is invisible.

**Edge middleware solves it in ~150 lines.** Detect crawler user-agents, fetch the same
`index.html`, and inject:

- the page's real `<title>`, description, canonical, OG and Twitter tags;
- `FAQPage` / `Article` / `BreadcrumbList` JSON-LD;
- **real body content** for help and blog pages — the actual question and answer HTML —
  placed inside `#root`, where a JS-capable crawler simply replaces it.

This is Google's documented **dynamic rendering** pattern, not cloaking: values come from
the exact same sources the browser renders from.

Non-negotiables:
- A loop-breaker header on the internal fetch, or the middleware calls itself forever.
- **Fail open.** Every error path falls through to the normal page. A link preview is never
  worth an outage.
- Exclude `api/`, `admin`, hashed build assets, and anything with a file extension.
- `cache-control: no-store` + `vary: user-agent` so a bot response is never served to a human.

**Generate `sitemap.xml` at runtime**, not at build. A build-time file goes stale the moment
the team publishes anything, and — because static files win over rewrites — a stale one can
silently shadow the dynamic route. Include every published post and help page with real
`lastmod` dates. (§22.9)

Ship a `robots.txt` that explicitly welcomes AI crawlers: being cited by an assistant *is*
distribution.

---

## 19. Analytics and conversion tracking

Two layers.

**Tag runtime** — reads `active_tracking_tags` and injects each provider's official snippet
at runtime. Toggling a pixel in the admin is live on the next page load, no deploy.
It also fires SPA page-views on route changes (patch `pushState`), which pixels otherwise
miss entirely. Guards: never on `/admin`, never in preview or edit mode, never on localhost
unless explicitly requested.

**Conversion layer** — a small provider-agnostic module:

```ts
track("Lead", { content_name, content_category, source_path, destination });
```

which fans out to whichever pixels are loaded, using each platform's own event name
(Meta `Lead` / GA4 `generate_lead` / TikTok / Pinterest).

Three requirements:

1. **Every event carries a UUID `eventID`** so a server-side Conversions API twin can be
   deduplicated rather than double-counted later.
2. **Dedupe identical events in a short window.** React StrictMode double-invokes effects,
   components remount, people double-click — and inflated conversion counts train ad
   platforms on noise.
3. **Never throw and never block navigation.** Wrap everything.

If signup happens on a different host, that host needs the same pixel firing
`CompleteRegistration` / `Purchase` to close the loop. A shared parent domain means the
attribution cookie carries across automatically.

---

## 20. Auth, roles, team

Supabase magic links. Three roles:

| Role | Can |
|---|---|
| `owner` | Everything, including raw HTML tags and team management |
| `admin` | Everything except owner-only destruction |
| `editor` | Content, blog, help, assets — not raw HTML injection |

Enforce roles in **RLS**, not just the UI. The tracking policies in §4 show the pattern:
an editor may install a known pixel by ID but not paste arbitrary script into every page.

**Send auth email through a real provider** (Resend or similar) from day one. Supabase's
built-in mailer is rate-limited hard enough that a team of five hits the ceiling and reads
it as "the login is broken". Style the template on-brand — it's the first thing a new team
member sees. Requires a verified sending domain.

⚠️ **Never put a wildcard like `https://*.vercel.app/**` in the auth redirect allow-list.**
Any Vercel deployment on earth can then complete your login flow. Scope it to your exact
hosts.

---

## 21. Deploy pipeline

```
commit → push to main → Vercel builds → poll GitHub deployments API for status
```

The AI agent uses the same path via the GitHub API, so agent changes and human changes are
indistinguishable downstream — same review, same history, same rollback.

**Version rollback** is exposed in the admin: list recent commits, roll back to one.

`vercel.json` handles: canonical-host redirect (excluding `/api/` so crons keep working),
the SPA catch-all rewrite, `sitemap.xml` → the dynamic function, and any asset proxy.

⚠️ `vercel.json` is **strict JSON** — no comments. A `"//"` key fails the build with a
schema error. (§22.2)

---

## 22. Hard-won lessons

Each of these cost real time in production.

**22.1 — The public bundle must never carry admin code.**
Lazy-load the admin route, the edit canvas and the scroll-sync module. Easy to get right up
front, tedious to retrofit.

**22.2 — `vercel.json` takes no comments.** Strict JSON. A comment key fails the build.

**22.3 — jsonb double-encoding.** Writing `"false"` (a JSON string) where `false` was meant
produces a value that is truthy in JS and passes type checks. Be deliberate about what is
JSON and what is text.

**22.4 — A SELECT-only RLS policy silently swallows INSERTs.**
No error, no row. The publish history looked empty for a week and the team believed
publishing was broken. Two rules: every written table gets an explicit INSERT policy, and
**never report success without checking the response.**

**22.5 — Public object-storage domains ignore bucket CORS.**
R2's `r2.dev` URL will not send `Access-Control-Allow-Origin` no matter what the bucket
says, which breaks web-font loading. Proxy fonts through a same-origin path
(`/brandfonts/*` → storage) via a rewrite.

**22.6 — Consistent link behaviour.**
Two code paths meant "Log in" opened in the same tab and "Start free" spawned a window,
with no admin control. Default to same-tab, make it a per-link setting, and use
`rel="noopener"` (not `noreferrer`) so your own analytics can see referrals.

**22.7 — Be forgiving in a markdown editor written by marketers.**
People type `1)` for numbered lists and `[label] (url)` with a space. Standard parsers
reject both and render raw brackets to customers — the worst possible failure. Accept the
common variants.

**22.8 — Presigned uploads need `PUT` in the bucket's CORS `AllowedMethods`.**
Otherwise the preflight fails with an opaque error. Also note that setting bucket CORS
requires an *admin*-scoped storage token; an object-scoped token returns `AccessDenied`.

**22.9 — Generate the sitemap at runtime.**
A build-time file goes stale the moment content is published, and a static file shadows a
rewrite to a dynamic route.

**22.10 — Don't override a shared renderer's typography from a wrapper.**
Help answers wrapped the shared markdown renderer in classes that flattened `##` headings
to body size. The team correctly reported "`##` doesn't work" — while the identical syntax
worked on the blog. Either use the renderer as-is or give it an explicit variant.

**22.11 — Positional keys must only be appended to.**
Reordering an indexed array in code reassigns everyone's saved edits to different items.

**22.12 — Guard against agent and teammate commits racing yours.**
`git pull --rebase` before every push; multiple actors write to `main`.

---

## 23. Suggested build order

Each phase is independently useful — the team can start working after Phase 2.

| Phase | Deliverable |
|---|---|
| **1. Foundation** | Vite + React + Tailwind with token-wired colours (§11). Static site, real content, no CMS. Get the design right first — retrofitting tokens is painful. |
| **2. Content pipeline** | `content_blocks`, the published view, `ContentProvider`, `editable()`, draft/publish, admin auth. **The team can now edit text.** |
| **3. Visual editor** | Preview iframe, click-to-edit canvas, field list, scroll-sync, asset library + uploads. |
| **4. Structure** | Section manifests, `layout.<page>`, reorder/hide, page visibility, nav + footer management, CTA/link system. |
| **5. Publishing** | Publish Center, publish log, activity log, roles. |
| **6. Content types** | Blog, help centre, pricing — whichever your brand needs. |
| **7. Design + tracking** | Design studio, pixel manager. |
| **8. SEO** | Per-page meta, crawler middleware, dynamic sitemap, structured data. |
| **9. AI agents** | Code agent last — it needs everything above to exist before its system prompt can describe anything. |
| **10. Polish** | Comments, template gallery, conversion events, rollback. |

**Do not build the agent first.** It is the most impressive demo and the least useful
starting point: its value is entirely in knowing the conventions the earlier phases
establish.

---

## 24. Adapting to a new brand

Everything marked 🔁 is brand-specific.

**Replace:**
- 🔁 `src/lib/site.ts` — name, domain, app URLs, social links
- 🔁 `src/lib/seo.ts` — `SITE_URL`, `SITE_NAME`, per-page titles/descriptions, OG image
- 🔁 `src/lib/pages.ts` — the page list and which pages are hideable
- 🔁 `src/lib/sections.ts` — the section manifest per page
- 🔁 `src/content/blocks.json` — all default copy
- 🔁 `tailwind.config.js` + design defaults — the palette and type scale
- 🔁 `src/pages/*` and `src/sections/*` — the actual page designs
- 🔁 `api/_lib/knowledge.ts` — **rewrite the agent's system prompt for the new brand.**
  A prompt describing the wrong product is worse than none.

**Keep unchanged:**
- The entire content pipeline and `ContentProvider`
- `editable()`, the edit canvas, scroll-sync
- The section/layout system and `PageSections`
- The CTA/link model
- The database schema and RLS policies
- The upload engine
- The markdown renderer
- The crawler middleware and sitemap function
- The tracking runtime and conversion layer
- The agent loop and tool definitions (only the prompt changes)

**Environment variables required:**

```
# Supabase
VITE_SUPABASE_URL              # client
VITE_SUPABASE_ANON_KEY         # client
SUPABASE_URL                   # server
SUPABASE_ANON_KEY              # server
SUPABASE_SERVICE_ROLE          # server only — never expose
SUPER_ADMIN_EMAIL              # bootstrap owner

# Storage (S3-compatible)
R2_ENDPOINT R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET R2_PUBLIC_URL
VITE_ASSETS_BASE_URL           # client-side public asset base

# AI
OPENAI_API_KEY
OPENAI_MODEL                   # broad work
OPENAI_REASONING_MODEL         # bug hunting
OPENAI_REASONING_EFFORT
OPENAI_SEARCH_MODEL            # web research

# Code access (for the agent + deploys)
GITHUB_TOKEN GITHUB_REPO GITHUB_BRANCH

# Cron
CRON_SECRET
```

**Setup checklist:**
1. Supabase project; run §4 in the SQL editor; insert yourself into `admin_users` as `owner`.
2. Configure SMTP (Resend) for auth email; verify the sending domain; scope the redirect
   allow-list to your exact hosts — **no wildcards**.
3. Storage bucket; set CORS **including `PUT`** (§22.8); set up the font proxy rewrite (§22.5).
4. Vercel project, environment variables, custom domain.
5. Seed `content_blocks` from `blocks.json` so the admin has rows to show.
6. Rewrite the agent's system prompt for the new brand.

---

## 25. What this system is not

Honest limitations, so nobody is surprised:

- **Not multi-tenant.** One brand per deployment. Multi-tenancy would mean a tenant column
  on every table and a resolver in the content provider — a significant change.
- **No content versioning beyond draft/published.** Rollback exists for *code*, not for
  content. A third `history` table would fix it.
- **No scheduled content publishing** (blog posts have a `scheduled_for` column, but the
  content pipeline has no scheduler).
- **No localisation.** Keys are single-language. i18n would mean either a locale column or
  locale-prefixed keys — decide early if you need it, it is expensive to add later.
- **The AI agent can break the site.** It commits to `main` and deploys. Staging deploys and
  a required human approval step would be a reasonable hardening for a larger team.
- **Search is client-side** for the help centre — fine at a few hundred items, not at
  thousands.
