/* Shared upload engine for the admin (Assets library + the picker used inside
 * the blog and Help Center editors).
 *
 * ≤ 3 MB: base64 through /api/upload (fits the serverless body limit).
 * > 3 MB: presigned PUT straight from the browser to R2 — any size, real
 * progress — then a register call that files it in the library. R2 keys never
 * reach the browser in either path.
 *
 * The picker used to post base64 for EVERY file with no size check, so a large
 * video died with an opaque 413 from the platform rather than taking this path. */
import { supabase } from "@/lib/supabase";

export const DIRECT_THRESHOLD = 3 * 1024 * 1024;

/** Turn a raw transport failure into something the team can act on. */
function uploadError(status: number, body: string): string {
  try {
    const j = JSON.parse(body);
    if (j?.error) return String(j.error);
  } catch {
    /* not JSON — fall through to the status-based copy */
  }
  if (status === 413) return "That file is too large for this route — it should have used the direct-to-storage upload. Refresh and try again.";
  return `Upload failed (${status})`;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase!.auth.getSession();
  return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` };
}

// Pixel dimensions for the library (images + videos), best-effort.
export function readDimensions(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (d: { width?: number; height?: number }) => {
      URL.revokeObjectURL(url);
      resolve(d);
    };
    if (file.type.startsWith("video")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => done({ width: v.videoWidth, height: v.videoHeight });
      v.onerror = () => done({});
      v.src = url;
    } else if (file.type.startsWith("image")) {
      const img = new Image();
      img.onload = () => done({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => done({});
      img.src = url;
    } else {
      done({});
    }
  });
}

function putWithProgress(url: string, file: File, onProgress: (f: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage answered ${xhr.status}`)));
    xhr.onerror = () =>
      reject(
        new Error(
          "The browser couldn't reach storage — for files over 3 MB the R2 bucket's CORS rules must allow PUT (one-time Cloudflare tweak). Ping Nicolas."
        )
      );
    xhr.send(file);
  });
}

export async function uploadOne(file: File, folder: string, onProgress: (f: number) => void = () => {}): Promise<string> {
  const dims = await readDimensions(file);
  if (file.size <= DIRECT_THRESHOLD) {
    onProgress(-1); // no granular progress on the base64 path
    const dataBase64 = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1] ?? "");
      r.onerror = () => rej(new Error("Couldn't read the file"));
      r.readAsDataURL(file);
    });
    const resp = await fetch("/api/upload", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ filename: file.name, contentType: file.type, folder, dataBase64, ...dims }),
    });
    if (!resp.ok) throw new Error(uploadError(resp.status, await resp.text().catch(() => "")));
    return String((await resp.json()).key ?? "");
  }
  // large file → presign → direct PUT → register
  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ presign: { filename: file.name, contentType: file.type, folder } }),
  });
  if (!presignRes.ok) throw new Error((await presignRes.json().catch(() => ({})))?.error || `Couldn't prepare the upload (${presignRes.status})`);
  const { uploadUrl, key } = await presignRes.json();
  await putWithProgress(uploadUrl, file, onProgress);
  const regRes = await fetch("/api/upload", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ register: { key, filename: file.name, contentType: file.type, folder, sizeBytes: file.size, ...dims } }),
  });
  if (!regRes.ok) throw new Error((await regRes.json().catch(() => ({})))?.error || "Uploaded, but couldn't register it — refresh and check.");
  return key;
}
