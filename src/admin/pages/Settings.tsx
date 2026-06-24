import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "../auth";
import { PageHead } from "./_Placeholder";

type Member = { id: string; email: string; role: string; full_name: string | null; created_at: string };

export function Settings() {
  const { email } = useAdminAuth();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data } = await supabase.from("admin_users").select("*").order("created_at");
      setMembers((data as Member[]) ?? []);
    })();
  }, []);

  return (
    <div>
      <PageHead eyebrow="Settings" title="Team & access" sub="Only allow-listed emails can sign in to the admin." />

      <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="text-[14px] font-semibold text-ink">Members</div>
          <button
            className="flex items-center gap-2 rounded-full border border-line-2 px-3.5 py-2 text-[13px] font-semibold text-ink-3"
            title="Adding members from the UI ships next — for now add a row to admin_users"
            disabled
          >
            <UserPlus className="h-4 w-4" /> Invite
          </button>
        </div>
        <ul className="divide-y divide-line">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-6 py-4">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-mist text-[13px] font-bold text-blue-ink">
                {m.email.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium text-ink">
                  {m.full_name ?? m.email}
                  {m.email === email && <span className="ml-2 text-[11px] text-blue">you</span>}
                </div>
                <div className="truncate text-[12.5px] text-ink-3">{m.email}</div>
              </div>
              <span className="rounded-full bg-canvas px-3 py-1 text-[11px] font-semibold capitalize text-ink-2">
                {m.role}
              </span>
            </li>
          ))}
          {members.length === 0 && (
            <li className="px-6 py-8 text-center text-[14px] text-ink-3">No members yet.</li>
          )}
        </ul>
      </div>

      <p className="mt-4 text-[13px] text-ink-3">
        To add a teammate, add their email to the <code className="rounded bg-ink/5 px-1.5 py-0.5">admin_users</code> table
        in Supabase. UI-based invites ship with the next update.
      </p>
    </div>
  );
}
