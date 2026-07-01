import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  Globe,
  Lightbulb,
  Loader2,
  Pencil,
  Rocket,
  Search,
  Sparkles,
  Square,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { RobotHead } from "@/components/RobotHead";
import { logEvent } from "../activity/client";
import { streamBlogAgent, setStatus, type AdminBlogPost, type AgentEvent, type ChatMsg } from "./client";

type Trace = {
  steps: { label: string; kind?: string }[];
  searches: { query: string }[];
  sources: { url: string; title?: string }[];
  reasoning: string;
  body: string;
};

type Msg = {
  id: string;
  role: "user" | "assistant";
  content?: string;
  trace?: Trace;
  draft?: AdminBlogPost;
  error?: boolean;
  running?: boolean;
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e6)}`);
const emptyTrace = (): Trace => ({ steps: [], searches: [], sources: [], reasoning: "", body: "" });

const SUGGESTIONS = [
  "Write a post on AI email marketing for Shopify stores",
  "What AI marketing trends matter most right now? Then write about the biggest one.",
  "Draft a beginner's guide to using AI for small-business social media",
  "Research how SMBs use AI chatbots for lead gen, then write it up",
];

const domainOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};
const favicon = (u: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domainOf(u))}&sz=64`;

const STEP_ICON: Record<string, typeof Search> = { plan: Lightbulb, research: Search, write: FileText, seo: Sparkles };

export function BlogAgent({
  onDraftSaved,
  onOpen,
}: {
  onDraftSaved: (post: AdminBlogPost) => void;
  onOpen: (post: AdminBlogPost) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // live-trace plumbing: mutate a ref at token speed, flush to state on rAF
  const liveRef = useRef<Trace | null>(null);
  const runIdRef = useRef<string>("");
  const flushing = useRef(false);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const scheduleFlush = () => {
    if (flushing.current) return;
    flushing.current = true;
    requestAnimationFrame(() => {
      flushing.current = false;
      const id = runIdRef.current;
      const t = liveRef.current;
      if (!t) return;
      const snap: Trace = {
        steps: [...t.steps],
        searches: [...t.searches],
        sources: [...t.sources],
        reasoning: t.reasoning,
        body: t.body,
      };
      setMsgs((ms) => ms.map((m) => (m.id === id ? { ...m, trace: snap } : m)));
    });
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");

    const history: ChatMsg[] = [...msgs, { id: "", role: "user", content } as Msg]
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.content && !m.error)
      .map((m) => ({ role: m.role, content: m.content as string }));

    const lastDraft = [...msgs].reverse().find((m) => m.draft)?.draft?.body;

    const userMsg: Msg = { id: uid(), role: "user", content };
    const runId = uid();
    runIdRef.current = runId;
    liveRef.current = emptyTrace();
    const runMsg: Msg = { id: runId, role: "assistant", running: true, trace: liveRef.current };
    setMsgs((m) => [...m, userMsg, runMsg]);
    setBusy(true);

    const seen = new Set<string>();
    const set = (patch: Partial<Msg>) => setMsgs((ms) => ms.map((m) => (m.id === runId ? { ...m, ...patch } : m)));

    const controller = new AbortController();
    abortRef.current = controller;

    const onEvent = (e: AgentEvent) => {
      const t = liveRef.current;
      if (!t) return;
      switch (e.type) {
        case "step":
          t.steps.push({ label: e.label, kind: e.kind });
          scheduleFlush();
          break;
        case "search":
          t.searches.push({ query: e.query || "the web" });
          scheduleFlush();
          break;
        case "source":
          if (e.url && !seen.has(e.url)) {
            seen.add(e.url);
            t.sources.push({ url: e.url, title: e.title });
            scheduleFlush();
          }
          break;
        case "reasoning":
          t.reasoning += e.delta || "";
          scheduleFlush();
          break;
        case "delta":
          t.body += e.delta || "";
          scheduleFlush();
          break;
        case "draft":
          set({ draft: e.post });
          onDraftSaved(e.post);
          break;
        case "message":
          set({ content: e.content });
          break;
        case "error":
          set({ error: true, content: e.error, running: false });
          break;
        case "done":
          set({ running: false });
          break;
      }
    };

    try {
      await streamBlogAgent(history, lastDraft, onEvent, controller.signal);
      logEvent({ action: "blog.agent", category: "content", summary: `Chatted with AIREA blog agent` });
    } catch (err) {
      set({ error: true, content: (err as Error)?.message || "The agent hit a problem.", running: false });
    } finally {
      set({ running: false });
      setBusy(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setMsgs((ms) => ms.map((m) => (m.id === runIdRef.current ? { ...m, running: false } : m)));
    setBusy(false);
  };

  return (
    <div
      className="mt-5 flex w-full flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-soft"
      style={{ height: "calc(100vh - 15rem)", minHeight: 580 }}
    >
      {/* header */}
      <div className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-white to-blue-mist/40 px-5 py-4">
        <RobotHead size={38} float={false} glow={false} />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink">AIREA</div>
          <div className="truncate text-[12.5px] text-ink-3">Your content strategist — researches the live web, then writes on-brand drafts</div>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full bg-blue-mist px-3 py-1 text-[11.5px] font-semibold text-blue-ink sm:inline-flex">
          <Globe className="h-3.5 w-3.5" /> Live research
        </span>
      </div>

      {/* conversation */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4 sm:p-5">
        {msgs.length === 0 && !busy ? (
          <div className="mx-auto max-w-2xl pt-6 text-center">
            <div className="mb-4 flex justify-center">
              <RobotHead size={68} />
            </div>
            <h3 className="font-display text-[26px] tracking-[-0.01em] text-ink">What should we write about?</h3>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-ink-2">
              Ask me anything about AI + marketing. I'll research it live across the web — you'll watch every search and source — then write you a publish-ready draft.
            </p>
            <div className="mt-6 grid gap-2.5 text-left sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="group flex items-start gap-2 rounded-2xl border border-line bg-white p-3.5 text-left text-[13px] text-ink-2 transition-all hover:-translate-y-0.5 hover:border-blue/40 hover:text-ink hover:shadow-card"
                >
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" /> {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {msgs.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-blue px-3.5 py-2 text-[13.5px] text-white shadow-soft">{m.content}</div>
                </div>
              ) : (
                <div key={m.id} className="space-y-2.5">
                  {(m.running || (m.trace && (m.trace.searches.length || m.trace.body || m.trace.steps.length))) && (
                    <WorkingPanel trace={m.trace || emptyTrace()} running={!!m.running} />
                  )}
                  {m.content && (
                    <div
                      className={cn(
                        "rounded-2xl rounded-tl-sm border px-4 py-3 text-[13.5px] leading-relaxed",
                        m.error ? "border-critical/30 bg-critical/5 text-ink" : "border-line bg-white text-ink"
                      )}
                    >
                      {m.error && (
                        <div className="mb-1 flex items-center gap-1.5 text-[11.5px] font-semibold text-critical">
                          <AlertTriangle className="h-3.5 w-3.5" /> Couldn't complete that
                        </div>
                      )}
                      <div className="whitespace-pre-wrap [&_strong]:font-semibold">{renderInlineBold(m.content)}</div>
                    </div>
                  )}
                  {m.draft && <DraftCard post={m.draft} onOpen={onOpen} onSaved={onDraftSaved} />}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-line bg-white p-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            disabled={busy}
            placeholder={busy ? "AIREA is working…" : "Ask AIREA to research + write anything on AI marketing…"}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-line-2 bg-white px-3.5 py-3 text-[13.5px] text-ink outline-none placeholder:text-ink-3 focus:border-blue disabled:bg-canvas"
          />
          {busy ? (
            <button onClick={stop} title="Stop" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line-2 text-ink-2 hover:border-ink-3 hover:text-ink">
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => send(input)}
              disabled={!input.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue text-white shadow-soft hover:bg-blue-ink disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- live working panel ----------------
function WorkingPanel({ trace, running }: { trace: Trace; running: boolean }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!running) setOpen(false); // collapse once finished
  }, [running]);

  const summary = `${trace.searches.length} ${trace.searches.length === 1 ? "search" : "searches"} · ${trace.sources.length} ${
    trace.sources.length === 1 ? "source" : "sources"
  }`;

  return (
    <div className="overflow-hidden rounded-2xl border border-blue/20 bg-blue-mist/20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left"
      >
        {running ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue" /> : <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
        <span className="text-[12.5px] font-semibold text-blue-ink">{running ? "Researching & writing…" : "Research trace"}</span>
        <span className="text-[11.5px] text-ink-3">{summary}</span>
        <ChevronDown className={cn("ml-auto h-4 w-4 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-blue/15 px-4 py-3.5">
          {/* steps */}
          {trace.steps.length > 0 && (
            <div className="space-y-1.5">
              {trace.steps.map((s, i) => {
                const Icon = STEP_ICON[s.kind || ""] || Sparkles;
                const last = i === trace.steps.length - 1;
                return (
                  <div key={i} className="flex items-center gap-2 text-[12.5px] text-ink-2">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", running && last ? "text-blue" : "text-ink-3")} />
                    <span className={cn(running && last && "text-ink")}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* searches */}
          {trace.searches.length > 0 && (
            <div className="space-y-1">
              {trace.searches.map((s, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-[12px] text-ink-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-blue" />
                  <span className="truncate">{s.query}</span>
                </div>
              ))}
            </div>
          )}

          {/* sources */}
          {trace.sources.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
                <BookOpen className="h-3 w-3" /> Sources · {trace.sources.length}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {trace.sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    title={s.title || s.url}
                    className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-line bg-white px-2 py-1 text-[11.5px] text-ink-2 hover:border-blue/40 hover:text-ink"
                  >
                    <img src={favicon(s.url)} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm" loading="lazy" />
                    <span className="truncate">{domainOf(s.url)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* reasoning */}
          {trace.reasoning.trim() && (
            <div className="rounded-lg bg-white/60 px-3 py-2 text-[12px] italic leading-relaxed text-ink-3">{trace.reasoning}</div>
          )}

          {/* live writing */}
          {trace.body && <LiveBody text={trace.body} running={running} />}
        </div>
      )}
    </div>
  );
}

function LiveBody({ text, running }: { text: string; running: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (running && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text, running]);
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
        <FileText className="h-3 w-3" /> Draft {running && <span className="text-blue">· writing…</span>}
      </div>
      <div ref={ref} className="max-h-56 overflow-y-auto rounded-lg border border-line bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
        <div className="whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  );
}

function DraftCard({ post, onOpen, onSaved }: { post: AdminBlogPost; onOpen: (p: AdminBlogPost) => void; onSaved: (p: AdminBlogPost) => void }) {
  const [state, setState] = useState(post);
  const [publishing, setPublishing] = useState(false);

  const publish = async () => {
    setPublishing(true);
    try {
      const updated = await setStatus(state.id, state.status === "published" ? "draft" : "published");
      setState(updated);
      onSaved(updated);
      logEvent({
        action: updated.status === "published" ? "blog.publish" : "blog.unpublish",
        category: "content",
        target: updated.slug,
        targetType: "blog",
        summary: `${updated.status === "published" ? "Published" : "Unpublished"} blog: ${updated.title}`,
      });
    } catch {
      /* surface via list next load */
    } finally {
      setPublishing(false);
    }
  };

  const live = state.status === "published";
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="flex items-center gap-2 border-b border-line bg-canvas px-4 py-2">
        <FileText className="h-3.5 w-3.5 text-blue" />
        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">Draft ready</span>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ring-1 ring-inset",
            live ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" : "bg-amber-50 text-amber-700 ring-amber-600/20"
          )}
        >
          {state.status}
        </span>
      </div>
      <div className="p-4">
        {state.category && <div className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-blue-ink">{state.category}</div>}
        <h4 className="font-display text-[19px] leading-snug tracking-[-0.01em] text-ink">{state.title}</h4>
        {state.excerpt && <p className="mt-1.5 line-clamp-2 text-[13px] text-ink-2">{state.excerpt}</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] text-ink-3">
          <span>{state.word_count?.toLocaleString()} words</span>
          <span aria-hidden>·</span>
          <span>{state.reading_minutes} min read</span>
          {Array.isArray(state.sources) && state.sources.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>{state.sources.length} sources</span>
            </>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpen(state)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-white px-4 py-2 text-[13px] font-semibold text-ink hover:border-ink-3"
          >
            <Pencil className="h-3.5 w-3.5" /> Open & edit
          </button>
          <button
            onClick={publish}
            disabled={publishing}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold shadow-soft disabled:opacity-60",
              live ? "border border-line-2 bg-white text-ink-2 hover:border-ink-3" : "bg-blue text-white hover:bg-blue-ink"
            )}
          >
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
            {live ? "Unpublish" : "Publish"}
          </button>
          {live && (
            <a href={`/blog/${state.slug}`} target="_blank" rel="noreferrer" className="text-[12.5px] font-semibold text-blue hover:underline">
              View live ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Render **bold** spans inside the agent's short chat messages (no full markdown).
function renderInlineBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    /^\*\*[^*]+\*\*$/.test(p) ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>
  );
}
