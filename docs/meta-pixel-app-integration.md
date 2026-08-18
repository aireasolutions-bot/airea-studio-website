# Meta Pixel — `app.aireastudio.ai` integration

**For:** whoever maintains the AIREA Studio app (`aireastudio-app`)
**Effort:** ~30 minutes · one new file, two small edits
**Status:** the marketing-site half is already live — this closes the loop

---

## Why this is needed

Our Meta Pixel is live on the marketing site (`aireastudio.ai`) and correctly
reports intent — page views, pricing views, and a `Lead` event every time
someone clicks a "Start free trial" button.

But the account is actually created on **`app.aireastudio.ai`**, a separate
codebase. The marketing pixel physically cannot see that. So today we can prove
someone *clicked through to sign up*, but not whether they **completed** signup
or paid.

That gap has a direct cost: Meta can only optimise campaigns toward clicks
rather than customers, and we can't measure true cost-per-signup by channel.

Adding the same pixel to the app completes the chain:

```
ad click → PageView + Lead (aireastudio.ai) → CompleteRegistration (app) → Purchase
```

**Good news:** both hosts sit under `aireastudio.ai`, so the pixel's `_fbp`
cookie is already shared between them. Attribution links up automatically the
moment the app starts firing events — no cross-domain plumbing required.

---

## Reference

| Item | Value |
|---|---|
| Pixel / Dataset ID | `25866536333046020` |
| Dataset name | AIREA STUDIO FIGMA |
| Meta Business account | aireasolutions (`1697461320721097`) |
| Domain allow-list | `aireastudio.ai` and subdomains — **already configured** |
| Marketing-site equivalent | `src/lib/analytics.ts` in `aireastudio-site` |

---

## Step 1 — Base pixel

**File:** `index.html` — paste immediately before `</head>`.

```html
<!-- Meta Pixel — shares the _fbp cookie with aireastudio.ai, so signups
     attribute back to the marketing site that drove them. -->
<script>
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
  document,'script','https://connect.facebook.net/en_US/fbevents.js');
  fbq('init','25866536333046020');
  fbq('track','PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=25866536333046020&ev=PageView&noscript=1" /></noscript>
```

---

## Step 2 — Conversion layer

**New file:** `src/lib/pixel.ts`

```ts
/* Meta Pixel events for the app. The base pixel lives in index.html; this is
 * the conversion layer. Mirrors the marketing site's analytics.ts: same pixel
 * ID, same eventID pattern for Conversions API dedupe, same fail-open rules.
 *
 * No-ops safely if the pixel is blocked, and never throws or blocks the flow. */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

const eventId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

/** Registration is a once-per-person event — a refresh or retry must not
 *  re-count it, or the ad platforms optimise toward inflated numbers. */
function alreadyFired(key: string): boolean {
  try {
    if (localStorage.getItem(key)) return true;
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* storage blocked — worst case the event repeats, better than losing it */
  }
  return false;
}

/**
 * Fire when access is granted and the login link is on its way — that's the
 * moment a person becomes a registered user in this private beta.
 * Passing the email enables Meta's advanced matching (the pixel hashes it
 * in-browser; the raw address never leaves the device), which meaningfully
 * lifts attribution match rates.
 */
export function trackCompleteRegistration(email: string, plan = "trial"): void {
  if (typeof window === "undefined" || !window.fbq) return;
  const clean = email.trim().toLowerCase();
  if (!clean || alreadyFired(`airea_fb_reg_${clean}`)) return;
  try {
    // re-init with advanced matching now that we know who this is
    window.fbq("init", "25866536333046020", { em: clean });
    window.fbq(
      "track",
      "CompleteRegistration",
      { content_name: plan, status: "granted", currency: "USD", value: 0 },
      { eventID: eventId() }
    );
  } catch {
    /* a pixel failure must never break signup */
  }
}

/** Fire when onboarding finishes and the trial is genuinely active. */
export function trackStartTrial(email?: string): void {
  if (typeof window === "undefined" || !window.fbq) return;
  const key = `airea_fb_trial_${(email || "anon").trim().toLowerCase()}`;
  if (alreadyFired(key)) return;
  try {
    window.fbq("track", "StartTrial", { currency: "USD", value: 0, predicted_ltv: 0 }, { eventID: eventId() });
  } catch {
    /* ignore */
  }
}

/** Fire on paid conversion. `value` in dollars, e.g. 99 for Studio. */
export function trackPurchase(value: number, planName: string): void {
  if (typeof window === "undefined" || !window.fbq) return;
  try {
    window.fbq(
      "track",
      "Purchase",
      { value, currency: "USD", content_name: planName, content_type: "subscription" },
      { eventID: eventId() }
    );
  } catch {
    /* ignore */
  }
}
```

---

## Step 3 — Wire it into the signup flow

**File:** `src/signup/SignupFlow.tsx`

Add the import at the top:

```ts
import { trackCompleteRegistration, trackStartTrial } from "@/lib/pixel";
```

### 3a · Registration — in `sendLoginLink()` (~line 146)

Fire on **both** branches so no signup path is missed — the access-gate email
*and* the Supabase magic-link fallback:

```ts
  async function sendLoginLink() {
    // branded code+link via the access gate; falls back to Supabase's mailer
    const a = await requestAccess(account.email);
    if (a.mode === "sent" || a.mode === "invited") {
      trackCompleteRegistration(account.email);        // ← ADD
      setEmailTaken("link-sent");
      return;
    }
    const r = await sendMagicLink(account.email, { shouldCreateUser: false });
    if (r.ok) trackCompleteRegistration(account.email); // ← ADD
    setEmailTaken(r.ok ? "link-sent" : "taken");
  }
```

### 3b · Trial started (~line 569)

```ts
    trackStartTrial(account.email);   // ← ADD
    setStage("done");
```

### 3c · Purchase — when billing exists

`trackPurchase` is exported and ready. Call it wherever a paid subscription is
confirmed, with the real plan value:

```ts
trackPurchase(99, "Studio");
```

---

## Why these specific hook points

`sendLoginLink()` is the true registration moment in this private beta — access
has been granted and the login link is going out. `setStage("done")` is where
onboarding genuinely finishes, which is the honest place for `StartTrial`.

Firing earlier (on an email keystroke, a step change, or component mount) would
inflate counts and actively degrade Meta's optimisation.

---

## Verification

1. Deploy to `app.aireastudio.ai`.
2. Open **Events Manager → dataset `25866536333046020` → Test events**.
3. Run a real signup end to end.
4. Expect, in order:
   - `PageView` on load
   - `CompleteRegistration` after submitting the email — with the **`em`
     (email) parameter matched**, confirming advanced matching works
   - `StartTrial` when onboarding completes
5. Cross-check with the **Meta Pixel Helper** Chrome extension.

Also confirm attribution chains end to end: click a "Start free trial" button on
`aireastudio.ai`, complete signup, and check the same `_fbp` cookie value
carries across both hosts (DevTools → Application → Cookies).

---

## Guardrails — please preserve these

These aren't stylistic. Each one prevents a real data-quality problem.

- **Never fire on render or on mount.** Only on confirmed success. Effects can
  run twice (React StrictMode) and components remount.
- **Keep the `alreadyFired` guard.** Refreshes and retries must not re-count a
  registration. Inflated conversions train Meta on noise and waste budget.
- **Keep the `eventID` on every event.** If Conversions API is wired up
  server-side later, Meta uses it to deduplicate the browser and server copies
  of the same event instead of double-counting them.
- **Keep the try/catch and `!window.fbq` checks.** Ad blockers are common; a
  blocked pixel must never break signup.
- **Never put raw PII in event parameters.** Email goes only in the `em`
  advanced-matching field, which the pixel hashes in-browser.

---

## Notes

- The app's `index.html` carries `<meta name="robots" content="noindex">`. That
  is correct for a private app and does not affect the pixel. Meta domain
  verification stays on the marketing site, where it is already configured.
- The marketing site manages its pixel through the admin (**Tracking** page), so
  the ID can be changed there with no deploy. The app hardcodes it — if the
  pixel ID ever changes, update `index.html` and `src/lib/pixel.ts` together.

---

## Questions

Ping Nicolas. The marketing-site counterpart lives at
`aireastudio-site/src/lib/analytics.ts` and is a useful reference for the same
patterns.
