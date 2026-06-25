import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CornerDownRight,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  MapPin,
  MessageSquarePlus,
  RotateCcw,
  Send,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import { useAdminAuth } from "../auth";
import { timeAgo } from "../lib/time";

type Comment = {
  id: string;
  page: string;
  parent_id: string | null;
  pos_x: number | null;
  pos_y: number | null;
  target_label: string | null;
  body: string;
  status: string;
  author_email: string | null;
  author_name: string | null;
  mentions: string[];
  created_at: string;
};

const PAGES = [
  { slug: "home", label: "Home", path: "/" },
  { slug: "pricing", label: "Pricing", path: "/pricing" },
  { slug: "how-it-works", label: "How it works", path: "/how-it-works" },
  { slug: "small-business", label: "Small business", path: "/small-business" },
  { slug: "ecommerce", label: "E-commerce", path: "/ecommerce" },
  { slug: "faq", label: "FAQ", path: "/faq" },
];

const nameOf = (email: string) =>
  (email.split("@")[0] || "user").replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const initials = (s: string) => (s || "?").trim().slice(0, 1).toUpperCase();

function TagRow({ team, me, value, onChange }: { team: string[]; me: string; value: string[]; onChange: (v: string[]) => void }) {
  const others = team.filter((e) => e !== me);
  if (!others.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] font-medium text-ink-3">Tag:</span>
      {others.map((e) => {
        const on = value.includes(e);
        return (
          <button
            key={e}
            onClick={() => onChange(on ? value.filter((x) => x !== e) : [...value, e])}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
              on ? "bg-blue text-white" : "border border-line-2 text-ink-2 hover:border-blue hover:text-blue"
            )}
          >
            @{nameOf(e)}
          </button>
        );
      })}
    </div>
  );
}

export function Comments() {
  const { email } = useAdminAuth();
  const me = email || "";
  const [comments, setComments] = useState<Comment[]>([]);
  const [team, setTeam] = useState<string[]>([]);
  const [page, setPage] = useState("home");
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [mineOnly, setMineOnly] = useState(false);
  const [commentMode, setCommentMode] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [fullscreen, setFullscreen] = useState(false);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftMentions, setDraftMentions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replyMentions, setReplyMentions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const handlers = useRef<{ selectPin?: (id: string) => void }>({});

  const pageMeta = PAGES.find((p) => p.slug === page)!;
  const previewSrc = `${pageMeta.path}?preview=1`;

  const load = async () => {
    if (!supabase) return;
    const { data } = await supabase.from("comments").select("*").order("created_at", { ascending: true });
    setComments((data as Comment[]) ?? []);
  };
  useEffect(() => {
    load();
    supabase?.from("admin_users").select("email").then(({ data }) => setTeam((data ?? []).map((r: any) => r.email)));
  }, []);

  const threads = useMemo(() => {
    return comments
      .filter((c) => !c.parent_id && c.page === page)
      .filter((c) => (filter === "all" ? true : filter === "open" ? c.status !== "resolved" : c.status === "resolved"))
      .filter((c) => (mineOnly ? c.mentions?.includes(me) || c.author_email === me : true))
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }, [comments, page, filter, mineOnly, me]);

  const repliesOf = (id: string) =>
    comments.filter((c) => c.parent_id === id).sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const openCount = (slug: string) =>
    comments.filter((c) => !c.parent_id && c.page === slug && c.status !== "resolved").length;

  handlers.current.selectPin = (id: string) => {
    setSelected(id);
    document.getElementById(`thread-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Inject numbered pins into the (same-origin) preview document so they scroll
  // with the content.
  useEffect(() => {
    if (!doc?.body) return;
    doc.querySelectorAll("[data-airea-pin]").forEach((el) => el.remove());
    const W = doc.documentElement.clientWidth;
    const H = doc.documentElement.scrollHeight;
    threads.forEach((t, i) => {
      if (t.pos_x == null || t.pos_y == null) return;
      const pin = doc.createElement("div");
      pin.setAttribute("data-airea-pin", t.id);
      pin.textContent = String(i + 1);
      const resolved = t.status === "resolved";
      Object.assign(pin.style, {
        position: "absolute",
        left: `${t.pos_x * W}px`,
        top: `${t.pos_y * H}px`,
        transform: "translate(-50%,-100%)",
        zIndex: "2147483646",
        width: "26px",
        height: "26px",
        borderRadius: "50% 50% 50% 3px",
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        background: resolved ? "#16a34a" : "#0047FF",
        color: "#fff",
        font: "700 12px Inter, system-ui, sans-serif",
        border: "2px solid #fff",
        boxShadow: selected === t.id ? "0 0 0 4px rgba(0,71,255,.35)" : "0 4px 12px rgba(0,0,0,.28)",
      } as CSSStyleDeclaration);
      pin.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handlers.current.selectPin?.(t.id);
      });
      doc.body.appendChild(pin);
    });
    if (pending) {
      const p = doc.createElement("div");
      p.setAttribute("data-airea-pin", "pending");
      Object.assign(p.style, {
        position: "absolute",
        left: `${pending.x * W}px`,
        top: `${pending.y * H}px`,
        transform: "translate(-50%,-100%)",
        zIndex: "2147483647",
        width: "26px",
        height: "26px",
        borderRadius: "50% 50% 50% 3px",
        background: "#0047FF",
        border: "2px dashed #fff",
        boxShadow: "0 0 0 4px rgba(0,71,255,.3)",
      } as CSSStyleDeclaration);
      doc.body.appendChild(p);
    }
  }, [doc, threads, pending, selected]);

  // Comment mode: capture clicks on the preview to place a pin.
  useEffect(() => {
    if (!doc) return;
    const onClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const W = doc.documentElement.clientWidth;
      const H = doc.documentElement.scrollHeight;
      setPending({ x: e.pageX / W, y: e.pageY / H });
      setComposerOpen(true);
      setSelected(null);
    };
    if (commentMode) {
      doc.addEventListener("click", onClick, true);
      if (doc.body) doc.body.style.cursor = "crosshair";
    }
    return () => {
      doc.removeEventListener("click", onClick, true);
      if (doc.body) doc.body.style.cursor = "";
    };
  }, [doc, commentMode]);

  const resetComposer = () => {
    setComposerOpen(false);
    setPending(null);
    setDraft("");
    setDraftMentions([]);
    setCommentMode(false);
  };

  const submitComment = async () => {
    if (!draft.trim() || !supabase) return;
    setBusy(true);
    await supabase.from("comments").insert({
      page,
      parent_id: null,
      pos_x: pending?.x ?? null,
      pos_y: pending?.y ?? null,
      body: draft.trim(),
      status: "open",
      author_email: me,
      author_name: nameOf(me),
      mentions: draftMentions,
    });
    resetComposer();
    await load();
    setBusy(false);
  };

  const submitReply = async (parent: Comment) => {
    if (!replyBody.trim() || !supabase) return;
    setBusy(true);
    await supabase.from("comments").insert({
      page: parent.page,
      parent_id: parent.id,
      body: replyBody.trim(),
      status: "open",
      author_email: me,
      author_name: nameOf(me),
      mentions: replyMentions,
    });
    setReplyBody("");
    setReplyMentions([]);
    setReplyTo(null);
    await load();
    setBusy(false);
  };

  const changeStatus = async (c: Comment, status: string) => {
    if (!supabase) return;
    await supabase.from("comments").update({ status, resolved_by: status === "resolved" ? me : null }).eq("id", c.id);
    await load();
  };

  const remove = async (c: Comment) => {
    if (!supabase || !confirm("Delete this comment and any replies?")) return;
    await supabase.from("comments").delete().eq("id", c.id);
    await load();
  };

  const SEG: { id: typeof filter; label: string }[] = [
    { id: "open", label: "Open" },
    { id: "resolved", label: "Resolved" },
    { id: "all", label: "All" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">Review</p>
          <h1 className="mt-1 font-display text-[clamp(26px,3.4vw,38px)] tracking-tight text-ink">Preview &amp; comments</h1>
          <p className="mt-1 text-[14px] text-ink-2">Pin feedback to any spot on the site, tag teammates, and resolve it before you publish.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-line-2 bg-white p-0.5">
            {SEG.map((s) => (
              <button
                key={s.id}
                onClick={() => setFilter(s.id)}
                className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors", filter === s.id ? "bg-blue text-white" : "text-ink-2 hover:text-ink")}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setMineOnly((v) => !v)}
            className={cn("rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors", mineOnly ? "border-blue bg-blue-mist text-blue-ink" : "border-line-2 text-ink-2 hover:text-ink")}
          >
            Mentioning me
          </button>
        </div>
      </div>

      {/* page tabs */}
      <div className="mt-5 flex flex-wrap gap-1 rounded-2xl border border-line bg-white p-1 w-fit">
        {PAGES.map((p) => {
          const n = openCount(p.slug);
          return (
            <button
              key={p.slug}
              onClick={() => {
                setPage(p.slug);
                setSelected(null);
                resetComposer();
              }}
              className={cn("flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[13px] font-semibold transition-colors", page === p.slug ? "bg-blue text-white" : "text-ink-2 hover:text-ink")}
            >
              {p.label}
              {n > 0 && (
                <span className={cn("rounded-full px-1.5 text-[10px] font-bold", page === p.slug ? "bg-white/25 text-white" : "bg-blue-mist text-blue-ink")}>{n}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_390px]">
        {/* preview */}
        <div
          className={cn(
            fullscreen
              ? "fixed inset-0 z-[70] bg-ink/50 p-3 backdrop-blur-sm md:p-6"
              : "lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]"
          )}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-[12.5px] font-medium text-ink-2">
                <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                <span className="truncate">Draft preview · {pageMeta.label}</span>
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex rounded-full border border-line-2 p-0.5">
                  {([["desktop", Monitor], ["mobile", Smartphone]] as const).map(([d, Icon]) => (
                    <button
                      key={d}
                      onClick={() => setDevice(d)}
                      title={d}
                      className={cn("grid h-7 w-7 place-items-center rounded-full capitalize", device === d ? "bg-blue text-white" : "text-ink-3 hover:text-ink")}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setCommentMode((v) => !v);
                    if (commentMode) resetComposer();
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                    commentMode ? "bg-blue text-white shadow-soft" : "border border-line-2 text-ink hover:border-blue hover:text-blue"
                  )}
                >
                  {commentMode ? <X className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                  {commentMode ? "Done" : "Comment"}
                </button>
                <button
                  onClick={() => setFullscreen((v) => !v)}
                  title={fullscreen ? "Exit full screen" : "Full screen"}
                  className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-ink/5 hover:text-ink"
                >
                  {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {commentMode && (
              <div className="bg-blue-mist/60 px-4 py-1.5 text-center text-[12px] font-medium text-blue-ink">
                Click anywhere on the page to pin a comment
              </div>
            )}
            <div className="relative flex flex-1 justify-center overflow-auto bg-paper">
              <div className={cn("h-full", device === "mobile" ? "w-[390px] shrink-0 border-x border-line shadow-lg" : "w-full")}>
                <iframe
                  ref={iframeRef}
                  key={previewSrc}
                  src={previewSrc}
                  title="Preview"
                  onLoad={() => setDoc(iframeRef.current?.contentDocument ?? null)}
                  className="h-full w-full border-0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* comments panel */}
        <div className="space-y-3">
          {!composerOpen && (
            <button
              onClick={() => {
                setComposerOpen(true);
                setPending(null);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-2 bg-white py-3 text-[13.5px] font-semibold text-ink-2 hover:border-blue hover:text-blue"
            >
              <MessageSquarePlus className="h-4 w-4" /> Add a comment on {pageMeta.label}
            </button>
          )}

          <AnimatePresence>
            {composerOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="rounded-2xl border border-blue/30 bg-white p-3 shadow-card"
              >
                <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-ink-3">
                  {pending ? (
                    <>
                      <MapPin className="h-3.5 w-3.5 text-blue" /> Pinned on {pageMeta.label}
                    </>
                  ) : (
                    <>General note on {pageMeta.label}</>
                  )}
                </div>
                <textarea
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="What needs changing here?"
                  className="w-full resize-y rounded-xl border border-line-2 bg-canvas px-3 py-2 text-[14px] text-ink outline-none focus:border-blue"
                />
                <div className="mt-2">
                  <TagRow team={team} me={me} value={draftMentions} onChange={setDraftMentions} />
                </div>
                <div className="mt-2.5 flex justify-end gap-2">
                  <button onClick={resetComposer} className="rounded-full border border-line-2 px-3.5 py-1.5 text-[12.5px] font-semibold text-ink hover:border-ink-3">
                    Cancel
                  </button>
                  <button
                    onClick={submitComment}
                    disabled={busy || !draft.trim()}
                    className="flex items-center gap-1.5 rounded-full bg-blue px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-blue-ink disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Comment
                  </button>
                </div>
                {!pending && !commentMode && (
                  <button
                    onClick={() => setCommentMode(true)}
                    className="mt-2 flex items-center gap-1 text-[11.5px] font-medium text-blue hover:underline"
                  >
                    <MapPin className="h-3 w-3" /> Pin it to a spot instead
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {threads.map((t, i) => {
            const replies = repliesOf(t.id);
            const resolved = t.status === "resolved";
            return (
              <div
                key={t.id}
                id={`thread-${t.id}`}
                onClick={() => setSelected(t.id)}
                className={cn(
                  "rounded-2xl border bg-white p-3.5 shadow-soft transition-shadow",
                  selected === t.id ? "border-blue ring-1 ring-blue/20" : "border-line"
                )}
              >
                <div className="flex items-start gap-2.5">
                  {t.pos_x != null ? (
                    <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white", resolved ? "bg-green-600" : "bg-blue")}>
                      {i + 1}
                    </span>
                  ) : (
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-mist text-[11px] font-bold text-blue-ink">
                      {initials(t.author_name || t.author_email || "?")}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-ink">{t.author_name || nameOf(t.author_email || "")}</span>
                      <span className="text-[11.5px] text-ink-3">{timeAgo(t.created_at)}</span>
                      {resolved && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-700">
                          <Check className="h-3 w-3" /> Resolved
                        </span>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-ink">{t.body}</p>
                    {t.mentions?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {t.mentions.map((m) => (
                          <span key={m} className="rounded-full bg-blue-mist px-2 py-0.5 text-[10.5px] font-medium text-blue-ink">@{nameOf(m)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {replies.length > 0 && (
                  <div className="mt-2.5 space-y-2 border-l-2 border-line pl-3">
                    {replies.map((r) => (
                      <div key={r.id} className="text-[13px]">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{r.author_name || nameOf(r.author_email || "")}</span>
                          <span className="text-[11px] text-ink-3">{timeAgo(r.created_at)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-ink-2">{r.body}</p>
                        {r.mentions?.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {r.mentions.map((m) => (
                              <span key={m} className="rounded-full bg-blue-mist px-1.5 py-0.5 text-[10px] font-medium text-blue-ink">@{nameOf(m)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2.5 flex items-center gap-3 text-[12px] font-semibold">
                  <button onClick={() => { setReplyTo(replyTo === t.id ? null : t.id); setReplyBody(""); setReplyMentions([]); }} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
                    <CornerDownRight className="h-3.5 w-3.5" /> Reply
                  </button>
                  <button onClick={() => changeStatus(t, resolved ? "open" : "resolved")} className={cn("inline-flex items-center gap-1", resolved ? "text-ink-2 hover:text-ink" : "text-green-700 hover:text-green-800")}>
                    {resolved ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                    {resolved ? "Reopen" : "Resolve"}
                  </button>
                  {t.author_email === me && (
                    <button onClick={() => remove(t)} className="ml-auto inline-flex items-center gap-1 text-ink-3 hover:text-critical">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {replyTo === t.id && (
                  <div className="mt-2.5 rounded-xl border border-line-2 bg-canvas p-2.5">
                    <textarea
                      autoFocus
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      rows={2}
                      placeholder={`Reply to ${t.author_name || "thread"}…`}
                      className="w-full resize-y rounded-lg border border-line-2 bg-white px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-blue"
                    />
                    <div className="mt-2">
                      <TagRow team={team} me={me} value={replyMentions} onChange={setReplyMentions} />
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <button onClick={() => setReplyTo(null)} className="rounded-full border border-line-2 px-3 py-1 text-[12px] font-semibold text-ink hover:border-ink-3">
                        Cancel
                      </button>
                      <button onClick={() => submitReply(t)} disabled={busy || !replyBody.trim()} className="flex items-center gap-1 rounded-full bg-blue px-3 py-1 text-[12px] font-semibold text-white hover:bg-blue-ink disabled:opacity-50">
                        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {threads.length === 0 && !composerOpen && (
            <div className="rounded-2xl border border-line bg-white p-8 text-center">
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-blue-mist text-blue-ink">
                <MapPin className="h-5 w-5" />
              </div>
              <p className="mt-3 text-[14px] font-semibold text-ink">No {filter === "resolved" ? "resolved" : "open"} comments on {pageMeta.label}</p>
              <p className="mt-1 text-[13px] text-ink-3">Hit “Comment”, then click anywhere on the page to pin feedback.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
