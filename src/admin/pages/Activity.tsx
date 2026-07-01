import { useEffect, useMemo, useState } from "react";
import {
  Activity as ActivityIcon,
  AlertTriangle,
  ChevronDown,
  FilePenLine,
  Image as ImageIcon,
  Loader2,
  LogIn,
  RefreshCw,
  Rocket,
  Search,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { PageHead } from "./_Placeholder";
import { listActivity, type ActivityEvent } from "../activity/client";

const CAT: Record<string, { label: string; chip: string; icon: typeof LogIn }> = {
  auth: { label: "Auth", chip: "bg-indigo-50 text-indigo-700", icon: LogIn },
  content: { label: "Content", chip: "bg-blue-50 text-blue-700", icon: FilePenLine },
  seo: { label: "SEO", chip: "bg-emerald-50 text-emerald-700", icon: Search },
  team: { label: "Team", chip: "bg-violet-50 text-violet-700", icon: Users },
  agent: { label: "Agent", chip: "bg-blue-mist text-blue-ink", icon: Sparkles },
  publish: { label: "Publish", chip: "bg-amber-50 text-amber-700", icon: Rocket },
  assets: { label: "Assets", chip: "bg-cyan-50 text-cyan-700", icon: ImageIcon },
  system: { label: "System", chip: "bg-ink/5 text-ink-2", icon: Settings2 },
};
const catOf = (c: string) => CAT[c] || CAT.system;

const FILTERS = ["", "auth", "content", "seo", "team", "agent", "publish", "assets"];

function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return "";
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
}

function device(ua: string | null): string {
  if (!ua) return "";
  const b = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Linux/.test(ua) ? "Linux" : "";
  return [b, os].filter(Boolean).join(" · ");
}

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export function Activity() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      setEvents(await listActivity({ category: category || undefined, q: q.trim() || undefined, limit: 300 }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const stats = useMemo(() => {
    const actors = new Set(events.map((e) => e.actor_email).filter(Boolean));
    return {
      total: events.length,
      actors: actors.size,
      today: events.filter((e) => isToday(e.created_at)).length,
      errors: events.filter((e) => e.status === "error").length,
    };
  }, [events]);

  return (
    <div>
      <PageHead
        eyebrow="Activity"
        title="Activity log"
        sub="Every action across the admin — who did what, when, from where, and how long it took. Tamper-proof: entries are written server-side."
      />

      {/* stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Events", value: stats.total, icon: ActivityIcon, tone: "text-ink" },
          { label: "Active users", value: stats.actors, icon: Users, tone: "text-blue" },
          { label: "Today", value: stats.today, icon: RefreshCw, tone: "text-emerald-600" },
          { label: "Errors", value: stats.errors, icon: AlertTriangle, tone: stats.errors ? "text-critical" : "text-ink-3" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-2xl border border-line bg-white px-4 py-3 shadow-soft">
            <s.icon className={cn("h-4 w-4 shrink-0", s.tone)} />
            <div className="min-w-0">
              <div className={cn("text-[20px] font-bold leading-none tabular-nums", s.tone)}>{s.value}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-line-2 bg-white px-3.5 py-2 shadow-soft">
          <Search className="h-4 w-4 text-ink-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search actions, people, targets…"
            className="w-full bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-full border border-line-2 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-ink-2 hover:border-ink-3 hover:text-ink"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const c = f ? catOf(f) : null;
          return (
            <button
              key={f || "all"}
              onClick={() => setCategory(f)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                category === f ? "border-blue bg-blue text-white shadow-soft" : "border-line-2 bg-white text-ink-2 hover:border-blue/40 hover:text-ink"
              )}
            >
              {c ? <c.icon className="h-3.5 w-3.5" /> : <ActivityIcon className="h-3.5 w-3.5" />}
              {f ? c!.label : "All"}
            </button>
          );
        })}
      </div>

      {/* timeline */}
      <div className="mt-5 overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
        {err ? (
          <div className="flex items-start gap-2 px-6 py-8 text-[13px] text-critical">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {err}
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 px-6 py-12 text-[14px] text-ink-3">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading activity…
          </div>
        ) : events.length === 0 ? (
          <div className="px-6 py-12 text-center text-[14px] text-ink-3">No activity yet.</div>
        ) : (
          <ul className="divide-y divide-line">
            {events.map((e) => {
              const c = catOf(e.category);
              const open = expanded === e.id;
              const dur = fmtDuration(e.duration_ms);
              return (
                <li key={e.id}>
                  <button
                    onClick={() => setExpanded(open ? null : e.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-canvas md:px-6"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-mist text-[12px] font-bold text-blue-ink">
                      {(e.actor_email || "?").slice(0, 1).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", c.chip)}>
                          <c.icon className="h-3 w-3" /> {c.label}
                        </span>
                        <span className="truncate text-[13.5px] font-medium text-ink">{e.summary || e.action}</span>
                        {e.status === "error" && (
                          <span className="shrink-0 rounded-full bg-critical/10 px-1.5 py-0.5 text-[10px] font-semibold text-critical">error</span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-[12px] text-ink-3">
                        {e.actor_email || "system"}
                        {e.target ? <span> · {e.target}</span> : null}
                      </div>
                    </div>

                    {dur && <span className="hidden shrink-0 font-mono text-[11px] text-ink-3 sm:inline">{dur}</span>}
                    <span className="shrink-0 whitespace-nowrap text-[11.5px] text-ink-3" title={new Date(e.created_at).toLocaleString()}>
                      {relTime(e.created_at)}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} />
                  </button>

                  {open && (
                    <div className="border-t border-line bg-canvas/50 px-4 py-3 md:px-6">
                      <div className="grid gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-2">
                        <Detail k="Action" v={<code className="text-ink-2">{e.action}</code>} />
                        <Detail k="When" v={new Date(e.created_at).toLocaleString()} />
                        <Detail k="Actor" v={`${e.actor_email || "—"}${e.actor_role ? ` (${e.actor_role})` : ""}`} />
                        {e.duration_ms != null && <Detail k="Duration" v={fmtDuration(e.duration_ms)} />}
                        {e.target && <Detail k="Target" v={`${e.target}${e.target_type ? ` · ${e.target_type}` : ""}`} />}
                        <Detail k="Status" v={e.status} />
                        {e.ip && <Detail k="IP" v={e.ip} />}
                        {e.user_agent && <Detail k="Device" v={device(e.user_agent) || e.user_agent} />}
                      </div>
                      {e.metadata && Object.keys(e.metadata).length > 0 && (
                        <pre className="mt-2.5 max-h-48 overflow-auto rounded-lg border border-line bg-white p-2.5 text-[11px] leading-relaxed text-ink-2">
                          {JSON.stringify(e.metadata, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!loading && events.length >= 300 && (
        <p className="mt-3 text-center text-[12px] text-ink-3">Showing the most recent 300 events. Filter or search to narrow down.</p>
      )}
    </div>
  );
}

function Detail({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-16 shrink-0 font-mono text-[10.5px] uppercase tracking-wide text-ink-3">{k}</span>
      <span className="min-w-0 break-words text-ink-2">{v}</span>
    </div>
  );
}
