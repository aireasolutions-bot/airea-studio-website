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

const ContentCtx = createContext<(key: string) => string>((k) => DEFAULTS[k] ?? "");

/** Read editable copy by key, falling back to the baked-in default. */
export const useC = () => useContext(ContentCtx);

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
  const preview = isPreview();

  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON) return;
    let active = true;

    const load = async () => {
      try {
        const headers: Record<string, string> = {
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${preview ? previewToken() ?? SUPABASE_ANON : SUPABASE_ANON}`,
        };
        const path = preview
          ? "content_blocks?select=key,draft_value"
          : "published_content?select=key,value";
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
        if (!res.ok || !active) return;
        const rows: Array<Record<string, unknown>> = await res.json();
        const next: Dict = {};
        for (const r of rows) {
          const v = preview ? r.draft_value : r.value;
          if (v != null) next[String(r.key)] = String(v);
        }
        if (active) setOverrides(next);
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

  const get = (key: string) => overrides[key] ?? DEFAULTS[key] ?? "";

  return (
    <ContentCtx.Provider value={get}>
      {children}
      {preview && (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-[200] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[12px] font-semibold text-white shadow-card">
          Preview · draft content
        </div>
      )}
    </ContentCtx.Provider>
  );
}
