// Tag manager runtime. Loads the ENABLED tracking tags (public
// `active_tracking_tags` view — managed in the admin's Tracking page) and
// injects each provider's official snippet, then reports SPA page-views on
// every route change. No redeploy needed: toggling a tag in the admin is live
// on the next page load.
//
// Never runs on /admin, in draft previews / the edit canvas, or on localhost
// (add ?tracktest=1 to test locally).

type ActiveTag = {
  id: string;
  provider: string;
  config: { id?: string; [k: string]: unknown } | null;
  custom_head: string | null;
  custom_body: string | null;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: { page: () => void; [k: string]: unknown };
    pintrk?: (...args: unknown[]) => void;
    snaptr?: (...args: unknown[]) => void;
    twq?: (...args: unknown[]) => void;
    _linkedin_partner_id?: string;
    _linkedin_data_partner_ids?: string[];
  }
}

const loaded = new Set<string>();
let gtagReady = false;
const gtagConfigs: string[] = [];

function script(src: string, async = true): HTMLScriptElement {
  const s = document.createElement("script");
  s.src = src;
  s.async = async;
  document.head.appendChild(s);
  return s;
}

function inline(code: string, target: HTMLElement = document.head): HTMLScriptElement {
  const s = document.createElement("script");
  s.text = code;
  target.appendChild(s);
  return s;
}

// Raw HTML (custom tags): scripts added via innerHTML never execute, so every
// node is re-created — script elements get fresh clones with attrs + text.
function injectHtml(html: string, target: HTMLElement) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  for (const node of Array.from(tpl.content.childNodes)) {
    if (node.nodeName === "SCRIPT") {
      const old = node as HTMLScriptElement;
      const s = document.createElement("script");
      for (const a of Array.from(old.attributes)) s.setAttribute(a.name, a.value);
      s.text = old.text;
      target.appendChild(s);
    } else {
      target.appendChild(node.cloneNode(true));
    }
  }
}

function ensureGtag() {
  if (gtagReady) return;
  gtagReady = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
}

const INJECTORS: Record<string, (id: string) => void> = {
  ga4(id) {
    ensureGtag();
    script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
    window.gtag!("config", id);
    gtagConfigs.push(id);
  },
  "google-ads"(id) {
    ensureGtag();
    script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
    window.gtag!("config", id);
    gtagConfigs.push(id);
  },
  gtm(id) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    script(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`);
    const ns = document.createElement("noscript");
    const ifr = document.createElement("iframe");
    ifr.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`;
    ifr.height = "0";
    ifr.width = "0";
    ifr.style.display = "none";
    ifr.style.visibility = "hidden";
    ns.appendChild(ifr);
    document.body.appendChild(ns);
  },
  meta(id) {
    inline(`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id.replace(/[^0-9]/g, "")}');fbq('track','PageView');`);
  },
  tiktok(id) {
    inline(`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${id.replace(/'/g, "")}');ttq.page();}(window,document,'ttq');`);
  },
  linkedin(id) {
    const pid = id.replace(/[^0-9]/g, "");
    window._linkedin_partner_id = pid;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(pid);
    inline(`(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s)})(window.lintrk);`);
  },
  pinterest(id) {
    inline(`!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");pintrk('load','${id.replace(/'/g, "")}');pintrk('page');`);
  },
  snap(id) {
    inline(`(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init','${id.replace(/'/g, "")}');snaptr('track','PAGE_VIEW');`);
  },
  clarity(id) {
    inline(`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id.replace(/"/g, "")}");`);
  },
  hotjar(id) {
    inline(`(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:${Number(id.replace(/[^0-9]/g, "")) || 0},hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r);})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`);
  },
  x(id) {
    inline(`!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');twq('config','${id.replace(/'/g, "")}');`);
  },
};

function firePageView() {
  const path = window.location.pathname + window.location.search;
  try {
    for (const id of gtagConfigs) window.gtag?.("config", id, { page_path: path });
    window.fbq?.("track", "PageView");
    window.ttq?.page?.();
    window.pintrk?.("page");
    window.snaptr?.("track", "PAGE_VIEW");
  } catch {
    /* a tag's failure must never break navigation */
  }
}

function watchSpaNavigation() {
  let last = window.location.pathname;
  const onNav = () => {
    if (window.location.pathname === last) return;
    last = window.location.pathname;
    // Let the route render/title update first.
    window.setTimeout(firePageView, 50);
  };
  const wrap = (fn: typeof history.pushState) =>
    function (this: History, ...args: Parameters<typeof history.pushState>) {
      const r = fn.apply(this, args);
      onNav();
      return r;
    };
  history.pushState = wrap(history.pushState.bind(history));
  history.replaceState = wrap(history.replaceState.bind(history));
  window.addEventListener("popstate", onNav);
}

export async function initTracking() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (window.location.pathname.startsWith("/admin")) return;
  if (params.get("preview") === "1" || params.get("edit") === "1") return;
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (isLocal && params.get("tracktest") !== "1") return;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return;

  let tags: ActiveTag[] = [];
  try {
    const res = await fetch(`${url}/rest/v1/active_tracking_tags?select=*`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    if (!res.ok) return;
    tags = await res.json();
  } catch {
    return;
  }
  if (!Array.isArray(tags) || tags.length === 0) return;

  for (const tag of tags) {
    if (loaded.has(tag.id)) continue;
    loaded.add(tag.id);
    try {
      if (tag.provider === "custom") {
        if (tag.custom_head) injectHtml(tag.custom_head, document.head);
        if (tag.custom_body) injectHtml(tag.custom_body, document.body);
      } else {
        const id = String(tag.config?.id ?? "").trim();
        if (id) INJECTORS[tag.provider]?.(id);
      }
    } catch {
      /* one bad tag must never break the site or other tags */
    }
  }

  watchSpaNavigation();
}
