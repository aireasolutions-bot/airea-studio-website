/* Conversion events, provider-agnostic.
 *
 * The tracking runtime (src/lib/tracking.ts) injects whichever pixels the team
 * enabled in the admin and reports PageViews. This is the layer above that:
 * the handful of moments worth measuring on a marketing site. Each call fans
 * out to every pixel that happens to be loaded — Meta, GA4, TikTok, LinkedIn,
 * Pinterest — using each platform's own event name.
 *
 * If tracking is off (admin, previews, localhost, or no tags enabled) the
 * globals simply don't exist and every call is a silent no-op. Nothing here
 * can throw, and nothing blocks navigation.
 */

type Params = Record<string, unknown>;

/** Meta standard events we use. Kept small on purpose — noise hurts optimisation. */
export type ConversionEvent = "Lead" | "ViewContent" | "Contact" | "Search";

// Meta → GA4 naming.
const GA4: Record<ConversionEvent, string> = {
  Lead: "generate_lead",
  ViewContent: "view_item",
  Contact: "contact",
  Search: "search",
};

/** Shared id so a browser event and its Conversions API twin can be deduped. */
function eventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/* Guard against the same event being sent twice for one moment — React
 * StrictMode double-invokes effects, components remount, users double-click.
 * Inflated conversion counts train the ad platforms on noise, so a short
 * window collapses exact repeats. Genuinely revisiting a page later still
 * counts, because the window is only a couple of seconds. */
const recent = new Map<string, number>();
const DEDUPE_MS = 2000;

function isRepeat(key: string): boolean {
  const now = Date.now();
  for (const [k, t] of recent) if (now - t > DEDUPE_MS) recent.delete(k);
  if ((recent.get(key) ?? 0) > now - DEDUPE_MS) return true;
  recent.set(key, now);
  return false;
}

export function track(event: ConversionEvent, params: Params = {}): void {
  if (typeof window === "undefined") return;
  if (isRepeat(`${event}|${params.content_name ?? ""}|${window.location.pathname}`)) return;
  const id = eventId();
  try {
    // Meta — the 4th arg is what lets CAPI dedupe against this same event.
    window.fbq?.("track", event, params, { eventID: id });
    window.gtag?.("event", GA4[event], params);
    window.ttq?.track?.(event, params);
    window.pintrk?.("track", event.toLowerCase(), params);
  } catch {
    /* a pixel misbehaving must never break the page */
  }
}

/** Fired when someone heads off to create an account (our main conversion). */
export function trackSignupIntent(label: string, destination: string): void {
  track("Lead", {
    content_name: label,
    content_category: "signup",
    // Where on the site the click came from — lets you see which section converts.
    source_path: window.location.pathname,
    destination,
  });
}

/** High-intent page views: pricing and individual blog posts. */
export function trackContentView(name: string, category: "pricing" | "blog" | "page"): void {
  track("ViewContent", { content_name: name, content_category: category, source_path: window.location.pathname });
}
