import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  CircleDollarSign,
  FilePenLine,
  Palette,
  Radar,
  Images,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Newspaper,
  Rocket,
  ScrollText,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/cn";
import { useAdminAuth } from "./auth";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/agent", label: "Build with AI", icon: Sparkles, accent: true },
  { to: "/admin/editor", label: "Site editor", icon: FilePenLine },
  { to: "/admin/pricing", label: "Pricing Studio", icon: CircleDollarSign },
  { to: "/admin/design", label: "Design", icon: Palette },
  { to: "/admin/tracking", label: "Tracking", icon: Radar },
  { to: "/admin/assets", label: "Assets", icon: Images },
  { to: "/admin/comments", label: "Review", icon: MessagesSquare },
  { to: "/admin/seo", label: "SEO", icon: Search },
  { to: "/admin/blog", label: "Blog", icon: Newspaper },
  { to: "/admin/publish", label: "Publish", icon: Rocket },
  { to: "/admin/settings", label: "Team", icon: Users },
  { to: "/admin/activity", label: "Activity", icon: ScrollText },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { email, signOut } = useAdminAuth();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-line px-5">
        <Link to="/admin" onClick={onNavigate} className="flex items-center gap-2">
          <Logo wordmark={false} />
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-2">
            Admin
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
                isActive
                  ? "bg-blue text-white shadow-soft"
                  : (item as { accent?: boolean }).accent
                    ? "bg-blue-mist/60 text-blue-ink hover:bg-blue-mist"
                    : "text-ink-2 hover:bg-ink/5 hover:text-ink"
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="mb-1 block rounded-xl px-3 py-2 text-[13px] font-medium text-ink-3 hover:bg-ink/5 hover:text-ink"
        >
          ↗ View live site
        </a>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-mist text-[12px] font-bold text-blue-ink">
            {(email ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium text-ink">{email}</div>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-ink/5 hover:text-ink"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [open, setOpen] = useState(false);

  // The admin chrome always uses the house design — clear any site design
  // tokens that were applied while browsing the public site in this tab.
  useEffect(() => {
    import("@/lib/design").then((m) => m.clearDesign());
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-white lg:block">
        <SidebarContent />
      </aside>

      {/* mobile sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          className={cn("absolute inset-0 bg-ink/40 transition-opacity", open ? "opacity-100" : "opacity-0")}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-64 border-r border-line bg-white transition-transform",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <SidebarContent onNavigate={() => setOpen(false)} />
        </aside>
      </div>

      {/* main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-xl md:px-6">
          <button
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line-2 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <NavLink
              to="/admin/comments"
              className="hidden rounded-full border border-line-2 px-4 py-2 text-[13px] font-semibold text-ink hover:border-ink-3 sm:block"
            >
              Preview &amp; review
            </NavLink>
            <NavLink
              to="/admin/publish"
              className="rounded-full bg-blue px-4 py-2 text-[13px] font-semibold text-white shadow-soft hover:bg-blue-ink"
            >
              Publish
            </NavLink>
          </div>
        </header>

        <main className="mx-auto max-w-[1640px] px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>

      {/* close button for mobile drawer */}
      {open && (
        <button
          onClick={() => setOpen(false)}
          className="fixed right-4 top-4 z-50 grid h-9 w-9 place-items-center rounded-lg bg-white shadow-card lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
