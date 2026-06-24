import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, FilePenLine, Images, MessagesSquare, Rocket } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "../auth";

type Stats = { assets: number; openComments: number; blocks: number };

export function Dashboard() {
  const { email } = useAdminAuth();
  const [stats, setStats] = useState<Stats>({ assets: 0, openComments: 0, blocks: 0 });
  const [lastPublish, setLastPublish] = useState<{ created_at: string; published_by: string | null } | null>(null);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const [a, c, b, p] = await Promise.all([
        supabase.from("assets").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
        supabase.from("content_blocks").select("*", { count: "exact", head: true }),
        supabase.from("publish_log").select("created_at, published_by").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setStats({ assets: a.count ?? 0, openComments: c.count ?? 0, blocks: b.count ?? 0 });
      setLastPublish(p.data ?? null);
    })();
  }, []);

  const name = (email?.split("@")[0] ?? "there").replace(/^./, (c) => c.toUpperCase());

  const cards = [
    { label: "Assets in library", value: stats.assets, icon: Images, to: "/admin/assets" },
    { label: "Open comments", value: stats.openComments, icon: MessagesSquare, to: "/admin/comments" },
    { label: "Editable blocks", value: stats.blocks, icon: FilePenLine, to: "/admin/editor" },
  ];

  const actions = [
    { title: "Edit the site", desc: "Change copy, headlines, and images.", icon: FilePenLine, to: "/admin/editor" },
    { title: "Manage assets", desc: "Browse, preview, and download R2 assets.", icon: Images, to: "/admin/assets" },
    { title: "Review & comment", desc: "Preview changes and leave pinned notes.", icon: MessagesSquare, to: "/admin/comments" },
    { title: "Publish", desc: "Push approved changes live + to GitHub.", icon: Rocket, to: "/admin/publish" },
  ];

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">Dashboard</p>
      <h1 className="mt-1 font-display text-[clamp(28px,4vw,42px)] tracking-tight text-ink">
        Welcome back, {name}.
      </h1>
      <p className="mt-2 max-w-xl text-[15px] text-ink-2">
        Manage the AIREA Studio website — edit content, organize assets, review changes,
        and publish without writing code.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.to}
            className="group rounded-2xl border border-line bg-white p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-mist text-blue">
                <c.icon className="h-5 w-5" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
            <div className="mt-4 font-display text-4xl text-ink">{c.value}</div>
            <div className="mt-1 text-[13.5px] text-ink-2">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-white p-5">
        <div className="flex items-center gap-2 text-[13.5px] text-ink-2">
          <Rocket className="h-4 w-4 text-blue" />
          {lastPublish ? (
            <span>
              Last published{" "}
              <span className="font-semibold text-ink">
                {new Date(lastPublish.created_at).toLocaleString()}
              </span>
              {lastPublish.published_by ? ` by ${lastPublish.published_by}` : ""}
            </span>
          ) : (
            <span>No publishes yet — changes you make become a draft until you publish.</span>
          )}
        </div>
      </div>

      <h2 className="mt-10 text-[13px] font-semibold uppercase tracking-wider text-ink-3">
        Quick actions
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {actions.map((a) => (
          <Link
            key={a.title}
            to={a.to}
            className="group flex items-start gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-blue/30 hover:shadow-card"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-mist text-blue">
              <a.icon className="h-5 w-5" />
            </span>
            <div>
              <div className="text-[15.5px] font-semibold text-ink">{a.title}</div>
              <div className="mt-0.5 text-[13.5px] text-ink-2">{a.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
