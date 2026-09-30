# Admin Portal Module Kit

A productized, brand-neutral specification of the self-serve marketing-site platform built
for AIREA Studio — split into installable modules that Claude can build for any brand.

Each module is a complete implementation spec: what it does, how it works, the brand
knobs, SQL, server contracts, reference code for the parts that are subtle, the admin UI,
security, the hard-won lessons, upgrades beyond the original build, acceptance tests, and an
ordered build plan.

---

## The modules

| # | Module | One line | Depends on |
|---|---|---|---|
| **00** | [Foundation](00-FOUNDATION.md) | Brand config, admin auth, roles, `requireAdmin`, admin shell, activity log, deploy | — |
| **01** | [Website Builder](01-WEBSITE-BUILDER.md) | Click-to-edit live site, draft → publish, sections, templates, links, pages, review comments, rollback, AI builder agent | 00 |
| **02** | [File Storage](02-FILE-STORAGE.md) | Any-size secure uploads to S3/R2, verified registration, type/size policy, font proxy | 00 |
| **03** | [Asset Hub](03-ASSET-HUB.md) | Media library + picker: whole-image thumbnails, expand, drag-drop, folders, alt text, safe delete | 00 · 02 |
| **04** | [SEO & AI Discoverability](04-SEO.md) | Per-page meta, schema.org graph, crawler prerendering, runtime sitemap, robots/llms.txt, SEO console + agent | 00 |
| **05** | [Branding](05-BRANDING.md) | Live design system: palette from one colour, fonts incl. uploads, button shape, background, no flash | 00 · 01 · 02 |

```
                    ┌──────────────── 00 Foundation ────────────────┐
                    │ brand.config · auth · roles · shell · logs     │
                    └──┬──────────────┬───────────────┬─────────────┘
                       │              │               │
              01 Website Builder   02 File Storage   04 SEO
                       │              │     │
                       │              │   03 Asset Hub ──► used by 01 (image fields) and 05 (fonts)
                       │              │
                       └──────┬───────┘
                        05 Branding  (rides 01's content pipeline, 02's font proxy)
```

### Common install sets

| Brand needs | Install |
|---|---|
| Team edits copy and images on a marketing site | 00 · 01 · 02 · 03 |
| + the team controls the look | + 05 |
| + it must rank and preview well | + 04 |
| The whole platform | 00 → 01 → 02 → 03 → 04 → 05 |
| Just a media library for another app | 00 · 02 · 03 |

Recommended order: **00 → 02 → 03 → 01 → 04 → 05.** Storage and the Asset Hub first means
the Website Builder's image fields have a picker to open the day they're built.

---

## How to hand a module to Claude

Start a fresh Claude Code session in the new brand's project. Attach `00-FOUNDATION.md`
plus the module(s) you want built, and the completed **Brand intake** (below). Then:

```text
I'm building the admin portal for <BRAND>. Attached are the module specs from our platform
kit, plus our brand intake.

Build <MODULE(S)> exactly as specified, personalized to <BRAND> using the intake. Rules:

1. Follow each module's "Build plan" in order. After each step, run the relevant
   "Acceptance tests" and show me the results before moving on.
2. Everything marked 🔁 is brand-specific — fill it from the intake. Everything else is
   engine code: keep its behaviour, even where it looks simplifiable.
3. Treat every item in "Nuances & hard-won lessons" as a requirement. Each one was a
   production bug in the original build.
4. Use the "cms-" prefix for all internal protocol names, data attributes, and storage keys.
5. Where a spec's reference code and the productized notes differ, the productized notes win.
6. Don't build "Productization upgrades" unless I ask — list the ones you'd recommend at the end.
7. Never put a secret in a VITE_ variable, and never commit .env files.

Start with Module 00 if it isn't installed yet. Confirm the plan with me first.
```

Hand over **one or two modules per session**. The specs are dense; smaller scopes produce
better builds and cleaner verification.

---

## Brand intake — gather before building

Fill this in once per brand; every module reads from it.

### Identity (→ `brand.config.ts`, SEO)
- Brand name, legal name, one-line tagline, 1–2 sentence description
- Canonical domain; product app URL(s); sign-up and sign-in URLs
- Contact email; social profile URLs (LinkedIn, X, Instagram, YouTube, Facebook, TikTok)
- Locale, language, currency
- Logo files (full, mark, on-dark) and a 1200×630 social share image
- Organization type for structured data (SaaS / product / local business / publisher)

### Site structure (→ Module 01)
- Pages: slug, path, label — and which ones the team may switch off
- For each page: its sections, in order, with a label each
- Nav items (and how many spare slots); footer columns and links
- Every CTA: label, destination, and whether it's a signup/login (for tracking)
- Which of the eight template-gallery layouts make sense for this brand

### Look (→ Module 05)
- House palette: background, surface, card, three text levels, accent, borders (hex)
- House fonts: display, body, mono — and 5–8 alternatives per role for the pickers
- Accent presets (4–6); default button shape; default background style
- Any custom font files the brand owns

### Discoverability (→ Module 04)
- Per page: target title (≤60), description (140–160), focus keyword
- Pricing plans (for structured data and `pricing.md`)
- AI-crawler policy: allow training crawlers (Google-Extended, CCBot) or answer engines only?

### Infrastructure (→ Modules 00, 02)
- Supabase project; Vercel project; GitHub repo
- Storage provider and bucket; asset domain (custom domain recommended)
- Auth email sending domain (for Resend)
- Owner email(s) and initial team with roles

### The AI agent (→ Module 01 §15)
- Agent name and personality in one sentence
- What the team is allowed to ask it to do, and what it must never touch
- The brand's voice rules (so its copy edits sound right)

---

## Conventions shared by every module

| Convention | Rule |
|---|---|
| **Brand values** | Live in `brand.config.ts` (or a module config importing it) — nowhere else |
| **Internal names** | `cms-` prefix for message types, data attributes, CSS hooks, storage keys |
| **Admin check** | One function — `is_admin()` — used by RLS, `requireAdmin()`, and the client. Case-insensitive. |
| **Writes** | Every write checks its response. No success toast without it. |
| **RLS** | On every table. Written tables get explicit write policies. Public reads go through views or scoped SELECT policies. |
| **Secrets** | Never behind `VITE_`. Storage and service keys server-side only. |
| **Draft → publish** | Anything a visitor can see has a draft stage (SEO metadata is the deliberate exception) |
| **Hidden ≠ deleted** | Hidden things vanish for visitors and stay as ghosts in the editor |
| **One engine per job** | One upload function, one markdown renderer, one admin gate — imported everywhere |
| **Fail open** | Enhancement layers (crawler middleware, logging, design cache) degrade silently, never break the page |
| **Lazy admin** | No admin or editor code in the public bundle |
| **Activity** | Every meaningful action logged as `<area>.<verb>` |

---

## Relationship to the other docs

- **[PLATFORM-BLUEPRINT.md](../PLATFORM-BLUEPRINT.md)** — the architectural overview of the
  whole AIREA system, including modules not yet broken out into this kit.
- **Not yet in the kit** (specified at overview level in the blueprint): Blog CMS with AI
  research agent · Help Center · Pricing Studio · Tracking manager + AI wizard · conversion
  events. Each follows the same patterns and can be broken out into a module spec on request.

---

## Provenance

Every module was written from the production source of aireastudio.ai, verified against the
live database schema and live behaviour. Where the productized spec deliberately differs from
the original build — neutral token names, the `cms-` prefix, a single case-insensitive admin
check, server-side upload validation, pluggable SEO resolvers, delete-with-usage-check — the
module says so, and why.
