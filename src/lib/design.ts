// The site's design system as data. One `design.tokens` content block (JSON,
// draft → publish like all content) drives sitewide typography, the full color
// palette, button shape, and page background — applied at runtime as CSS
// variables (see tailwind.config.js + src/index.css). No block = house look.

export type FontChoice = {
  label: string;
  family: string; // CSS font-family value (first family only; stacks come from Tailwind)
  g: string | null; // Google Fonts css2 family param, null = already loaded in index.html
  kind: "display" | "body" | "mono";
};

export const FONT_CHOICES: Record<string, FontChoice> = {
  // display (headlines, the big serif moments)
  instrument: { label: "Instrument Serif — the house display", family: "Instrument Serif", g: null, kind: "display" },
  playfair: { label: "Playfair Display", family: "Playfair Display", g: "Playfair+Display:ital,wght@0,400;0,500;1,400", kind: "display" },
  fraunces: { label: "Fraunces", family: "Fraunces", g: "Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400", kind: "display" },
  dmserif: { label: "DM Serif Display", family: "DM Serif Display", g: "DM+Serif+Display:ital@0;1", kind: "display" },
  cormorant: { label: "Cormorant Garamond", family: "Cormorant Garamond", g: "Cormorant+Garamond:ital,wght@0,400;0,500;1,400", kind: "display" },
  librecaslon: { label: "Libre Caslon", family: "Libre Caslon Text", g: "Libre+Caslon+Text:ital,wght@0,400;0,700;1,400", kind: "display" },
  marcellus: { label: "Marcellus", family: "Marcellus", g: "Marcellus", kind: "display" },
  bodoni: { label: "Bodoni Moda", family: "Bodoni Moda", g: "Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,500;1,6..96,400", kind: "display" },
  // body (paragraphs, UI)
  inter: { label: "Inter — the house body", family: "Inter", g: null, kind: "body" },
  manrope: { label: "Manrope", family: "Manrope", g: "Manrope:wght@400;500;600;700;800", kind: "body" },
  worksans: { label: "Work Sans", family: "Work Sans", g: "Work+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400", kind: "body" },
  sora: { label: "Sora", family: "Sora", g: "Sora:wght@400;500;600;700", kind: "body" },
  spacegrotesk: { label: "Space Grotesk", family: "Space Grotesk", g: "Space+Grotesk:wght@400;500;600;700", kind: "body" },
  jakarta: { label: "Plus Jakarta Sans", family: "Plus Jakarta Sans", g: "Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400", kind: "body" },
  karla: { label: "Karla", family: "Karla", g: "Karla:ital,wght@0,400;0,500;0,600;0,700;1,400", kind: "body" },
  plexsans: { label: "IBM Plex Sans", family: "IBM Plex Sans", g: "IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400", kind: "body" },
  // mono (eyebrows, labels)
  jetbrains: { label: "JetBrains Mono — the house mono", family: "JetBrains Mono", g: null, kind: "mono" },
  plexmono: { label: "IBM Plex Mono", family: "IBM Plex Mono", g: "IBM+Plex+Mono:wght@400;500;700", kind: "mono" },
  spacemono: { label: "Space Mono", family: "Space Mono", g: "Space+Mono:wght@400;700", kind: "mono" },
  firacode: { label: "Fira Code", family: "Fira Code", g: "Fira+Code:wght@400;500;700", kind: "mono" },
};

export type CustomFont = { id: string; label: string; url: string; format: string };

export type DesignColors = {
  canvas: string; paper: string; card: string;
  ink: string; ink2: string; ink3: string;
  blue: string; blueInk: string; blueBright: string; blueSky: string; blueMist: string;
  line: string; line2: string;
};

export type DesignTokens = {
  fonts: { display: string; body: string; mono: string; customs: CustomFont[] };
  colors: DesignColors;
  shape: { button: "pill" | "rounded" | "square" };
  background: { type: "default" | "solid" | "gradient"; solid?: string; from?: string; to?: string; angle?: number };
};

export const DESIGN_DEFAULTS: DesignTokens = {
  fonts: { display: "instrument", body: "inter", mono: "jetbrains", customs: [] },
  colors: {
    canvas: "#fafafa", paper: "#f3f2ef", card: "#ffffff",
    ink: "#1a1a1a", ink2: "#55514b", ink3: "#8a867f",
    blue: "#0047ff", blueInk: "#0036c4", blueBright: "#2e6bff", blueSky: "#5b9bff", blueMist: "#e8eeff",
    line: "#e6e4df", line2: "#d9d6cf",
  },
  shape: { button: "pill" },
  background: { type: "default" },
};

/* ---------------- color math ---------------- */

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const triplet = (hex: string, fallback: string) => (hexToRgb(hex) ?? hexToRgb(fallback)!).join(" ");

export function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl([r, g, b]: [number, number, number]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
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
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

// Derive the full accent family (ink/bright/sky/mist) from one base color —
// the "pick one color, get a coherent palette" move.
export function deriveAccentFamily(baseHex: string): Pick<DesignColors, "blue" | "blueInk" | "blueBright" | "blueSky" | "blueMist"> {
  const rgb = hexToRgb(baseHex) ?? hexToRgb(DESIGN_DEFAULTS.colors.blue)!;
  const [h, s, l] = rgbToHsl(rgb);
  return {
    blue: rgbToHex(rgb),
    blueInk: rgbToHex(hslToRgb([h, Math.min(1, s * 1.05), Math.max(0.12, l * 0.72)])),
    blueBright: rgbToHex(hslToRgb([h, s, Math.min(0.72, l * 1.18)])),
    blueSky: rgbToHex(hslToRgb([h, Math.max(0.35, s * 0.92), Math.min(0.8, l * 1.42)])),
    blueMist: rgbToHex(hslToRgb([h, Math.min(1, s * 0.95), 0.955])),
  };
}

// WCAG contrast ratio between two hex colors.
export function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 1;
    const [r, g, b] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const a = lum(hexA), b = lum(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/* ---------------- parse / normalize ---------------- */

export function normalizeDesign(raw: unknown): DesignTokens | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as any;
  const def = DESIGN_DEFAULTS;
  const str = (v: unknown, fb: string) => (typeof v === "string" && v ? v : fb);
  const hex = (v: unknown, fb: string) => (typeof v === "string" && hexToRgb(v) ? v : fb);
  const customs: CustomFont[] = Array.isArray(d?.fonts?.customs)
    ? d.fonts.customs
        .filter((f: any) => f && typeof f.url === "string" && typeof f.label === "string")
        .map((f: any) => ({ id: str(f.id, Math.random().toString(36).slice(2, 8)), label: f.label, url: f.url, format: str(f.format, "woff2") }))
    : [];
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
    colors: Object.fromEntries(
      (Object.keys(def.colors) as (keyof DesignColors)[]).map((k) => [k, hex(d?.colors?.[k], def.colors[k])])
    ) as DesignColors,
    shape: { button: ["pill", "rounded", "square"].includes(d?.shape?.button) ? d.shape.button : "pill" },
    background: {
      type: ["default", "solid", "gradient"].includes(d?.background?.type) ? d.background.type : "default",
      solid: hex(d?.background?.solid, def.colors.canvas),
      from: hex(d?.background?.from, def.colors.canvas),
      to: hex(d?.background?.to, def.colors.blueMist),
      angle: Number.isFinite(d?.background?.angle) ? Math.max(0, Math.min(360, d.background.angle)) : 160,
    },
  };
}

export function parseDesign(raw: string | undefined | null): DesignTokens | null {
  if (!raw) return null;
  try {
    return normalizeDesign(JSON.parse(raw));
  } catch {
    return null;
  }
}

/* ---------------- runtime application ---------------- */

const FONT_LINK_ID = "airea-design-fonts";
const FACE_STYLE_ID = "airea-design-faces";
const BG_STYLE_ID = "airea-design-bg";
const CACHE_KEY = "airea-design-cache-v1";

/* @font-face fetches are CORS-restricted, and R2's public r2.dev URL sends no
 * access-control headers (bucket CORS policies only apply to custom domains).
 * Uploaded brand fonts are therefore loaded through a same-origin proxy path —
 * see the /brandfonts rewrite in vercel.json (and the dev proxy in
 * vite.config.ts). Anything not on that R2 path is used as-is. */
export function fontSrc(url: string): string {
  const m = url.match(/\/assets\/fonts\/([^?#]+)/);
  return m ? `/brandfonts/${m[1]}` : url;
}

function familyOf(id: string, customs: CustomFont[], fb: string): string {
  if (id.startsWith("custom:")) {
    const f = customs.find((x) => `custom:${x.id}` === id);
    return f ? f.label : fb;
  }
  return FONT_CHOICES[id]?.family ?? fb;
}

export function applyDesign(tokens: DesignTokens | null, opts: { cache?: boolean } = {}) {
  const root = document.documentElement;
  const remove = (id: string) => document.getElementById(id)?.remove();

  if (!tokens || JSON.stringify(tokens) === JSON.stringify(DESIGN_DEFAULTS)) {
    // House look: clear every override so the stylesheet defaults win again.
    root.removeAttribute("data-airea-design");
    const props = [
      "--canvas", "--paper", "--card", "--ink", "--ink-2", "--ink-3", "--blue", "--blue-ink", "--blue-bright", "--blue-sky", "--blue-mist", "--line", "--line-2",
      "--c-canvas", "--c-paper", "--c-card", "--c-ink", "--c-ink-2", "--c-ink-3", "--c-blue", "--c-blue-ink", "--c-blue-bright", "--c-blue-sky", "--c-blue-mist", "--c-line", "--c-line-2",
      "--font-serif", "--font-sans", "--font-mono", "--btn-radius",
    ];
    props.forEach((p) => root.style.removeProperty(p));
    remove(FONT_LINK_ID);
    remove(FACE_STYLE_ID);
    remove(BG_STYLE_ID);
    if (opts.cache) try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
    window.dispatchEvent(new Event("airea-design-applied"));
    return;
  }

  const { fonts, colors, shape, background } = tokens;
  const def = DESIGN_DEFAULTS.colors;

  // colors — hex + triplet forms
  const pairs: [string, string, string][] = [
    ["canvas", colors.canvas, def.canvas], ["paper", colors.paper, def.paper], ["card", colors.card, def.card],
    ["ink", colors.ink, def.ink], ["ink-2", colors.ink2, def.ink2], ["ink-3", colors.ink3, def.ink3],
    ["blue", colors.blue, def.blue], ["blue-ink", colors.blueInk, def.blueInk], ["blue-bright", colors.blueBright, def.blueBright],
    ["blue-sky", colors.blueSky, def.blueSky], ["blue-mist", colors.blueMist, def.blueMist],
    ["line", colors.line, def.line], ["line-2", colors.line2, def.line2],
  ];
  for (const [name, val, fb] of pairs) {
    root.style.setProperty(`--${name}`, val);
    root.style.setProperty(`--c-${name}`, triplet(val, fb));
  }

  // fonts — google link for curated picks, @font-face for uploads
  const gParts = [fonts.display, fonts.body, fonts.mono]
    .map((id) => FONT_CHOICES[id]?.g)
    .filter((g): g is string => !!g);
  if (gParts.length) {
    let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = FONT_LINK_ID;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    const href = `https://fonts.googleapis.com/css2?${[...new Set(gParts)].map((g) => `family=${g}`).join("&")}&display=swap`;
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
  } else {
    remove(FONT_LINK_ID);
  }

  const usedCustoms = fonts.customs.filter((f) =>
    [fonts.display, fonts.body, fonts.mono].includes(`custom:${f.id}`)
  );
  if (usedCustoms.length) {
    let style = document.getElementById(FACE_STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = FACE_STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = usedCustoms
      .map(
        (f) =>
          `@font-face{font-family:"${f.label.replace(/"/g, "")}";src:url("${fontSrc(f.url)}") format("${f.format}");font-display:swap;font-weight:100 900;}`
      )
      .join("\n");
  } else {
    remove(FACE_STYLE_ID);
  }

  root.style.setProperty("--font-serif", `"${familyOf(fonts.display, fonts.customs, "Instrument Serif")}"`);
  root.style.setProperty("--font-sans", `"${familyOf(fonts.body, fonts.customs, "Inter")}"`);
  root.style.setProperty("--font-mono", `"${familyOf(fonts.mono, fonts.customs, "JetBrains Mono")}"`);

  // shape
  root.style.setProperty("--btn-radius", shape.button === "pill" ? "9999px" : shape.button === "rounded" ? "14px" : "6px");

  // background
  if (background.type === "gradient") {
    let style = document.getElementById(BG_STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = BG_STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = `body{background:linear-gradient(${background.angle ?? 160}deg, ${background.from}, ${background.to}) fixed;}`;
  } else if (background.type === "solid" && background.solid) {
    root.style.setProperty("--canvas", background.solid);
    root.style.setProperty("--c-canvas", triplet(background.solid, def.canvas));
    remove(BG_STYLE_ID);
  } else {
    remove(BG_STYLE_ID);
  }

  root.setAttribute("data-airea-design", "1");
  if (opts.cache) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(tokens)); } catch { /* ignore */ }
  }
  window.dispatchEvent(new Event("airea-design-applied"));
}

// Apply the last-published design instantly on boot (before the Supabase fetch
// lands) so custom-branded sites don't flash the house look. Admin is exempt —
// its chrome stays on the house design.
export function bootDesign() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/admin")) return;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const tokens = normalizeDesign(JSON.parse(raw));
    if (tokens) applyDesign(tokens);
  } catch {
    /* ignore */
  }
}

// Clear any applied design (used when entering the admin in the same tab).
export function clearDesign() {
  applyDesign(null, { cache: false });
}
