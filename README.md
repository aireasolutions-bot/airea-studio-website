# AIREA Studio — Website

Award-grade marketing site for **AIREA Studio**, the AI marketing OS.
White-editorial + Studio Blue, gradient-rich, interactive (GSAP + Three.js +
Framer Motion), built to convert visitors into free-trial sign-ups.

## Stack

- **Vite + React 18 + TypeScript**
- **Tailwind CSS 3.4** (brand tokens in `tailwind.config.js`)
- **Three.js + @react-three/fiber** — animated WebGL gradient hero (lazy-loaded)
- **GSAP + ScrollTrigger** — scroll interactions / magnetic buttons
- **Framer Motion** — entrance + scroll-linked animations
- **Lenis** — smooth scrolling
- **lucide-react** — icons

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
```

## Build & deploy

```bash
npm run build        # type-checks, outputs static site to /dist
npm run preview      # preview the production build
```

Deploy `/dist` to any static host. SPA route rewrites are pre-configured for
**Vercel** (`vercel.json`) and **Netlify** (`public/_redirects`).

## Structure

```
src/
  components/   Nav, Footer, Logo, ui (Button/Tag/etc.), PhoneFrame, RobotHead,
                Marquee, Reveal, SubHero, Faq, PricingCards, FeatureTriple, Layout
  sections/     Hero, StatStrip, OnePhotoCampaign, ProductFilm, HowItWorks,
                BrandDNA, Channels, TheWall, UseCases, Testimonials,
                PricingPreview, FinalCTA
  pages/        Home, Pricing, SmallBusiness, Ecommerce
  three/        GradientCanvas (WebGL shader gradient)
  hooks/        useSmoothScroll, useMagnetic, useCountUp
  lib/          site.ts (all copy/content), cn, gsap
public/assets/  brand/ robot/ platforms/ product/ campaigns/ video/ generated/
```

## Brand tokens

`#FAFAFA` canvas · `#1A1A1A` ink · `#0047FF` Studio Blue · Instrument Serif
(display) · Inter (body) · JetBrains Mono (labels).

## Custom brand fonts (`/brandfonts` proxy)

Fonts uploaded in the admin's **Design** page go to R2 under `assets/fonts/`,
but `@font-face` is always a CORS-restricted fetch and R2's public `r2.dev`
URL sends no `access-control-*` headers (bucket CORS policies only apply to
R2 **custom domains**). So fonts are served through a same-origin proxy:
`/brandfonts/*` → R2 `assets/fonts/*`, configured in `vercel.json` (must stay
above the SPA catch-all rewrite) and mirrored for local dev in
`vite.config.ts`. `fontSrc()` in `src/lib/design.ts` maps the stored URL onto
that path. Note `vercel.json` is strict JSON — no comment keys, they fail the
build.

## Notes

- **Robot mascot** uses `public/assets/robot/head.png`. Additional Higgsfield-
  generated poses go in `public/assets/generated/` (pending — see chat).
- **Placeholder copy** to confirm/replace: pricing tiers (`src/lib/site.ts` →
  `PLANS`), testimonials (`TESTIMONIALS`), and app URLs (`app.aireastudio.ai/*`).
- `scripts-import-assets.sh` documents how source assets were curated/optimised
  from the parent project folders.
```
