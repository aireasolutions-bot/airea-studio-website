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

  // Verify via the same is_admin() the site's RLS uses: SECURITY DEFINER (so it's
  // RLS-safe) and case-insensitive. Calling it with the user's token works whether
  // SUPABASE_SERVICE_ROLE holds the service-role or the anon key.
  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
    method: "POST",
    headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const isAdmin = rpcRes.ok ? await rpcRes.json().catch(() => false) : false;
  if (isAdmin !== true) {
    return { error: `${email} isn't on the admin allow-list (add it to the admin_users table).`, status: 403 };
  }

  return { email };
}
