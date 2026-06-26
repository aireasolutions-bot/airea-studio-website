import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Crown,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Send,
  Shield,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { PageHead } from "./_Placeholder";
import {
  inviteMember,
  listTeam,
  removeMember,
  setMemberRole,
  type TeamMe,
  type TeamMember,
  type TeamStatus,
} from "../team/client";

function rel(iso: string | null): string {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

const STATUS: Record<TeamStatus, { label: string; dot: string; cls: string }> = {
  active: { label: "Active", dot: "bg-emerald-500", cls: "bg-emerald-50 text-emerald-700" },
  confirmed: { label: "Active", dot: "bg-emerald-500", cls: "bg-emerald-50 text-emerald-700" },
  invited: { label: "Invited", dot: "bg-amber-500", cls: "bg-amber-50 text-amber-700" },
  pending: { label: "Pending", dot: "bg-ink-3", cls: "bg-ink/5 text-ink-3" },
};

function genPassword(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const b = "abcdefghijkmnpqrstuvwxyz";
  const n = "23456789";
  const s = "!@#$%&*";
  const all = a + b + n + s;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  let out = pick(a) + pick(b) + pick(n) + pick(s);
  for (let i = 0; i < 8; i++) out += pick(all);
  return out
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

function RoleSwitch({ on, busy, onChange }: { on: boolean; busy: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onChange(!on)}
      title={on ? "Admin — can invite teammates & manage roles" : "Member — can't invite or manage roles"}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        on ? "bg-blue" : "bg-line-2"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
          on ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export function Settings() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [me, setMe] = useState<TeamMe>({ email: "", role: "member", canManage: false });
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [working, setWorking] = useState<string | null>(null); // email currently being acted on

  const refresh = async () => {
    setLoading(true);
    setLoadErr("");
    try {
      const { members, me } = await listTeam();
      setMembers(members);
      setMe(me);
    } catch (e) {
      setLoadErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const sorted = useMemo(
    () =>
      [...members].sort((a, b) => {
        const rank = (m: TeamMember) => (m.role === "owner" ? 0 : m.role === "admin" ? 1 : 2);
        if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
        if (rank(a) !== rank(b)) return rank(a) - rank(b);
        return (a.fullName || a.email).localeCompare(b.fullName || b.email);
      }),
    [members]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await inviteMember({
        email: email.trim(),
        fullName: name.trim() || undefined,
        role: inviteRole,
        password: usePassword && password ? password : undefined,
      });
      const tag = r.role ? ` as ${r.role === "admin" ? "an Admin" : "a Member"}` : "";
      const msg: Record<string, string> = {
        invited: `Invite sent to ${r.email}${tag} — they'll get an on-brand magic-link email.`,
        password: `${r.email} is set up${tag}. We emailed a sign-in link; share their password securely.`,
        password_no_email: `${r.email} is set up with a password (share it securely). The email couldn't send — they can still sign in with email + password.`,
        password_rate: `${r.email} is set up with a password (share it securely). The welcome email hit the ~2/hour limit — they can still sign in now.`,
        resent: `Sign-in link re-sent to ${r.email}.`,
        exists: `${r.email} is on the team. Couldn't send a new email right now (try again shortly).`,
      };
      setNotice({ kind: "ok", text: msg[r.mode] || `${r.email} added to the team${tag}.` });
      setEmail("");
      setName("");
      setPassword("");
      setUsePassword(false);
      setInviteRole("member");
      await refresh();
    } catch (err) {
      setNotice({ kind: "err", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const toggleRole = async (m: TeamMember, makeAdmin: boolean) => {
    setWorking(m.email);
    setNotice(null);
    try {
      await setMemberRole(m.email, makeAdmin ? "admin" : "member");
      setNotice({ kind: "ok", text: `${m.fullName || m.email} is now ${makeAdmin ? "an Admin" : "a Member"}.` });
      await refresh();
    } catch (err) {
      setNotice({ kind: "err", text: (err as Error).message });
    } finally {
      setWorking(null);
    }
  };

  const resend = async (m: TeamMember) => {
    setWorking(m.email);
    setNotice(null);
    try {
      const r = await inviteMember({ email: m.email });
      setNotice({ kind: "ok", text: `Sign-in link sent to ${r.email}.` });
      await refresh();
    } catch (err) {
      setNotice({ kind: "err", text: (err as Error).message });
    } finally {
      setWorking(null);
    }
  };

  const remove = async (m: TeamMember) => {
    if (!window.confirm(`Remove ${m.email}? They'll lose admin access immediately.`)) return;
    setWorking(m.email);
    setNotice(null);
    try {
      await removeMember(m.email);
      setNotice({ kind: "ok", text: `${m.email} removed from the team.` });
      await refresh();
    } catch (err) {
      setNotice({ kind: "err", text: (err as Error).message });
    } finally {
      setWorking(null);
    }
  };

  return (
    <div>
      <PageHead
        eyebrow="Team"
        title="Team & access"
        sub="Invite teammates and control who can administer the AIREA Studio admin. Admins can invite and manage roles; members can edit the site but not the team."
      />

      {/* Invite (admins/owner only) */}
      {!loading && me.canManage && (
        <form onSubmit={submit} className="mt-8 overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
          <div className="flex items-center gap-2 border-b border-line px-6 py-4">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-mist text-blue-ink">
              <UserPlus className="h-4 w-4" />
            </div>
            <div className="text-[14px] font-semibold text-ink">Invite a teammate</div>
          </div>

          <div className="space-y-4 p-6">
            <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@aireasolutions.com"
                  className="w-full rounded-xl border border-line-2 bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-blue"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
                  Name <span className="text-ink-3">(optional)</span>
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full rounded-xl border border-line-2 bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-blue"
                />
              </label>
            </div>

            {/* Role */}
            <div>
              <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">Role</span>
              <div className="flex max-w-xs rounded-xl border border-line-2 bg-white p-0.5">
                {(["member", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setInviteRole(r)}
                    className={cn(
                      "flex-1 rounded-lg px-3 py-2 text-[13px] font-semibold capitalize transition-colors",
                      inviteRole === r ? "bg-blue text-white shadow-soft" : "text-ink-2 hover:text-ink"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11.5px] text-ink-3">
                {inviteRole === "admin"
                  ? "Admin — can edit the site, invite teammates, and manage roles."
                  : "Member — can edit the site, but can't invite teammates or change roles."}
              </p>
            </div>

            {/* Optional starting password */}
            <div className="rounded-xl border border-line bg-canvas/60 px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={usePassword}
                  onChange={(e) => {
                    setUsePassword(e.target.checked);
                    if (e.target.checked && !password) setPassword(genPassword());
                  }}
                  className="h-4 w-4 rounded border-line-2 text-blue focus:ring-blue"
                />
                <span className="text-[13px] font-medium text-ink-2">
                  Set a starting password <span className="text-ink-3">(optional — a magic link is always sent)</span>
                </span>
              </label>
              {usePassword && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="min-w-[220px] flex-1 rounded-lg border border-line-2 bg-white px-3 py-2 font-mono text-[13px] text-ink outline-none focus:border-blue"
                  />
                  <button
                    type="button"
                    onClick={() => setPassword(genPassword())}
                    className="flex items-center gap-1.5 rounded-lg border border-line-2 px-3 py-2 text-[12.5px] font-semibold text-ink-2 hover:border-ink-3"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Generate
                  </button>
                  <span className="w-full text-[11.5px] text-ink-3">
                    Share this with them securely (it isn't included in the email).
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="flex shrink-0 items-center gap-2 rounded-full bg-blue px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-soft transition-colors hover:bg-blue-ink disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {busy ? "Sending…" : "Send invite"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Member (no-manage) banner */}
      {!loading && !me.canManage && (
        <div className="mt-8 flex items-start gap-3 rounded-3xl border border-line bg-white p-5 shadow-soft">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/5 text-ink-3">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-ink">You have Member access</div>
            <p className="mt-0.5 text-[13px] text-ink-2">
              You can edit the site, but inviting teammates and changing roles is Admin-only. Ask an owner or admin to
              enable Admin access for you.
            </p>
          </div>
        </div>
      )}

      {/* Notice */}
      {notice && (
        <div
          className={
            "mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-[13px] " +
            (notice.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-critical/10 text-critical")
          }
        >
          {notice.kind === "ok" ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0">{notice.text}</span>
          <button onClick={() => setNotice(null)} type="button" className="ml-auto shrink-0 text-current/60 hover:text-current">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Members */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            Members
            {!loading && (
              <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-semibold text-ink-3">{members.length}</span>
            )}
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-full border border-line-2 px-3 py-1.5 text-[12.5px] font-semibold text-ink-3 hover:border-ink-3 hover:text-ink"
          >
            <RefreshCw className={"h-3.5 w-3.5 " + (loading ? "animate-spin" : "")} /> Refresh
          </button>
        </div>

        {loadErr ? (
          <div className="flex items-start gap-2 px-6 py-8 text-[13px] text-critical">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {loadErr}
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 px-6 py-10 text-[14px] text-ink-3">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading team…
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {sorted.map((m) => {
              const st = STATUS[m.status];
              const canToggle = me.canManage && !m.isSuperAdmin && !m.isSelf;
              return (
                <li key={m.email} className="flex items-center gap-3 px-6 py-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-mist text-[14px] font-bold text-blue-ink">
                    {(m.fullName || m.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-medium text-ink">{m.fullName || m.email}</span>
                      {m.isSelf && <span className="text-[11px] font-semibold text-blue">you</span>}
                    </div>
                    <div className="truncate text-[12.5px] text-ink-3">
                      {m.fullName ? m.email : null}
                      {m.status === "active" && m.lastSignIn ? (
                        <span>{m.fullName ? " · " : ""}Last seen {rel(m.lastSignIn)}</span>
                      ) : m.status === "invited" ? (
                        <span>{m.fullName ? " · " : ""}Awaiting first sign-in</span>
                      ) : null}
                    </div>
                  </div>

                  {/* Role */}
                  {m.isSuperAdmin ? (
                    <span
                      title="Super admin — full access, locked"
                      className="hidden items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 sm:flex"
                    >
                      <Crown className="h-3 w-3" /> Owner
                    </span>
                  ) : canToggle ? (
                    <div className="flex items-center gap-2">
                      <span className={cn("hidden text-[11px] font-semibold sm:inline", m.role === "admin" ? "text-blue" : "text-ink-3")}>
                        Admin
                      </span>
                      <RoleSwitch on={m.role === "admin"} busy={working === m.email} onChange={(v) => toggleRole(m, v)} />
                    </div>
                  ) : (
                    <span
                      className={cn(
                        "hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:flex",
                        m.role === "admin" ? "bg-blue-mist/60 text-blue-ink" : "bg-ink/5 text-ink-2"
                      )}
                    >
                      <Shield className="h-3 w-3" /> {m.role === "admin" ? "Admin" : "Member"}
                    </span>
                  )}

                  {/* Status */}
                  <span className={"flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold " + st.cls}>
                    <span className={"h-1.5 w-1.5 rounded-full " + st.dot} />
                    {st.label}
                  </span>

                  {/* Actions (admins/owner only) */}
                  {me.canManage && (
                    <div className="flex items-center gap-1">
                      {m.status !== "active" && (
                        <button
                          onClick={() => resend(m)}
                          disabled={working === m.email}
                          title="Resend sign-in email"
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-ink/5 hover:text-ink disabled:opacity-50"
                        >
                          {working === m.email ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        </button>
                      )}
                      {!m.isSelf && !m.isSuperAdmin && (
                        <button
                          onClick={() => remove(m)}
                          disabled={working === m.email}
                          title="Remove access"
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-critical/10 hover:text-critical disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
            {members.length === 0 && (
              <li className="px-6 py-10 text-center text-[14px] text-ink-3">No members yet.</li>
            )}
          </ul>
        )}
      </div>

      {!loading && me.canManage && (
        <p className="mt-4 flex items-start gap-1.5 text-[12px] text-ink-3">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Emails are sent from Supabase's shared sender (about 2/hour). For higher volume, add a custom SMTP provider
          (e.g. Resend) in Supabase → Auth → SMTP and I'll wire it up.
        </p>
      )}
    </div>
  );
}
