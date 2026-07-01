import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import blocksData from "./blocks.json";

type Block = { key: string; value: string };
type Dict = Record<string, string>;

const DEFAULTS: Dict = Object.fromEntries(
  (blocksData as Block[]).map((b) => [b.key, b.value])
);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ASSETS_BASE = (import.meta.env.VITE_ASSETS_BASE_URL || "").replace(/\/+$/, "");

/** Resolve an image content value (R2 key, /assets path, or full URL) to a usable src. */
export function resolveAsset(v?: string): string {
  if (!v) return "";
  if (/^https?:\/\//.test(v)) return v;
  const path = v.startsWith("/") ? v : `/${v}`;
  return ASSETS_BASE ? `${ASSETS_BASE}${path}` : path;
}

const ContentCtx = createContext<(key: string, fallback?: string) => string>((k, f) => DEFAULTS[k] ?? f ?? "");

/** Read editable copy by key, falling back to a provided default or the baked-in one. */
export const useC = () => useContext(ContentCtx);

export type SeoOverride = {
  title?: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
  noindex?: boolean;
  keywords?: string;
  priority?: number;
  changefreq?: string;
  jsonld?: unknown;
};

const SeoCtx = createContext<(path: string) => SeoOverride>(() => ({}));

/** Read live per-page SEO overrides (from the seo_meta table) by route path. */
export const useSeo = () => useContext(SeoCtx);

/** Spread onto an element to make it click-to-editable on the visual canvas (?edit=1). */
export const editable = (key: string, type: "text" | "richtext" | "image" = "text") => ({
  "data-edit-key": key,
  "data-edit-type": type,
});

export function isEdit() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("edit") === "1";
}

export function isPreview() {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("preview") === "1"
  );
}

// Read the logged-in admin's access token (preview only) without bundling supabase-js.
function previewToken(): string | null {
  try {
    const ref = SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1];
    const raw = ref ? localStorage.getItem(`sb-${ref}-auth-token`) : null;
    return raw ? JSON.parse(raw)?.access_token ?? null : null;
  } catch {
    return null;
  }
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<Dict>({});
  const [seoMap, setSeoMap] = useState<Record<string, SeoOverride>>({});
  const editing = isEdit();
  const preview = isPreview() || editing;

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON) return;
    let active = true;

    const load = async () => {
      const headers: Record<string, string> = {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${preview ? previewToken() ?? SUPABASE_ANON : SUPABASE_ANON}`,
      };
      const contentPath = preview
        ? "content_blocks?select=key,draft_value"
        : "published_content?select=key,value";

      // Editable copy
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${contentPath}`, { headers });
        if (res.ok && active) {
          const rows: Array<Record<string, unknown>> = await res.json();
          const next: Dict = {};
          for (const r of rows) {
            const v = preview ? r.draft_value : r.value;
            if (v != null) next[String(r.key)] = String(v);
          }
          if (active) setOverrides(next);
        }
      } catch {
        /* keep defaults */
      }

      // Per-page SEO overrides (public read; live for everyone)
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/seo_meta?select=*`, {
          headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
        });
        if (res.ok && active) {
          const rows: Array<Record<string, any>> = await res.json();
          const map: Record<string, SeoOverride> = {};
          for (const r of rows) {
            map[String(r.path)] = {
              title: r.title || undefined,
              description: r.description || undefined,
              ogImage: r.og_image || undefined,
              canonical: r.canonical || undefined,
              noindex: r.noindex ?? undefined,
              keywords: r.keywords || undefined,
              priority: r.priority ?? undefined,
              changefreq: r.changefreq || undefined,
              jsonld: r.jsonld ?? undefined,
            };
          }
          if (active) setSeoMap(map);
        }
      } catch {
        /* keep defaults */
      }
    };

    load();

    if (preview) {
      const onMsg = (e: MessageEvent) => {
        if (e.data?.type === "airea-refresh-content") load();
      };
      window.addEventListener("message", onMsg);
      return () => {
        active = false;
        window.removeEventListener("message", onMsg);
      };
    }
    return () => {
      active = false;
    };
  }, [preview]);

  // Visual click-to-edit overlay — only on the canvas (?edit=1), lazy-loaded so it
  // never weighs down the normal public bundle.
  useEffect(() => {
    if (!editing) return;
    let cleanup: (() => void) | undefined;
    import("./visualEdit")
      .then((m) => {
        cleanup = m.activate();
      })
      .catch(() => {});
    return () => cleanup?.();
  }, [editing]);

  const get = (key: string, fallback?: string) => overrides[key] ?? DEFAULTS[key] ?? fallback ?? "";

  return (
    <ContentCtx.Provider value={get}>
      <SeoCtx.Provider value={(path: string) => seoMap[path] || {}}>
        {children}
        {preview && (
          <div className="pointer-events-none fixed bottom-4 left-1/2 z-[200] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white shadow-card">
            Preview · draft content
          </div>
        )}
      </SeoCtx.Provider>
    </ContentCtx.Provider>
  );
}
