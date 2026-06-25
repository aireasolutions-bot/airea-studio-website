import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  GitCommitHorizontal,
  History,
  Loader2,
  RotateCcw,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { timeAgo } from "../lib/time";
import { getHistory, rollback, type Commit } from "../deploy/client";

export function Publish() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<Commit | null>(null);
  const [working, setWorking] = useState(false);
  const [toast, setToast] = useState<{ msg: string; url?: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setCommits(await getHistory());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const doRollback = async () => {
    if (!confirming) return;
    setWorking(true);
    try {
      const res = await rollback(confirming.sha, confirming.message);
      setToast({ msg: "Rolling back — Vercel is redeploying that version (live in ~1–2 min).", url: res.url });
      setConfirming(null);
      window.setTimeout(load, 1500);
    } catch (e) {
      setError((e as Error).message);
      setConfirming(null);
    } finally {
      setWorking(false);
      window.setTimeout(() => setToast(null), 6000);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">Deployments</p>
        <h1 className="mt-1 font-display text-[clamp(26px,3.4vw,38px)] tracking-tight text-ink">Versions &amp; rollback</h1>
        <p className="mt-1 text-[14px] text-ink-2">
          Every change to the site is a version here. Something off? Roll the live site back to any earlier
          version in one click — it redeploys that exact snapshot and is itself reversible.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-ink-3">
          <History className="h-4 w-4" /> Version history
        </h2>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full border border-line-2 px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:border-ink-3 disabled:opacity-50"
        >
          <RotateCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-critical/30 bg-critical/5 p-4 text-[13.5px] text-ink">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-critical" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="mt-4 grid place-items-center rounded-2xl border border-line bg-white py-16 text-ink-3">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <ol className="mt-4 space-y-2">
          {commits.map((c, i) => (
            <li
              key={c.sha}
              className={cn(
                "flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-soft",
                i === 0 ? "border-blue/40 ring-1 ring-blue/15" : "border-line"
              )}
            >
              <div className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", i === 0 ? "bg-blue text-white" : "bg-canvas text-ink-3")}>
                <GitCommitHorizontal className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[14px] font-semibold text-ink">{c.message || "(no message)"}</span>
                  {i === 0 && (
                    <span className="rounded-full bg-blue-mist px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-ink">
                      Live now
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-3">
                  <span>{c.author}</span>
                  <span>·</span>
                  <span>{timeAgo(c.date)}</span>
                  <span>·</span>
                  <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono hover:text-ink">
                    {c.sha.slice(0, 7)} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              {i !== 0 && (
                <button
                  onClick={() => setConfirming(c)}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-line-2 px-3 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-blue hover:text-blue"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Roll back
                </button>
              )}
            </li>
          ))}
          {commits.length === 0 && !error && (
            <li className="rounded-2xl border border-line bg-white py-12 text-center text-[14px] text-ink-3">No versions yet.</li>
          )}
        </ol>
      )}

      {/* confirm modal */}
      {confirming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => !working && setConfirming(null)}>
          <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
            <div className="grid h-11 w-11 place-items-center rounded-full bg-blue-mist text-blue-ink">
              <Undo2 className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-xl text-ink">Roll back the live site?</h2>
            <p className="mt-2 text-[14px] text-ink-2">
              This redeploys the site exactly as it was at:
            </p>
            <div className="mt-2 rounded-xl border border-line bg-canvas p-3">
              <div className="text-[13.5px] font-semibold text-ink">{confirming.message}</div>
              <div className="mt-0.5 font-mono text-[11.5px] text-ink-3">
                {confirming.sha.slice(0, 7)} · {timeAgo(confirming.date)}
              </div>
            </div>
            <p className="mt-2 text-[12.5px] text-ink-3">
              Your current version stays in history, so you can roll forward again anytime.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirming(null)}
                disabled={working}
                className="rounded-full border border-line-2 px-4 py-2 text-[13.5px] font-semibold text-ink hover:border-ink-3 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={doRollback}
                disabled={working}
                className="flex items-center gap-2 rounded-full bg-blue px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-blue-ink disabled:opacity-60"
              >
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                {working ? "Rolling back…" : "Roll back to this version"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3 text-[13.5px] font-semibold text-white shadow-card">
          <Check className="h-4 w-4 text-green-400" />
          {toast.msg}
          {toast.url && (
            <a href={toast.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
              commit <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
