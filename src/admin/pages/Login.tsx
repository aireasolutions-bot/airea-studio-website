import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Lock, Mail, MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";
import { RobotHead } from "@/components/RobotHead";
import { useAdminAuth } from "../auth";

export function Login() {
  const nav = useNavigate();
  const { session, isAdmin } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"" | "password" | "magic">("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (session && isAdmin) nav("/admin", { replace: true });
  }, [session, isAdmin, nav]);

  const signInPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError("");
    setBusy("password");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy("");
    if (error) setError(error.message);
  };

  const sendMagic = async () => {
    if (!supabase) return;
    setError("");
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    setBusy("magic");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setBusy("");
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-canvas px-5">
      <div className="pointer-events-none absolute inset-0 bg-blue-radial" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      <div className="relative w-full max-w-[400px]">
        <div className="mb-7 flex flex-col items-center text-center">
          <RobotHead size={80} />
          <div className="mt-3">
            <Logo />
          </div>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
            Admin portal
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-white p-7 shadow-card">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-blue-mist text-blue">
                <MailCheck className="h-6 w-6" />
              </div>
              <h1 className="mt-4 font-display text-2xl text-ink">Check your email</h1>
              <p className="mt-2 text-[14px] text-ink-2">
                We sent a magic link to <span className="font-medium text-ink">{email}</span>.
                Click it to sign in.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-5 text-[13px] font-semibold text-blue hover:underline"
              >
                Use a different method
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl text-ink">Sign in</h1>
              <p className="mt-1 text-[13.5px] text-ink-2">Authorized team members only.</p>

              <form onSubmit={signInPassword} className="mt-6 space-y-3">
                <label className="flex items-center gap-2.5 rounded-xl border border-line-2 bg-canvas px-3.5 py-3 focus-within:border-blue">
                  <Mail className="h-4 w-4 shrink-0 text-ink-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@aireasolutions.com"
                    className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
                  />
                </label>
                <label className="flex items-center gap-2.5 rounded-xl border border-line-2 bg-canvas px-3.5 py-3 focus-within:border-blue">
                  <Lock className="h-4 w-4 shrink-0 text-ink-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
                  />
                </label>

                {error && <p className="text-[13px] text-critical">{error}</p>}

                <button
                  type="submit"
                  disabled={busy !== ""}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-blue py-3 text-[14px] font-semibold text-white shadow-soft transition-colors hover:bg-blue-ink disabled:opacity-60"
                >
                  {busy === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Sign in
                </button>
              </form>

              <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-ink-3">
                <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
              </div>

              <button
                onClick={sendMagic}
                disabled={busy !== ""}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-line-2 py-3 text-[14px] font-semibold text-ink transition-colors hover:border-ink-3 disabled:opacity-60"
              >
                {busy === "magic" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Email me a magic link
              </button>
            </>
          )}
        </div>
        <p className="mt-5 text-center text-[12px] text-ink-3">
          {supabase ? "Protected area · AIREA Studio" : "⚠ Supabase env not configured"}
        </p>
      </div>
    </div>
  );
}
