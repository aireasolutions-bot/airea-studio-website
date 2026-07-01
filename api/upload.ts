// Vercel serverless function: secure image upload to Cloudflare R2.
// Verifies the caller is an allow-listed admin (Supabase session), then uploads
// to R2 with server-side keys and registers the asset in Supabase.
// Env (set in Vercel, server-side — never VITE_*):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE,
//   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { logActivity, reqMeta } from "./_lib/activity.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE,
    R2_ENDPOINT,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
  } = process.env;
  const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    res.status(500).json({ error: "Server not configured" });
    return;
  }

  // 1. Verify the Supabase session token belongs to an allow-listed admin.
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) {
    res.status(401).json({ error: "Invalid session" });
    return;
  }
  const email = (await userRes.json())?.email;
  const adminRes = await fetch(
    `${SUPABASE_URL}/rest/v1/admin_users?select=email&email=eq.${encodeURIComponent(email)}`,
    { headers: { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` } }
  );
  const admins = await adminRes.json();
  if (!Array.isArray(admins) || admins.length === 0) {
    res.status(403).json({ error: "Not an admin" });
    return;
  }

  // 2. Decode + upload.
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { filename, contentType, dataBase64, folder } = body || {};
  if (!filename || !dataBase64) {
    res.status(400).json({ error: "Missing file" });
    return;
  }
  const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, "-");
  const cleanFolder = String(folder || "uploads").replace(/[^a-z0-9/_-]/gi, "");
  const key = `assets/${cleanFolder}/${Date.now()}-${safe}`;
  const buf = Buffer.from(dataBase64, "base64");

  const s3 = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buf,
      ContentType: contentType || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  const url = `${R2_PUBLIC_URL}/${key}`;

  // 3. Register in Supabase.
  await fetch(`${SUPABASE_URL}/rest/v1/assets?on_conflict=key`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([
      {
        key,
        filename: safe,
        url,
        type: String(contentType || "").startsWith("video") ? "video" : "image",
        content_type: contentType,
        folder: cleanFolder,
        size_bytes: buf.length,
        uploaded_by: email,
      },
    ]),
  });

  await logActivity({
    actor: email,
    action: "asset.upload",
    category: "assets",
    target: safe,
    targetType: "asset",
    summary: `Uploaded ${safe}`,
    metadata: { key, folder: cleanFolder, sizeBytes: buf.length, contentType },
    ...reqMeta(req),
  });

  res.status(200).json({ key, url });
}
