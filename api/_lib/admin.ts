// Verify the caller is an allow-listed admin via their Supabase session token.
// Returns { email } on success, or { error, status } with a SPECIFIC reason so the
// UI can tell apart: server-not-configured / not-signed-in / bad-session / not-an-admin.
// Server-only env: SUPABASE_URL, SUPABASE_SERVICE_ROLE.
type AdminCheck = { email: string } | { error: string; status: number };

export async function requireAdmin(req: any): Promise<AdminCheck> {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return {
      error: "Server isn't configured — add SUPABASE_URL and SUPABASE_SERVICE_ROLE (server-only, no VITE_ prefix) in Vercel, then redeploy.",
      status: 503,
    };
  }

  const token = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Not signed in — no admin session was sent with the request.", status: 401 };

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return { error: "Your admin session is invalid or expired — sign out and sign back in.", status: 401 };

  const email = (await userRes.json())?.email;
  if (!email) return { error: "Couldn't read your account email from the session.", status: 401 };

  const adminRes = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?select=email&email=eq.${encodeURIComponent(email)}`,
    { headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` } }
  );
  const admins = await adminRes.json().catch(() => null);
  if (!Array.isArray(admins) || admins.length === 0) {
    return { error: `${email} isn't on the admin allow-list (add it to the admin_users table).`, status: 403 };
  }

  return { email };
}
