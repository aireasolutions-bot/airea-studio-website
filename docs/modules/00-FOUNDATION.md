# Module 00 — Foundation

> The shared base every other module installs onto: project skeleton, brand config,
> database access control, admin authentication, the admin shell, activity logging,
> and deployment. Build this first. Every other module declares it as a dependency.

| | |
|---|---|
| **Depends on** | nothing |
| **Required by** | 01 Website Builder · 02 File Storage · 03 Asset Hub · 04 SEO · 05 Branding |
| **Provides** | `brand.config.ts` · `admin_users` + `is_admin()` · magic-link admin login · `requireAdmin()` · admin shell + nav registry · `activity_log` · deploy pipeline |
| **Reference build** | AIREA Studio (aireastudio.ai) — running in production |

---

## 1. What it provides

| Capability | Detail |
|---|---|
| Single brand config | One file holds every brand-specific value. Modules read from it; nothing brand-specific is hard-coded elsewhere. |
| Allow-list access control | Membership in `admin_users` *is* the permission. One SQL function answers "is this caller an admin?" for RLS, the server, and the client alike. |
| Three roles | `owner` · `admin` · `editor`, enforced in the database, not just the UI. |
| Passwordless admin login | Magic links delivered through a real email provider, branded. |
| Server auth gate | `requireAdmin(req)` for every serverless function, with specific, actionable failure messages. |
| Admin shell | A lazy-loaded `/admin` app with a sidebar that modules register themselves into. The public site never downloads admin code. |
| Audit trail | `activity_log` — who did what, when, from where, how long it took, whether it failed. |
| Deploy pipeline | Git push → Vercel build → status polling. Same path for humans and the AI agent. |

---

## 2. Stack

```
Frontend    React 18 · TypeScript 5 · Vite 5 · Tailwind 3.4 · react-router-dom 6 · lucide-react
Backend     Vercel serverless functions (api/**/*.ts) · Vercel Edge Middleware (middleware.ts)
Database    Supabase (Postgres + Row Level Security + Auth)
Email       Resend (auth email via Supabase custom SMTP)
Storage     Cloudflare R2 (S3-compatible) — see Module 02
AI          OpenAI function calling — see Module 01 §15, Module 04 §11
Hosting     Vercel, deployed from GitHub `main`
```

No CMS product, no state library, no component library. The whole content layer is a few
hundred lines that fit the app exactly.

**Vite SPA vs Next.js.** The reference build is a Vite SPA because its marketing site is
animation-heavy (GSAP, Lenis, WebGL) — all client-side anyway. The one real cost of an SPA
(crawlers see an empty shell) is solved by ~250 lines of edge middleware in Module 04. If a
new brand is content-first with light animation, Next.js App Router is a reasonable choice
and makes Module 04 §8 (crawler middleware) unnecessary. Every other module is framework-agnostic in design.

---

## 3. Project structure

```
brand.config.ts            ← every brand-specific value (§4)
index.html                 ← static SEO baseline (Module 04)
middleware.ts              ← crawler prerender (Module 04)
vercel.json                ← redirects, rewrites, crons — STRICT JSON, no comments
tailwind.config.js         ← token-wired colors (Module 05)
api/
  _lib/
    admin.ts               ← requireAdmin()  (§7)
    activity.ts            ← logActivity()   (§9)
    github.ts              ← commit/rollback (Module 01)
    openai.ts              ← model wrapper   (Module 01)
  upload.ts                ← Module 02
  seo/sitemap.ts           ← Module 04
src/
  main.tsx                 ← boot order: design → tracking → render
  App.tsx                  ← public routes + lazy /admin
  lib/                     ← supabase client, pages, sections, seo, design …
  content/                 ← ContentProvider, blocks.json, edit canvas (Module 01)
  components/              ← public UI
  pages/                   ← public pages
  admin/
    AdminApp.tsx           ← admin router
    AdminLayout.tsx        ← shell + sidebar (§8)
    auth.tsx               ← AdminAuthProvider, RequireAuth (§6)
    lib/                   ← shared admin utilities (upload engine, …)
    pages/                 ← one file per admin screen
```

---

## 4. Brand config — the only file a new brand must write first

Every module reads brand values from here. The reference build scattered these across
five files (`site.ts`, `seo.ts`, `pages.ts`, `blocks.json`, `tailwind.config.js`); the
productized version centralizes them.

```ts
// brand.config.ts
export const BRAND = {
  // identity
  name: "Acme",
  legalName: "Acme, Inc.",
  tagline: "The one-line promise.",
  description: "One or two sentences — reused as the default meta description.",

  // hosts
  domain: "acme.com",
  siteUrl: "https://acme.com",          // canonical host, no trailing slash
  appUrl: "https://app.acme.com",       // product app, if separate
  signUpUrl: "https://app.acme.com/sign-up",
  signInUrl: "https://app.acme.com/sign-in",
  contactEmail: "hello@acme.com",

  // locale
  locale: "en_US",
  language: "en-US",
  currency: "USD",

  // brand assets (public URLs — usually in object storage, Module 02)
  logo: { full: "", mark: "", onDark: "" },
  ogImage: "",                          // 1200×630 default social card
  favicon: "/favicon.png",

  // social profiles — feeds Organization `sameAs` (Module 04)
  social: { linkedin: "", x: "", instagram: "", youtube: "", facebook: "", tiktok: "" },

  // admin
  superAdminEmail: "you@acme.com",      // bootstrap owner; also seeded into admin_users
  adminTitle: "Acme Admin",
};

export type Brand = typeof BRAND;
```

**Rule:** if a value would differ between two brands, it lives here (or in a module's own
config file that imports from here). Grep the codebase for the brand name before launch —
it should appear only in this file and in content defaults.

**Internal protocol names are NOT branded.** The reference build prefixed internal
plumbing with the brand (`airea-edit-click`, `data-airea-section`, `airea-design-cache-v1`).
The productized kit uses the neutral prefix **`cms-`** everywhere for message types, data
attributes, CSS hooks, and storage keys. Branding internals adds risk and no value.

---

## 5. Database foundation

Run in the Supabase SQL editor before any module's SQL.

```sql
-- ─────────────────────────────────────────────────────────────
-- Access control. Membership IS the permission.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.admin_users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  role       text not null default 'editor' check (role in ('owner','admin','editor')),
  full_name  text,
  created_at timestamptz not null default now()
);
-- Emails are compared case-insensitively everywhere; enforce uniqueness the same way.
create unique index if not exists admin_users_email_lower on public.admin_users (lower(email));

-- SECURITY DEFINER: RLS policies call this without recursing into admin_users' own RLS.
-- Case-insensitive on purpose — see §11.1.
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.admin_users a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- owner/admin only (raw-HTML injection, team management, destructive ops)
create or replace function public.is_admin_manager() returns boolean
  language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.admin_users a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and a.role in ('owner','admin')
  );
$$;

grant execute on function public.is_admin(), public.is_admin_manager() to anon, authenticated;

alter table public.admin_users enable row level security;
create policy p_admin_users_read  on public.admin_users for select using (is_admin());
create policy p_admin_users_write on public.admin_users for all
  using (is_admin_manager()) with check (is_admin_manager());

-- ─────────────────────────────────────────────────────────────
-- Shared trigger: keep updated_at honest on every table that has one
-- ─────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

-- ─────────────────────────────────────────────────────────────
-- Audit trail
-- ─────────────────────────────────────────────────────────────
create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  actor_email text,
  actor_role  text,
  action      text not null,                      -- 'content.publish', 'asset.upload', …
  category    text not null default 'system',     -- content | assets | seo | design | team | agent | system
  target      text,
  target_type text,
  summary     text,                               -- one human sentence
  status      text not null default 'success',    -- success | error
  duration_ms integer,
  metadata    jsonb,
  ip          text,
  user_agent  text
);
create index if not exists activity_log_created on public.activity_log (created_at desc);
alter table public.activity_log enable row level security;
create policy p_activity_read   on public.activity_log for select using (is_admin());
-- ⚠️ A SELECT-only policy silently swallows INSERTs (no error, no row). See §11.2.
create policy p_activity_insert on public.activity_log for insert with check (is_admin());

-- Bootstrap the first owner (replace the email):
insert into public.admin_users (email, role, full_name)
values ('you@acme.com', 'owner', 'Owner')
on conflict (email) do update set role = 'owner';
```

### RLS conventions every module follows

1. **Enable RLS on every table.** No exceptions.
2. **Admin tables:** `for all using (is_admin()) with check (is_admin())`.
3. **Public-read tables** (the site renders them anonymously): a separate `for select`
   policy scoped to what's safe — e.g. `using (status = 'published')`.
4. **Prefer views as the public surface.** A view exposing only published rows and only
   safe columns (e.g. `published_content`, `active_tracking_tags`) is harder to get wrong
   than a column-level policy.
5. **Every table that is written to gets an explicit INSERT/UPDATE policy.** Verify writes
   by checking the response — never assume.
6. **Destructive or dangerous operations** (raw HTML, deleting assets, team changes) check
   `is_admin_manager()`.

---

## 6. Admin authentication (client)

### Flow

```
/admin/login  → enter email → supabase.auth.signInWithOtp({ email, emailRedirectTo })
             → branded email via Resend → click link → back on /admin with a session
             → AdminAuthProvider resolves session → rpc('is_admin') → allowed / blocked
```

### Email delivery — do this on day one

Supabase's built-in mailer is heavily rate-limited; a team of five will hit it and read it
as "login is broken." Configure **Custom SMTP** (Supabase → Auth → SMTP) with Resend:

- Host `smtp.resend.com`, port `465`, user `resend`, password = Resend API key.
- Sender on a **verified domain** (e.g. `login@mail.acme.com`) — add Resend's DNS records.
- Edit the Magic Link template in Supabase → Auth → Email Templates to match the brand.
  It's the first thing every new team member sees.

### Redirect allow-list — security critical

Supabase → Auth → URL Configuration:

- **Site URL:** `https://acme.com`
- **Redirect URLs:** exact hosts only — `https://acme.com/**`, `https://www.acme.com/**`,
  `http://localhost:5173/**`, and your specific preview host pattern
  (`https://acme-site-*.vercel.app/**` scoped to *your* project name).

⚠️ **Never add `https://*.vercel.app/**`.** Any Vercel deployment on the internet could then
complete your login flow and receive a session.

### Reference: `src/admin/auth.tsx`

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Role = "owner" | "admin" | "editor";
type AuthState = {
  session: Session | null;
  email: string | null;
  isAdmin: boolean;
  role: Role | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  session: null, email: null, isAdmin: false, role: null, loading: true, signOut: async () => {},
});
export const useAdminAuth = () => useContext(AuthCtx);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;

    const resolve = async (s: Session | null) => {
      if (!active) return;
      setSession(s);
      if (s?.user?.email) {
        // Ask the SAME function RLS uses — case-insensitive and authoritative.
        // (The reference build queried admin_users with .eq("email"), which is
        // case-sensitive and can disagree with RLS. Don't.)
        const { data: ok } = await supabase!.rpc("is_admin");
        let r: Role | null = null;
        if (ok) {
          const { data } = await supabase!
            .from("admin_users").select("role")
            .ilike("email", s.user.email).maybeSingle();
          r = (data?.role as Role) ?? "editor";
        }
        if (active) { setIsAdmin(ok === true); setRole(r); }
      } else if (active) {
        setIsAdmin(false); setRole(null);
      }
      if (active) setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => resolve(s));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase?.auth.signOut();
    setSession(null); setIsAdmin(false); setRole(null);
  };

  return (
    <AuthCtx.Provider value={{ session, email: session?.user?.email ?? null, isAdmin, role, loading, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isAdmin, loading, signOut, email } = useAdminAuth();
  const loc = useLocation();
  if (loading) return <AdminBoot />;
  if (!session) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  if (!isAdmin) {
    // Signed in, but not on the allow-list — say so precisely, offer sign-out.
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">No admin access</h1>
          <p className="mt-2 text-sm opacity-70">{email} isn't on the admin list. Ask an owner to add you.</p>
          <button onClick={signOut} className="mt-4 underline">Sign out</button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function AdminBoot() {
  return <div className="grid min-h-screen place-items-center"><div className="h-1 w-24 animate-pulse rounded bg-current opacity-20" /></div>;
}
```

### Sending the session to your own API

Every admin → API call sends the user's access token; the server re-verifies it (§7).

```ts
// src/admin/lib/api.ts
import { supabase } from "@/lib/supabase";
export async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase!.auth.getSession();
  return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` };
}
```

---

## 7. Server auth gate — `requireAdmin()`

Every serverless function that mutates anything calls this first. It returns a **specific**
reason on failure, so the admin UI can tell "server misconfigured" from "session expired"
from "not on the list." Generic 401s cost hours of support.

```ts
// api/_lib/admin.ts
type AdminCheck = { email: string } | { error: string; status: number };

export async function requireAdmin(req: any): Promise<AdminCheck> {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return { status: 503, error: "Server isn't configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE (server-only, no VITE_ prefix), then redeploy." };
  }

  const token = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return { status: 401, error: "Not signed in — no admin session was sent with the request." };

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return { status: 401, error: "Your admin session is invalid or expired — sign out and back in." };

  const email = (await userRes.json())?.email;
  if (!email) return { status: 401, error: "Couldn't read your account email from the session." };

  // Same is_admin() the database's RLS uses: SECURITY DEFINER, case-insensitive.
  // Called WITH THE USER'S TOKEN so auth.jwt() resolves to them.
  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
    method: "POST",
    headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const ok = rpcRes.ok ? await rpcRes.json().catch(() => false) : false;
  if (ok !== true) return { status: 403, error: `${email} isn't on the admin allow-list.` };

  return { email };
}
```

Usage pattern in every function:

```ts
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const auth = await requireAdmin(req);
  if ("error" in auth) return res.status(auth.status).json({ error: auth.error });
  // … auth.email is the verified admin
}
```

**One gate, used everywhere.** The reference build had a second, hand-rolled admin check
inside the upload function that compared emails case-sensitively. Two gates drift. Import
this one.

---

## 8. Admin shell

### Lazy loading — the public bundle never carries admin code

```tsx
// src/App.tsx
const AdminApp = lazy(() => import("@/admin/AdminApp").then((m) => ({ default: m.AdminApp })));

<Routes>
  <Route path="/admin/*" element={<Suspense fallback={<AdminBoot />}><AdminApp /></Suspense>} />
  <Route path="/*" element={<PublicApp />} />
</Routes>
```

Verify after every build: grep the public entry chunk for an admin-only string. It must
not be there.

### Nav registry — modules register themselves

```ts
// src/admin/nav.ts
import type { LucideIcon } from "lucide-react";
export type AdminNavItem = {
  to: string; label: string; icon: LucideIcon;
  group?: "build" | "content" | "grow" | "settings";
  minRole?: "owner" | "admin" | "editor";   // hide from roles below this
  accent?: boolean;                          // highlight (e.g. the AI agent)
};
export const ADMIN_NAV: AdminNavItem[] = [];
export const registerNav = (item: AdminNavItem) => ADMIN_NAV.push(item);
```

Each module's admin page file calls `registerNav(...)` once; `AdminLayout` renders the list
grouped and role-filtered. Installing a module = importing its page. Removing one = deleting
the import.

Reference sidebar order (from production): Dashboard · Build with AI · Site editor ·
Pricing Studio · Design · Tracking · Assets · Review · SEO · Blog · Help Center · Publish ·
Team · Activity.

### Admin chrome is never branded by the site's design tokens

The admin UI stays on a fixed neutral look even when the team restyles the public site
(Module 05 §6.5). An admin that changes colour when someone picks a bad palette is an admin
nobody can use to fix the palette.

---

## 9. Activity log

### Server helper

```ts
// api/_lib/activity.ts
export function reqMeta(req: any) {
  return {
    ip: String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim() || null,
    userAgent: String(req.headers?.["user-agent"] || "").slice(0, 300) || null,
  };
}

export async function logActivity(e: {
  actor: string; action: string; category?: string; target?: string; targetType?: string;
  summary?: string; status?: "success" | "error"; durationMs?: number; metadata?: unknown;
  ip?: string | null; userAgent?: string | null;
}) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/activity_log`, {
      method: "POST",
      headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
                 "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        actor_email: e.actor, action: e.action, category: e.category ?? "system",
        target: e.target ?? null, target_type: e.targetType ?? null, summary: e.summary ?? null,
        status: e.status ?? "success", duration_ms: e.durationMs ?? null,
        metadata: e.metadata ?? null, ip: e.ip ?? null, user_agent: e.userAgent ?? null,
      }),
    });
  } catch { /* logging must never break the action it records */ }
}
```

### Client helper (for actions that happen purely client-side, e.g. publishing content)

```ts
// src/admin/activity/client.ts
export async function logEvent(entry: { action: string; category?: string; target?: string;
  targetType?: string; summary?: string; status?: "success" | "error"; metadata?: unknown }) {
  try {
    const { data } = await supabase!.auth.getSession();
    await supabase!.from("activity_log").insert({
      actor_email: data.session?.user?.email ?? null, action: entry.action,
      category: entry.category ?? "system", target: entry.target ?? null,
      target_type: entry.targetType ?? null, summary: entry.summary ?? null,
      status: entry.status ?? "success", metadata: entry.metadata ?? null,
    });
  } catch { /* never block the user */ }
}
```

**Action naming:** `<area>.<verb>` — `content.publish`, `asset.upload`, `asset.delete`,
`seo.update`, `design.publish`, `team.invite`, `agent.publish`, `site.rollback`.

The Activity admin screen lists the log with filters by category, status, actor, and text.

---

## 10. Environment & deploy

### Environment variables

| Variable | Where | Secret | Used by |
|---|---|---|---|
| `VITE_SUPABASE_URL` | client | no | every module |
| `VITE_SUPABASE_ANON_KEY` | client | no (public by design) | every module |
| `SUPABASE_URL` | server | no | API, middleware |
| `SUPABASE_ANON_KEY` | server | no | middleware, sitemap |
| `SUPABASE_SERVICE_ROLE` | server | **yes** — never `VITE_` | API |
| `SUPER_ADMIN_EMAIL` | server | no | bootstrap |
| `R2_*`, `VITE_ASSETS_BASE_URL` | see Module 02 | | |
| `OPENAI_*`, `GITHUB_*` | see Module 01 | | |
| `CRON_SECRET` | server | yes | scheduled jobs |

**The `VITE_` prefix ships a value to every visitor's browser.** Anything secret must never
carry it. Audit before launch: `grep -r "VITE_" .env*` and read every line.

### vercel.json

```json
{
  "redirects": [
    {
      "source": "/((?!api/).*)",
      "has": [{ "type": "host", "value": "acme-site.vercel.app" }],
      "destination": "https://acme.com/$1",
      "permanent": true
    }
  ],
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- **Strict JSON.** A `"//"` comment key fails the build with a schema error.
- **Host consolidation** sends the `*.vercel.app` host to the real domain — but excludes
  `/api/` so scheduled jobs (which call the deployment URL) keep working.
- Modules append their own rewrites (sitemap, font proxy) **before** the SPA catch-all.
- Vercel counts serverless functions per plan. Multiplex related operations into one
  function (GET = list, POST = act) rather than one file per verb.

### Deploy loop

```bash
git pull --rebase origin main      # teammates and the AI agent also commit to main
git push origin main               # Vercel builds automatically
# poll: GET /repos/{owner}/{repo}/deployments?sha=<sha> → /statuses → success | failure
```

Always `pull --rebase` before pushing: in production the AI agent and teammates commit to
`main` concurrently, and a rejected push mid-release is avoidable.

---

## 11. Nuances & hard-won lessons

**11.1 — One admin check, case-insensitive, everywhere.** `is_admin()` compares
`lower(email)`. The reference build's client guard and upload function each compared with
`.eq("email", …)`, which is case-sensitive — so `Annie@…` in `admin_users` against an auth
session for `annie@…` passes RLS but is locked out of the admin and uploads. Always call
the RPC.

**11.2 — A SELECT-only policy silently swallows INSERTs.** No error, no row. The reference
build's publish history appeared empty for a week and the team believed publishing was
broken. Every written table gets an explicit write policy, and every write checks its
response.

**11.3 — Magic links need a real mail provider from day one.** Default Supabase email
limits look like a broken login to users.

**11.4 — Never wildcard the redirect allow-list.**

**11.5 — `vercel.json` rejects comments.**

**11.6 — Surface specific auth failures.** "Server not configured" vs "session expired" vs
"not on the list" are three different fixes. One generic 401 hides all three.

**11.7 — Logging must never break the action.** Wrap every log write in try/catch.

---

## 12. Acceptance tests

- [ ] `select is_admin();` as the owner's JWT returns `true`; as a non-listed user, `false`.
- [ ] An `admin_users` row with mixed-case email (`You@Acme.com`) still grants access to a
      session for `you@acme.com` — in RLS, in `requireAdmin`, and in the client guard.
- [ ] Anon key cannot `select` from `admin_users` or `activity_log`.
- [ ] Magic-link email arrives from the branded domain within 30s, styled on-brand.
- [ ] A login redirect to an unlisted host is rejected by Supabase.
- [ ] Signed-in non-admin sees "No admin access" with their email and a sign-out button.
- [ ] `requireAdmin` returns 503 / 401 / 403 with the three distinct messages.
- [ ] The public entry chunk contains no admin-only code (grep the build output).
- [ ] A client-side `logEvent` and a server-side `logActivity` both produce rows.
- [ ] `*.vercel.app/pricing` 308-redirects to `https://acme.com/pricing`; `/api/*` on the
      same host does not redirect.

---

## 13. Build plan

1. Scaffold Vite + React + TS + Tailwind + router. Create `brand.config.ts` from §4.
2. Create the Supabase project. Run §5. Insert yourself as `owner`.
3. Configure Resend SMTP, the magic-link template, Site URL and the exact redirect list.
4. Add `src/lib/supabase.ts` (client from `VITE_` vars; `null` if unset so the site still renders).
5. Build `AdminAuthProvider`, `RequireAuth`, the login page, `authHeaders()`.
6. Build `api/_lib/admin.ts` and `api/_lib/activity.ts`.
7. Build the lazy admin shell, `AdminLayout`, and the nav registry. Add Dashboard and Activity.
8. Add the Team screen: list `admin_users`, invite (insert row + send magic link), change
   role, remove — each gated on `is_admin_manager()` and logged.
9. Configure Vercel env vars, domain, host-consolidation redirect.
10. Run §12. Every box must pass before installing another module.
