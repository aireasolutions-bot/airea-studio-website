// Verify the caller is an allow-listed admin via their Supabase session token.
// Returns the admin email on success, or null. Server-only env:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE
export async function verifyAdmin(req: any): Promise<string | null> {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) return null;

  const token = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return null;
  const email = (await userRes.json())?.email;
  if (!email) return null;

  const adminRes = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?select=email&email=eq.${encodeURIComponent(email)}`,
    { headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` } }
  );
  const admins = await adminRes.json().catch(() => null);
  if (!Array.isArray(admins) || admins.length === 0) return null;
  return email;
}
