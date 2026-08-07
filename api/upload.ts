// Vercel serverless function: secure uploads to Cloudflare R2. Three modes —
// R2 keys never leave the server in any of them:
//   1. Legacy: { filename, contentType, dataBase64, folder } — server-side PUT.
//      Capped ~3 MB by Vercel's request-body limit; used for chat/font uploads.
//   2. { presign: { filename, contentType, folder } } — returns a short-lived
//      signed PUT URL so the BROWSER uploads straight to R2 (any size, real
//      progress). Requires PUT in the bucket's CORS rules.
//   3. { register: { key, ... } } — after a presigned PUT succeeds, verifies the
//      object exists in R2, then records it in the assets library.
// All modes verify the caller is an allow-listed admin (Supabase session).
// Env (set in Vercel, server-side — never VITE_*):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE,
//   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logActivity, reqMeta } from "./_lib/activity.js";

const safeName = (name: string) => String(name).replace(/[^a-zA-Z0-9._-]/g, "-");
const safeFolder = (folder: unknown) => String(folder || "uploads").replace(/[^a-z0-9/_-]/gi, "");

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

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const s3 = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });

  // ---- mode 2: presign a direct browser → R2 upload (any file size) ----
  if (body?.presign) {
    const { filename, contentType } = body.presign;
    if (!filename) {
      res.status(400).json({ error: "Missing filename" });
      return;
    }
    const safe = safeName(filename);
    const cleanFolder = safeFolder(body.presign.folder);
    const key = `assets/${cleanFolder}/${Date.now()}-${safe}`;
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: contentType || "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
      }),
      { expiresIn: 900 }
    );
    res.status(200).json({ uploadUrl, key, url: `${R2_PUBLIC_URL}/${key}` });
    return;
  }

  // ---- mode 3: register a completed presigned upload in the library ----
  if (body?.register) {
    const { key, filename, contentType, sizeBytes, width, height } = body.register;
    if (!key || !String(key).startsWith("assets/")) {
      res.status(400).json({ error: "Missing/invalid key" });
      return;
    }
    // Only register objects that actually landed in R2.
    try {
      await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    } catch {
      res.status(400).json({ error: "That upload never reached storage — try again." });
      return;
    }
    const url = `${R2_PUBLIC_URL}/${key}`;
    const cleanFolder = safeFolder(body.register.folder);
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
          filename: safeName(filename || key.split("/").pop() || "file"),
          url,
          type: String(contentType || "").startsWith("video") ? "video" : "image",
          content_type: contentType || null,
          folder: cleanFolder,
          size_bytes: Number(sizeBytes) || null,
          width: Number(width) || null,
          height: Number(height) || null,
          uploaded_by: email,
        },
      ]),
    });
    await logActivity({
      actor: email,
      action: "asset.upload",
      category: "assets",
      target: safeName(filename || key),
      targetType: "asset",
      summary: `Uploaded ${safeName(filename || key)}`,
      metadata: { key, folder: cleanFolder, sizeBytes, contentType, direct: true },
      ...reqMeta(req),
    });
    res.status(200).json({ key, url });
    return;
  }

  // ---- mode 1 (legacy): small files as base64 through the function ----
  const { filename, contentType, dataBase64, folder, width, height } = body || {};
  if (!filename || !dataBase64) {
    res.status(400).json({ error: "Missing file" });
    return;
  }
  const safe = safeName(filename);
  const cleanFolder = safeFolder(folder);
  const key = `assets/${cleanFolder}/${Date.now()}-${safe}`;
  const buf = Buffer.from(dataBase64, "base64");
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
        width: Number(width) || null,
        height: Number(height) || null,
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
