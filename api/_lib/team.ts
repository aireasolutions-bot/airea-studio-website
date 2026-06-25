// Server-only helpers for Team & Access: the admin_users allow-list (PostgREST)
// and Supabase's Auth admin API (invite / create / magic-link / delete).
// All of these require the real SERVICE-ROLE key — if SUPABASE_SERVICE_ROLE is
// the anon key, the writes/admin calls return 401/403 (callers surface a hint).
const URL = process.env.SUPABASE_URL || "";
const KEY = process.env.SUPABASE_SERVICE_ROLE || "";
const H: Record<string, string> = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

export function teamConfigured(): boolean {
  return !!(URL && KEY);
}

// ---------- admin_users allow-list (PostgREST) ----------
export async function listAdminUsers(): Promise<any[]> {
  const r = await fetch(
    `${URL}/rest/v1/admin_users?select=email,role,full_name,created_at&order=created_at.asc`,
    { headers: H },
  );
  if (!r.ok) throw new Error(`Couldn't read the team list (${r.status})`);
  return r.json();
}

export async function upsertAdminUser(email: string, fullName: string): Promise<void> {
  const row: Record<string, any> = { email, role: "admin" };
  if (fullName) row.full_name = fullName; // omit when empty so re-invites don't clobber a name
  const r = await fetch(`${URL}/rest/v1/admin_users?on_conflict=email`, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`Couldn't add to the allow-list (${r.status})`);
}

export async function removeAdminUser(email: string): Promise<void> {
  const r = await fetch(`${URL}/rest/v1/admin_users?email=eq.${encodeURIComponent(email)}`, {
    method: "DELETE",
    headers: { ...H, Prefer: "return=minimal" },
  });
  if (!r.ok) throw new Error(`Couldn't remove from the allow-list (${r.status})`);
}

// ---------- Supabase Auth admin API ----------
export async function listAuthUsers(): Promise<any[]> {
  const r = await fetch(`${URL}/auth/v1/admin/users?per_page=200`, { headers: H });
  if (!r.ok) throw new Error(`Couldn't read accounts (${r.status})`);
  const d = await r.json();
  return Array.isArray(d) ? d : d.users || [];
}

export async function findAuthUser(email: string): Promise<any | null> {
  const users = await listAuthUsers();
  return users.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase()) || null;
}

// Creates the account (if new) AND sends the branded Invite email with a magic link.
export async function inviteUser(email: string, fullName: string, redirectTo?: string): Promise<Response> {
  const url = `${URL}/auth/v1/invite` + (redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : "");
  return fetch(url, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ email, data: { full_name: fullName || "" } }),
  });
}

// Creates a confirmed account with a password (no email sent).
export async function createUserWithPassword(email: string, password: string, fullName: string): Promise<Response> {
  return fetch(`${URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName || "" } }),
  });
}

export async function setUserPassword(id: string, password: string): Promise<Response> {
  return fetch(`${URL}/auth/v1/admin/users/${id}`, {
    method: "PUT",
    headers: H,
    body: JSON.stringify({ password }),
  });
}

// Sends the branded Magic-link email (used for password-mode welcome + resends).
export async function sendMagicLink(email: string, redirectTo?: string): Promise<Response> {
  const url = `${URL}/auth/v1/otp` + (redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : "");
  return fetch(url, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ email, create_user: false }),
  });
}

export async function deleteAuthUser(id: string): Promise<Response> {
  return fetch(`${URL}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: H });
}

// If a write came back 401/403, it's almost always the wrong key in Vercel.
export function serviceRoleHint(msg: string): string {
  return /\b(401|403)\b/.test(msg)
    ? `${msg}. This action needs the Supabase service-role key — check SUPABASE_SERVICE_ROLE in Vercel (it may still be the anon key).`
    : msg;
}
