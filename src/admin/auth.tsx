import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  email: string | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  session: null,
  email: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export const useAdminAuth = () => useContext(AuthCtx);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;

    const resolve = async (s: Session | null) => {
      if (!active) return;
      setSession(s);
      const email = s?.user?.email;
      if (email) {
        const { data } = await supabase!
          .from("admin_users")
          .select("email")
          .eq("email", email)
          .maybeSingle();
        if (active) setIsAdmin(Boolean(data));
      } else {
        setIsAdmin(false);
      }
      if (active) setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => resolve(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => resolve(s));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase?.auth.signOut();
    setSession(null);
    setIsAdmin(false);
  };

  return (
    <AuthCtx.Provider
      value={{ session, email: session?.user?.email ?? null, isAdmin, loading, signOut }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function AdminBoot() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas">
      <div className="flex flex-col items-center gap-3">
        <img src="/assets/robot/head.png" alt="" className="h-14 w-auto animate-float-y" />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/2 animate-[marquee_1s_linear_infinite] bg-blue" />
        </div>
      </div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isAdmin, loading, signOut } = useAdminAuth();
  const loc = useLocation();

  if (loading) return <AdminBoot />;
  if (!session) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-6">
        <div className="max-w-sm rounded-3xl border border-line bg-white p-8 text-center shadow-card">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-critical/10 text-critical">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 font-display text-2xl text-ink">Not authorized</h1>
          <p className="mt-2 text-[14px] text-ink-2">
            <span className="font-medium text-ink">{session.user.email}</span> isn't on the
            admin allow-list. Ask an owner to add you.
          </p>
          <button
            onClick={signOut}
            className="mt-5 rounded-full border border-line-2 px-5 py-2.5 text-[14px] font-semibold text-ink hover:border-ink-3"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
