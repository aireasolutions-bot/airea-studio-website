# Module 05 — Branding (Design System Studio)

> Lets the team restyle the entire site — colour palette, typography including uploaded
> brand fonts, button shape, and page background — from the admin, with a live preview,
> draft → publish, contrast warnings, and no flash of the old look for visitors.

| | |
|---|---|
| **Depends on** | 00 Foundation · 01 Website Builder (the `design.tokens` key rides its content pipeline) · 02 File Storage (custom font files + font proxy) |
| **Integrates with** | 03 Asset Hub (pick uploaded fonts) · every public component (they style through tokens) |
| **Provides** | Token model · CSS-variable contract · Tailwind wiring · `applyDesign()` · `bootDesign()` · Design Studio screen |
| **Reference build** | AIREA Studio — `src/lib/design.ts`, `src/admin/pages/Design.tsx`, `tailwind.config.js`, `src/index.css` |

---

## 1. What it does

| The team can… | Detail |
|---|---|
| Change the accent colour | Pick one colour (or a preset); the full shade family is derived automatically |
| Edit the full palette | Backgrounds, surfaces, three text levels, borders — each individually |
| Change typography | Display, body, and mono fonts from a curated Google Fonts list |
| Use their own brand fonts | Upload `.woff2/.woff/.ttf/.otf`; they appear in the pickers |
| Change button shape | Pill · rounded · square — sitewide |
| Change the page background | Default · solid colour · gradient (two colours + angle) |
| See it live | A preview of the real site restyles as they edit, desktop and mobile |
| Get warned | Contrast checks flag unreadable combinations before publishing |
| Publish or revert | Publish to go live; reset to the house look any time |

---

## 2. How it works

```
Design Studio ──edit──► tokens JSON ──write draft──► content_blocks["design.tokens"]
                                                        │
      preview iframe (?preview=1) ◄── reads draft ──────┤
      public site                 ◄── reads published ──┘
                                                        │
                                   normalizeDesign(json)│  ← validates every field
                                                        ▼
                                   applyDesign(tokens)  →  document.documentElement.style
                                                             --accent: #0e8345
                                                             --c-accent: 14 131 69    ← RGB triplet
                                                             --font-display: "Fraunces"
                                                             --btn-radius: 14px
                                                        ▼
                         Tailwind classes resolve through the variables:
                         bg-accent  →  rgb(var(--c-accent) / <alpha-value>)
                         so bg-accent/10, text-accent, border-accent-mist … all restyle at once
```

**The whole trick:** components never contain a colour or font value. They use token
classes. Rewriting a handful of CSS variables at runtime restyles every component on the
site — no rebuild, no redeploy.

---

## 3. The CSS-variable contract

### 3.1 Two forms of every colour

| Form | Example | Why |
|---|---|---|
| Hex — `--accent` | `#0047ff` | Plain CSS, inline styles, gradients, canvas/WebGL code |
| RGB triplet — `--c-accent` | `0 71 255` | Tailwind opacity modifiers: `rgb(var(--c-accent) / 0.4)` needs raw channels |

**Both must always be set together.** A hex-only variable breaks every `/opacity` utility.

### 3.2 Token names — productized

The reference build named its accent family after its brand colour (`blue`, `blue-ink`, …).
The productized kit uses neutral names so no brand ends up with a class called `bg-blue`
that renders green.

| Token | CSS vars | Tailwind | Role |
|---|---|---|---|
| canvas | `--canvas` `--c-canvas` | `bg-canvas` | Page background |
| paper | `--paper` `--c-paper` | `bg-paper` | Alternate section background |
| card | `--card` `--c-card` | `bg-card` | Cards, panels |
| ink | `--ink` `--c-ink` | `text-ink` | Primary text |
| ink2 | `--ink-2` `--c-ink-2` | `text-ink-2` | Secondary text |
| ink3 | `--ink-3` `--c-ink-3` | `text-ink-3` | Muted text, captions |
| accent | `--accent` `--c-accent` | `bg-accent` | Brand colour, primary buttons |
| accentInk | `--accent-ink` `--c-accent-ink` | `bg-accent-ink` | Hover/pressed, text on light accent |
| accentBright | `--accent-bright` `--c-accent-bright` | `text-accent-bright` | Highlights |
| accentSky | `--accent-sky` `--c-accent-sky` | `bg-accent-sky` | Soft fills, gradients |
| accentMist | `--accent-mist` `--c-accent-mist` | `bg-accent-mist` | Tinted backgrounds, chips |
| line | `--line` `--c-line` | `border-line` | Borders |
| line2 | `--line-2` `--c-line-2` | `border-line-2` | Stronger borders |
| — | `--font-display` | `font-display` | Headlines |
| — | `--font-body` | `font-sans` | Paragraphs, UI |
| — | `--font-mono` | `font-mono` | Labels, eyebrows |
| — | `--btn-radius` | `[border-radius:var(--btn-radius)]` | Button shape |

### 3.3 `src/index.css` — the house look

```css
:root {
  /* Hex forms */
  --canvas: #fafafa;  --paper: #f3f2ef;  --card: #ffffff;
  --ink: #1a1a1a;     --ink-2: #55514b;  --ink-3: #8a867f;
  --accent: #0047ff;  --accent-ink: #0036c4;  --accent-bright: #2e6bff;
  --accent-sky: #5b9bff;  --accent-mist: #e8eeff;
  --line: #e6e4df;    --line-2: #d9d6cf;

  /* RGB triplets — keep in sync with the hex forms above.
     The Design Studio overrides BOTH sets at runtime. */
  --c-canvas: 250 250 250;  --c-paper: 243 242 239;  --c-card: 255 255 255;
  --c-ink: 26 26 26;        --c-ink-2: 85 81 75;     --c-ink-3: 138 134 127;
  --c-accent: 0 71 255;     --c-accent-ink: 0 54 196;  --c-accent-bright: 46 107 255;
  --c-accent-sky: 91 155 255;  --c-accent-mist: 232 238 255;
  --c-line: 230 228 223;    --c-line-2: 217 214 207;

  --font-display: "Instrument Serif";
  --font-body: "Inter";
  --font-mono: "JetBrains Mono";
  --btn-radius: 9999px;
}
body { background: var(--canvas); color: var(--ink); font-family: var(--font-body), system-ui, sans-serif; }
```

🔁 **These values are the brand's house look** — and must equal `DESIGN_DEFAULTS` (§5) exactly.

### 3.4 `tailwind.config.js`

```js
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: c("canvas"), paper: c("paper"), card: c("card"),
        ink:    { DEFAULT: c("ink"), 2: c("ink-2"), 3: c("ink-3") },
        accent: { DEFAULT: c("accent"), ink: c("accent-ink"), bright: c("accent-bright"), sky: c("accent-sky"), mist: c("accent-mist") },
        line:   { DEFAULT: c("line"), 2: c("line-2") },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans:    ["var(--font-body)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono:    ["var(--font-mono)", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
    },
  },
};
```

Fallback stacks live **here**, not in the variable, so a failed custom font degrades
gracefully to a sensible system font.

---

## 4. Data

No new table. The design is one content block in Module 01's pipeline:

| key | type | draft_value / published_value |
|---|---|---|
| `design.tokens` | `json` | the `DesignTokens` document (§5.1), serialized |

It inherits draft → publish, the Publish Center ("Site design updated"), `publish_log`,
and preview-reads-draft for free. **No row = the house look.**

Installing Branding without Module 01? Create a one-row table `design_settings(id int
primary key default 1, draft jsonb, published jsonb)` with a public-read view on
`published` — same shape, same flow.

---

## 5. The design engine — reference implementation

### 5.1 Types, defaults, catalogs

```ts
// src/lib/design.ts
export type FontChoice = {
  label: string;
  family: string;          // CSS family name
  g: string | null;        // Google Fonts css2 `family=` param; null = already loaded by index.html
  kind: "display" | "body" | "mono";
};

// 🔁 BRAND: mark the house fonts; curate 6–10 per role. Too many choices = worse sites.
export const FONT_CHOICES: Record<string, FontChoice> = {
  instrument: { label: "Instrument Serif — house display", family: "Instrument Serif", g: null, kind: "display" },
  playfair:   { label: "Playfair Display", family: "Playfair Display", g: "Playfair+Display:ital,wght@0,400;0,500;1,400", kind: "display" },
  fraunces:   { label: "Fraunces", family: "Fraunces", g: "Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400", kind: "display" },
  dmserif:    { label: "DM Serif Display", family: "DM Serif Display", g: "DM+Serif+Display:ital@0;1", kind: "display" },
  cormorant:  { label: "Cormorant Garamond", family: "Cormorant Garamond", g: "Cormorant+Garamond:ital,wght@0,400;0,500;1,400", kind: "display" },
  bodoni:     { label: "Bodoni Moda", family: "Bodoni Moda", g: "Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400", kind: "display" },
  inter:      { label: "Inter — house body", family: "Inter", g: null, kind: "body" },
  manrope:    { label: "Manrope", family: "Manrope", g: "Manrope:wght@400;500;600;700;800", kind: "body" },
  jakarta:    { label: "Plus Jakarta Sans", family: "Plus Jakarta Sans", g: "Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400", kind: "body" },
  worksans:   { label: "Work Sans", family: "Work Sans", g: "Work+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400", kind: "body" },
  sora:       { label: "Sora", family: "Sora", g: "Sora:wght@400;500;600;700", kind: "body" },
  plexsans:   { label: "IBM Plex Sans", family: "IBM Plex Sans", g: "IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400", kind: "body" },
  jetbrains:  { label: "JetBrains Mono — house mono", family: "JetBrains Mono", g: null, kind: "mono" },
  plexmono:   { label: "IBM Plex Mono", family: "IBM Plex Mono", g: "IBM+Plex+Mono:wght@400;500;700", kind: "mono" },
  spacemono:  { label: "Space Mono", family: "Space Mono", g: "Space+Mono:wght@400;700", kind: "mono" },
};

export type CustomFont = { id: string; label: string; url: string; format: "woff2" | "woff" | "opentype" | "truetype" };

export type DesignColors = {
  canvas: string; paper: string; card: string;
  ink: string; ink2: string; ink3: string;
  accent: string; accentInk: string; accentBright: string; accentSky: string; accentMist: string;
  line: string; line2: string;
};

export type DesignTokens = {
  fonts: { display: string; body: string; mono: string; customs: CustomFont[] };   // ids, or "custom:<id>"
  colors: DesignColors;
  shape: { button: "pill" | "rounded" | "square" };
  background: { type: "default" | "solid" | "gradient"; solid?: string; from?: string; to?: string; angle?: number };
};

// 🔁 BRAND: the house look. MUST equal the :root values in index.css.
export const DESIGN_DEFAULTS: DesignTokens = {
  fonts: { display: "instrument", body: "inter", mono: "jetbrains", customs: [] },
  colors: {
    canvas: "#fafafa", paper: "#f3f2ef", card: "#ffffff",
    ink: "#1a1a1a", ink2: "#55514b", ink3: "#8a867f",
    accent: "#0047ff", accentInk: "#0036c4", accentBright: "#2e6bff", accentSky: "#5b9bff", accentMist: "#e8eeff",
    line: "#e6e4df", line2: "#d9d6cf",
  },
  shape: { button: "pill" },
  background: { type: "default" },
};

// 🔁 BRAND: one-click accents. First = the house colour.
export const ACCENT_PRESETS = [
  { name: "House", hex: "#0047ff", house: true },
  { name: "Emerald", hex: "#0e8345" },
  { name: "Crimson", hex: "#d9163c" },
  { name: "Royal Violet", hex: "#6431f5" },
  { name: "Amber", hex: "#e07c00" },
  { name: "Ink", hex: "#1f2937" },
];
```

### 5.2 Colour math — derive a family from one colour

```ts
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = ([r, g, b]: [number, number, number]) =>
  `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
const triplet = (hex: string, fallback: string) => (hexToRgb(hex) ?? hexToRgb(fallback)!).join(" ");

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb([h, s, l]: [number, number, number]): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t: number) => { if (t < 0) t += 1; if (t > 1) t -= 1;
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** "Pick one colour, get a coherent palette." Same hue, tuned saturation/lightness. */
export function deriveAccentFamily(baseHex: string): Pick<DesignColors, "accent" | "accentInk" | "accentBright" | "accentSky" | "accentMist"> {
  const rgb = hexToRgb(baseHex) ?? hexToRgb(DESIGN_DEFAULTS.colors.accent)!;
  const [h, s, l] = rgbToHsl(rgb);
  return {
    accent:       rgbToHex(rgb),
    accentInk:    rgbToHex(hslToRgb([h, Math.min(1, s * 1.05), Math.max(0.12, l * 0.72)])),   // darker, for hover
    accentBright: rgbToHex(hslToRgb([h, s, Math.min(0.72, l * 1.18)])),
    accentSky:    rgbToHex(hslToRgb([h, Math.max(0.35, s * 0.92), Math.min(0.8, l * 1.42)])),
    accentMist:   rgbToHex(hslToRgb([h, Math.min(1, s * 0.95), 0.955])),                      // near-white tint
  };
}

/** WCAG 2.x contrast ratio. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const rgb = hexToRgb(hex); if (!rgb) return 1;
    const [r, g, bl] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
```

### 5.3 Normalize — never trust the stored JSON

The document is edited by humans and by an AI agent. Every field is validated with a
fallback, so one bad value degrades that value — never the whole site.

```ts
export function normalizeDesign(raw: unknown): DesignTokens | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as any, def = DESIGN_DEFAULTS;
  const str = (v: unknown, fb: string) => (typeof v === "string" && v ? v : fb);
  const hex = (v: unknown, fb: string) => (typeof v === "string" && hexToRgb(v) ? v : fb);

  const customs: CustomFont[] = Array.isArray(d?.fonts?.customs)
    ? d.fonts.customs.filter((f: any) => f && typeof f.url === "string" && typeof f.label === "string")
        .map((f: any) => ({ id: str(f.id, Math.random().toString(36).slice(2, 8)), label: f.label, url: f.url, format: str(f.format, "woff2") }))
    : [];

  // A font id must exist for its role — or be a custom font that's actually uploaded.
  const fontId = (v: unknown, kind: FontChoice["kind"], fb: string) => {
    const id = str(v, fb);
    if (FONT_CHOICES[id]?.kind === kind) return id;
    if (id.startsWith("custom:") && customs.some((f) => `custom:${f.id}` === id)) return id;
    return fb;
  };

  return {
    fonts: {
      display: fontId(d?.fonts?.display, "display", def.fonts.display),
      body: fontId(d?.fonts?.body, "body", def.fonts.body),
      mono: fontId(d?.fonts?.mono, "mono", def.fonts.mono),
      customs,
    },
    colors: Object.fromEntries((Object.keys(def.colors) as (keyof DesignColors)[]).map((k) => [k, hex(d?.colors?.[k], def.colors[k])])) as DesignColors,
    shape: { button: ["pill", "rounded", "square"].includes(d?.shape?.button) ? d.shape.button : "pill" },
    background: {
      type: ["default", "solid", "gradient"].includes(d?.background?.type) ? d.background.type : "default",
      solid: hex(d?.background?.solid, def.colors.canvas),
      from: hex(d?.background?.from, def.colors.canvas),
      to: hex(d?.background?.to, def.colors.accentMist),
      angle: Number.isFinite(d?.background?.angle) ? Math.max(0, Math.min(360, d.background.angle)) : 160,
    },
  };
}

export function parseDesign(raw: string | undefined | null): DesignTokens | null {
  if (!raw) return null;
  try { return normalizeDesign(JSON.parse(raw)); } catch { return null; }
}
```

### 5.4 Apply at runtime

```ts
const FONT_LINK_ID = "cms-design-fonts";
const FACE_STYLE_ID = "cms-design-faces";
const BG_STYLE_ID = "cms-design-bg";
const CACHE_KEY = "cms-design-cache-v1";

const COLOR_VARS: [keyof DesignColors, string][] = [
  ["canvas", "canvas"], ["paper", "paper"], ["card", "card"],
  ["ink", "ink"], ["ink2", "ink-2"], ["ink3", "ink-3"],
  ["accent", "accent"], ["accentInk", "accent-ink"], ["accentBright", "accent-bright"], ["accentSky", "accent-sky"], ["accentMist", "accent-mist"],
  ["line", "line"], ["line2", "line-2"],
];

/** Uploaded fonts go through the same-origin proxy (Module 02 §8) so @font-face isn't CORS-blocked. */
export function fontSrc(url: string): string {
  const m = url.match(/\/assets\/fonts\/([^?#]+)/);
  return m ? `/brandfonts/${m[1]}` : url;
}

function familyOf(id: string, customs: CustomFont[], fallback: string): string {
  if (id.startsWith("custom:")) return customs.find((f) => `custom:${f.id}` === id)?.label ?? fallback;
  return FONT_CHOICES[id]?.family ?? fallback;
}

export function applyDesign(tokens: DesignTokens | null, opts: { cache?: boolean } = {}) {
  const root = document.documentElement;
  const remove = (id: string) => document.getElementById(id)?.remove();

  // House look: REMOVE every override so the stylesheet's :root wins again.
  if (!tokens || JSON.stringify(tokens) === JSON.stringify(DESIGN_DEFAULTS)) {
    root.removeAttribute("data-cms-design");
    for (const [, v] of COLOR_VARS) { root.style.removeProperty(`--${v}`); root.style.removeProperty(`--c-${v}`); }
    ["--font-display", "--font-body", "--font-mono", "--btn-radius"].forEach((p) => root.style.removeProperty(p));
    remove(FONT_LINK_ID); remove(FACE_STYLE_ID); remove(BG_STYLE_ID);
    if (opts.cache) try { localStorage.removeItem(CACHE_KEY); } catch { /* storage blocked */ }
    dispatchEvent(new Event("cms-design-applied"));
    return;
  }

  const { fonts, colors, shape, background } = tokens;
  const def = DESIGN_DEFAULTS.colors;

  // Colours — BOTH forms, always together.
  for (const [k, v] of COLOR_VARS) {
    root.style.setProperty(`--${v}`, colors[k]);
    root.style.setProperty(`--c-${v}`, triplet(colors[k], def[k]));
  }

  // Curated fonts: one deduplicated Google Fonts stylesheet.
  const g = [...new Set([fonts.display, fonts.body, fonts.mono].map((id) => FONT_CHOICES[id]?.g).filter(Boolean) as string[])];
  if (g.length) {
    let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.id = FONT_LINK_ID; link.rel = "stylesheet"; document.head.appendChild(link); }
    const href = `https://fonts.googleapis.com/css2?${g.map((x) => `family=${x}`).join("&")}&display=swap`;
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);   // don't refetch unchanged
  } else remove(FONT_LINK_ID);

  // Uploaded fonts: @font-face for the ones actually in use.
  const used = fonts.customs.filter((f) => [fonts.display, fonts.body, fonts.mono].includes(`custom:${f.id}`));
  if (used.length) {
    let style = document.getElementById(FACE_STYLE_ID) as HTMLStyleElement | null;
    if (!style) { style = document.createElement("style"); style.id = FACE_STYLE_ID; document.head.appendChild(style); }
    style.textContent = used.map((f) =>
      `@font-face{font-family:"${f.label.replace(/"/g, "")}";src:url("${fontSrc(f.url)}") format("${f.format}");font-display:swap;font-weight:100 900;}`
    ).join("\n");
  } else remove(FACE_STYLE_ID);

  root.style.setProperty("--font-display", `"${familyOf(fonts.display, fonts.customs, "Georgia")}"`);
  root.style.setProperty("--font-body", `"${familyOf(fonts.body, fonts.customs, "system-ui")}"`);
  root.style.setProperty("--font-mono", `"${familyOf(fonts.mono, fonts.customs, "ui-monospace")}"`);

  root.style.setProperty("--btn-radius", shape.button === "pill" ? "9999px" : shape.button === "rounded" ? "14px" : "6px");

  if (background.type === "gradient") {
    let style = document.getElementById(BG_STYLE_ID) as HTMLStyleElement | null;
    if (!style) { style = document.createElement("style"); style.id = BG_STYLE_ID; document.head.appendChild(style); }
    style.textContent = `body{background:linear-gradient(${background.angle ?? 160}deg, ${background.from}, ${background.to}) fixed;}`;
  } else if (background.type === "solid" && background.solid) {
    root.style.setProperty("--canvas", background.solid);
    root.style.setProperty("--c-canvas", triplet(background.solid, def.canvas));
    remove(BG_STYLE_ID);
  } else remove(BG_STYLE_ID);

  root.setAttribute("data-cms-design", "1");
  if (opts.cache) try { localStorage.setItem(CACHE_KEY, JSON.stringify(tokens)); } catch { /* storage blocked */ }
  // Canvas / WebGL / chart code that reads colours listens for this and re-reads.
  dispatchEvent(new Event("cms-design-applied"));
}
```

### 5.5 No flash of the house look — `bootDesign()`

The content fetch takes a few hundred milliseconds. Without this, every visitor to a
restyled site sees the *house* colours first, then a jump.

```ts
/** Apply the last-published design from localStorage BEFORE first paint. */
export function bootDesign() {
  if (typeof window === "undefined") return;
  if (location.pathname.startsWith("/admin")) return;      // admin chrome stays on the house look
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const tokens = normalizeDesign(JSON.parse(raw));
    if (tokens) applyDesign(tokens);
  } catch { /* ignore */ }
}

/** Entering the admin in the same tab: strip the site's design off the admin UI. */
export const clearDesign = () => applyDesign(null, { cache: false });
```

```tsx
// src/main.tsx — ORDER MATTERS
bootDesign();          // 1. cached design, synchronously, before React renders anything
initTracking();        // 2. (other boot work)
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
```

The content provider then applies the fresh published tokens with `{ cache: true }`,
updating the cache for the next visit. **Preview never writes the cache** (`cache: !preview`)
— otherwise an admin's unpublished experiment becomes their own "published" look.

A first-ever visitor has no cache and sees one flash. To remove even that, inline the
published tokens into `index.html` at build time, or have the edge middleware inject a
`<style>:root{…}</style>` block into the shell for all requests.

---

## 6. Design Studio (admin)

### 6.1 Layout

```
┌───────────────────────────────┬──────────────────────────────────────┐
│ Design         ● Unpublished  │  [Desktop | Mobile]                   │
│ [Reset to house] [Publish]    │                                       │
│                               │   <iframe  /?preview=1>               │
│ ACCENT                        │   the real homepage, restyling        │
│ ● ● ● ● ● ●  [#0e8345]        │   live as controls change             │
│                               │                                       │
│ PALETTE  (advanced ▾)         │                                       │
│ Canvas  ■ #fafafa             │                                       │
│ Text    ■ #1a1a1a  ⚠ 3.9:1    │                                       │
│ …                             │                                       │
│                               │                                       │
│ TYPOGRAPHY                    │                                       │
│ Display [Fraunces        ▾]   │                                       │
│ Body    [Manrope         ▾]   │                                       │
│ Mono    [JetBrains Mono  ▾]   │                                       │
│ [⬆ Upload brand font]         │                                       │
│                               │                                       │
│ BUTTONS   (pill)(rounded)(sq) │                                       │
│ BACKGROUND (default)(solid)(gradient)  from ■ to ■ angle ◠160°         │
└───────────────────────────────┴──────────────────────────────────────┘
```

### 6.2 Controls → token changes

| Control | Writes |
|---|---|
| Accent preset or colour picker | `colors.accent*` via `deriveAccentFamily(hex)` |
| Individual palette swatch | That one colour |
| Font picker | `fonts.display/body/mono` = a catalog id or `custom:<id>` |
| Upload brand font | Upload to the `fonts` folder (Module 02) → append `{ id, label, url, format }` to `fonts.customs` → select it |
| Button shape | `shape.button` |
| Background | `background.type` + `solid` / `from` / `to` / `angle` |

**Font pickers render each option in its own typeface** — load one combined Google Fonts
stylesheet with every curated family for the Studio page only, so the dropdown shows true
samples.

Font format from extension: `woff2 → woff2`, `woff → woff`, `otf → opentype`, else `truetype`.
The family name registered in `@font-face` is the **label** the team types (quotes stripped).

### 6.3 Save, preview, publish

```ts
const KEY = "design.tokens";

// Every change: write the draft (create the row on first write), then refresh the preview.
const apply = async (next: DesignTokens) => {
  setData(next);
  const json = JSON.stringify(next);
  if (rowExists) await supabase.from("content_blocks").update({ draft_value: json, updated_by: email }).eq("key", KEY);
  else { await supabase.from("content_blocks").insert({ key: KEY, page: "global", section: "Design", label: "Design tokens", type: "json", draft_value: json, published_value: null }); setRowExists(true); }
  iframe.contentWindow?.postMessage({ type: "cms-refresh-content" }, "*");   // preview re-applies the draft
};

const dirty = rowExists ? draftJson !== publishedJson : !isHouse(data);

const publish = async () => {
  const json = JSON.stringify(data);
  const { error } = await supabase.from("content_blocks").update({ draft_value: json, published_value: json, updated_by: email }).eq("key", KEY);
  if (error) return setError(`Couldn't publish the design (your draft is safe): ${error.message}`);
  await supabase.from("publish_log").insert({ summary: "Published site design", changed_keys: [KEY], published_by: email });
  toast("Design published — live on the site.");
};

const resetHouse = () => apply(DESIGN_DEFAULTS);   // then publish to make it live
```

Debounce colour-picker drags (≈250 ms) — a picker fires dozens of events per second.

### 6.4 Contrast warnings

| Pair | Minimum (WCAG AA) | Where it matters |
|---|---|---|
| `ink` on `canvas` | 4.5 : 1 | All body text |
| `#fff` on `accent` | 4.5 : 1 | Primary button labels |
| `ink2` on `canvas` *(add)* | 4.5 : 1 | Secondary text |
| `ink3` on `canvas` *(add)* | 3 : 1 | Captions — large/muted text only |

Show the ratio next to the swatch with a warning icon below the threshold. **Warn, don't
block** — the team may be mid-edit — but show the warning again in the publish confirmation.

### 6.5 The admin is never restyled

The admin shell never applies site tokens (`bootDesign` skips `/admin`; entering the admin
from the site calls `clearDesign()`). Only the preview iframe shows the new look. An admin
that turns illegible when someone picks a bad palette can't be used to fix the palette.

---

## 7. Rules for components (share with every developer and the AI agent)

- **Never hard-code a colour or font** in a component. Use token classes (`bg-accent`,
  `text-ink-2`, `border-line`, `font-display`). The only exception is a colour that must
  never change with the brand (e.g. a status red), which gets its own fixed token.
- Buttons use `[border-radius:var(--btn-radius)]` so button shape follows the setting.
- Code that reads colours in JavaScript (WebGL, canvas, charts) reads
  `getComputedStyle(document.documentElement).getPropertyValue("--accent")` and re-reads
  on the `cms-design-applied` event.
- Inline SVG illustrations use `currentColor` or token variables, never baked hex, if they
  should follow the brand colour.

Put these in the AI agent's system prompt (Module 01 §15.6) verbatim.

---

## 8. Security

- `design.tokens` is written by admins only (content RLS); read publicly via `published_content`.
- Every value is validated by `normalizeDesign` before touching the DOM: colours must be
  6-digit hex, fonts must be catalog ids or uploaded customs, angles are clamped. A
  crafted token document cannot inject arbitrary CSS.
- Custom font labels are stripped of `"` before being written into `@font-face`.
- Font files are served same-origin through the proxy, from your own storage only.

---

## 9. Nuances & hard-won lessons

1. **Set hex and triplet together**, every time. Triplets are what make `/opacity` utilities work.
2. **`index.css :root` and `DESIGN_DEFAULTS` must match exactly** — the "house look" path
   removes overrides and relies on the stylesheet.
3. **Boot from cache before React renders**, or every visit flashes the house look.
4. **Preview must not write the cache.**
5. **The admin stays on the house look.**
6. **Normalize everything** — the document is edited by people and by an AI agent.
7. **Custom fonts need a same-origin proxy** when storage ignores CORS (Module 02 §8).
   Symptom when missing: the font silently falls back and nobody knows why.
8. **Fallback stacks belong in Tailwind, not the variable** — a failed custom font should
   fall back to a close system font.
9. **Don't re-set an unchanged Google Fonts `href`** — it refetches and flickers.
10. **Emit an event after applying** so non-CSS consumers (WebGL, canvas) can re-read colours.
11. **Neutral token names** (`accent`, not the brand's colour name).
12. **Attach the preview's `ResizeObserver` after the loading gate** — see Module 01 §12.4;
    the reference Design Studio preview collapsed to 0px until this was fixed.

---

## 10. Productization upgrades

| Upgrade | Why | Sketch |
|---|---|---|
| **Logo & favicon management** | Rebrands change logos too | `brand.logo`, `brand.favicon` token fields picked from the Asset Hub; `<Logo>` reads them |
| **Dark mode** | Many brands want it | A second `colors` set; `@media (prefers-color-scheme: dark)` swaps variables |
| **Type scale** | Headline size is a brand decision | `type.scale` (e.g. 1.2 / 1.25 / 1.333) driving `clamp()` sizes via variables |
| **Section themes** | "This section on ink, that one on accent" | A per-section `theme` in `LayoutEntry` mapping to a class that re-scopes variables |
| **Critical-CSS injection** | Remove the first-visit flash | Edge middleware injects `:root{…}` from published tokens into every shell |
| **Export tokens** | Keep app, emails, decks on brand | `GET /api/design/tokens.css` and `.json` from published tokens |
| **Brand-kit import** | Faster onboarding | Paste a site URL → extract dominant colours and fonts as a starting draft |
| **Design history** | Undo a publish | Falls out of Module 01's content version history upgrade |

---

## 11. Acceptance tests

- [ ] With no `design.tokens` row, the site renders the house look and no `data-cms-design` attribute is set.
- [ ] Picking an accent preset restyles buttons, links, and tinted backgrounds in the preview within a second.
- [ ] `bg-accent/10` renders a 10% tint of the **new** accent (proves triplets are set).
- [ ] The public site is unchanged until Publish; after Publish it shows the new design.
- [ ] Reloading the public site after publish shows **no** flash of the house colours.
- [ ] Opening the admin shows the house look even when the site is restyled.
- [ ] Previewing a draft, then visiting the public site, shows the **published** design (preview didn't write the cache).
- [ ] Choosing a curated font loads it from Google Fonts once; changing another setting doesn't refetch it.
- [ ] An uploaded `.woff2` renders in the preview; DevTools shows it served from `/brandfonts/…` with status 200.
- [ ] Button shape square/rounded/pill changes every primary button.
- [ ] Gradient background renders at the chosen angle.
- [ ] Setting text to `#999999` on `#ffffff` shows a contrast warning (2.8:1).
- [ ] A hand-corrupted token document (`accent: "red"`, unknown font id) renders with those values falling back to defaults — the rest applies.
- [ ] Reset to house look + Publish returns the public site to the house look.

---

## 12. Build plan

1. Rename/define tokens in `index.css :root` (both forms) and wire `tailwind.config.js` (§3).
2. Sweep components: replace every hard-coded colour and font with token classes (§7).
3. Build `src/lib/design.ts`: types, defaults, catalogs, colour math, normalize, apply,
   boot, clear (§5).
4. Call `bootDesign()` first in `main.tsx`; apply tokens from the content provider (Module 01 §6.1).
5. Build the Design Studio: accent + presets, palette, fonts, shape, background, live
   preview, contrast warnings, dirty state, publish, reset (§6).
6. Custom fonts: upload via Module 02 into `fonts/`, proxy rewrite, `@font-face` injection.
7. Keep the admin on the house look (§6.5).
8. Add §7 rules to the AI agent's prompt.
9. Run §11.
