import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUp,
  Boxes,
  Bug,
  Check,
  ChevronDown,
  ExternalLink,
  FileCode2,
  GitCommitHorizontal,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { RobotHead } from "@/components/RobotHead";
import { cn } from "@/lib/cn";
import { runAgent, publishEdits, type AgentEdit, type AgentMode, type AgentStep, type ChatMsg } from "../agent/client";
import { lineDiff, diffStat } from "../agent/diff";

type Role = "user" | "assistant" | "system";
type UIMessage = {
  id: string;
  role: Role;
  content: string;
  transcript?: AgentStep[];
  edits?: AgentEdit[];
  error?: boolean;
  publishedUrl?: string;
};

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e6)}`);

const SUGGESTIONS = [
  { icon: Wand2, text: "Change the homepage hero headline to something punchier" },
  { icon: Sparkles, text: "Add a 4th pricing tier called Enterprise" },
  { icon: FileCode2, text: "Make the final call-to-action section background a soft blue gradient" },
  { icon: Search, text: "Add a testimonial from a fictional happy customer to the homepage" },
];

const MODES: { id: AgentMode; label: string; model: string; icon: typeof Boxes; hint: string }[] = [
  { id: "build", label: "Build", model: "GPT-5.5", icon: Boxes, hint: "Broad, multi-file architecture & design" },
  { id: "reason", label: "Reason", model: "o3-mini · high", icon: Bug, hint: "Pinpoint bugs & algorithmic code" },
];

const WORKING_LINES = [
  "Reading your code…",
  "Finding the right files…",
  "Designing the change on-brand…",
  "Writing the code…",
  "Double-checking it stays responsive…",
];

const MSG_KEY = "airea.agent.messages";
const STAGED_KEY = "airea.agent.staged";

const stepIcon = (t: string) => (t === "edit" ? FileCode2 : t === "scan" ? Search : FileCode2);

function DiffCard({ edit }: { edit: AgentEdit }) {
  const [open, setOpen] = useState(false);
  const lines = useMemo(() => lineDiff(edit.oldContent || "", edit.content || ""), [edit]);
  const { add, del } = useMemo(() => diffStat(lines), [lines]);
  const shown = lines.slice(0, 600);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-canvas"
      >
        <FileCode2 className="h-4 w-4 shrink-0 text-blue" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-[12.5px] font-medium text-ink">{edit.path}</span>
            {edit.isNew && (
              <span className="rounded-full bg-blue-mist px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-ink">new</span>
            )}
          </div>
          {edit.summary && <div className="truncate text-[12px] text-ink-3">{edit.summary}</div>}
        </div>
        <span className="shrink-0 font-mono text-[11px] text-ink-3">
          <span className="text-emerald-600">+{add}</span> <span className="text-critical">−{del}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-line"
          >
            <pre className="max-h-[360px] overflow-auto bg-[#0c1020] p-3 text-[11.5px] leading-[1.6]">
              {shown.map((l, i) => (
                <div
                  key={i}
                  className={cn(
                    "whitespace-pre-wrap break-words px-2",
                    l.type === "add" && "bg-emerald-500/15 text-emerald-200",
                    l.type === "del" && "bg-rose-500/15 text-rose-200",
                    l.type === "ctx" && "text-slate-400"
                  )}
                >
                  <span className="mr-2 select-none opacity-50">{l.type === "add" ? "+" : l.type === "del" ? "−" : " "}</span>
                  {l.text || " "}
                </div>
              ))}
              {lines.length > shown.length && (
                <div className="px-2 py-1 text-slate-500">…{lines.length - shown.length} more lines</div>
              )}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AgentBuilder() {
  const [messages, setMessages] = useState<UIMessage[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(MSG_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [staged, setStaged] = useState<AgentEdit[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STAGED_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<AgentMode>("build");
  const [busy, setBusy] = useState(false);
  const [workingLine, setWorkingLine] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [publishOk, setPublishOk] = useState<{ url: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem(MSG_KEY, JSON.stringify(messages.slice(-40)));
  }, [messages]);
  useEffect(() => {
    localStorage.setItem(STAGED_KEY, JSON.stringify(staged));
  }, [staged]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setWorkingLine((n) => (n + 1) % WORKING_LINES.length), 1600);
    return () => clearInterval(t);
  }, [busy]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setInput("");
    setPublishOk(null);
    const userMsg: UIMessage = { id: uid(), role: "user", content };
    const history: ChatMsg[] = [...messages, userMsg]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    setMessages((m) => [...m, userMsg]);
    setBusy(true);
    setWorkingLine(0);
    try {
      const res = await runAgent(history, staged.map((e) => ({ path: e.path, content: e.content })), mode);
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          content: res.reply || "Done.",
          transcript: res.transcript,
          edits: res.edits,
        },
      ]);
      if (res.edits?.length) {
        setStaged((prev) => {
          const map = new Map(prev.map((e) => [e.path, e]));
          for (const e of res.edits) map.set(e.path, e);
          return Array.from(map.values());
        });
      }
    } catch (e) {
      setMessages((m) => [...m, { id: uid(), role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!staged.length || publishing) return;
    setPublishing(true);
    try {
      const summary =
        staged.length === 1 ? staged[0].summary || `Update ${staged[0].path}` : `Update ${staged.length} files`;
      const res = await publishEdits(staged.map((e) => ({ path: e.path, content: e.content })), summary);
      setPublishOk({ url: res.url });
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "system",
          content: `Published ${res.files} file${res.files > 1 ? "s" : ""} to ${res.branch}. Vercel is redeploying — live in ~1–2 min.`,
          publishedUrl: res.url,
        },
      ]);
      setStaged([]);
    } catch (e) {
      setMessages((m) => [...m, { id: uid(), role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setPublishing(false);
    }
  };

  const reset = () => {
    if (!confirm("Start a new chat? This clears the conversation and any unpublished changes.")) return;
    setMessages([]);
    setStaged([]);
    setPublishOk(null);
  };

  const totals = useMemo(() => {
    let add = 0;
    let del = 0;
    for (const e of staged) {
      const s = diffStat(lineDiff(e.oldContent || "", e.content || ""));
      add += s.add;
      del += s.del;
    }
    return { add, del };
  }, [staged]);

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* header */}
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-gradient-to-r from-white to-blue-mist/40 px-4 py-3">
        <div className="relative">
          <RobotHead size={42} float={false} glow={false} />
          <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white", busy ? "bg-blue animate-pulse" : "bg-emerald-500")} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[19px] leading-tight tracking-tight text-ink">AIREA · Website Builder</h1>
          <p className="truncate text-[12.5px] text-ink-2">
            Describe a change in plain language — I write the code and you publish it live.
          </p>
        </div>
        <span className="hidden items-center gap-1.5 rounded-full border border-line-2 bg-white px-2.5 py-1 font-mono text-[10.5px] text-ink-2 sm:flex">
          <GitCommitHorizontal className="h-3.5 w-3.5 text-blue" /> GitHub → Vercel
        </span>
        {!empty && (
          <button onClick={reset} title="New chat" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-ink/5 hover:text-ink">
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* conversation */}
      <div ref={scrollRef} className="mt-3 flex-1 space-y-5 overflow-y-auto rounded-2xl border border-line bg-canvas p-4 md:p-6">
        {empty && !busy && (
          <div className="grid h-full place-items-center">
            <div className="max-w-lg text-center">
              <RobotHead size={120} className="mx-auto" />
              <h2 className="mt-4 font-display text-[26px] tracking-tight text-ink">Hey, I'm AIREA 👋</h2>
              <p className="mx-auto mt-2 max-w-md text-[14.5px] text-ink-2">
                I know this whole website — every section, the design system, and how it's built. Tell me what to change and I'll write the code, show you the diff, and publish it to the live site.
              </p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.text}
                    onClick={() => send(s.text)}
                    className="group flex items-start gap-2.5 rounded-xl border border-line bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-blue/40 hover:shadow-card"
                  >
                    <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
                    <span className="text-[13px] text-ink-2 group-hover:text-ink">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {m.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-blue px-4 py-2.5 text-[14px] text-white shadow-soft">{m.content}</div>
              </div>
            ) : m.role === "system" ? (
              <div className="flex justify-center">
                <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[12.5px] font-medium text-emerald-800">
                  <Check className="h-4 w-4" /> {m.content}
                  {m.publishedUrl && (
                    <a href={m.publishedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold underline">
                      commit <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0">
                  <RobotHead size={34} float={false} glow={false} />
                </div>
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div
                    className={cn(
                      "rounded-2xl rounded-tl-sm border px-4 py-3 text-[14px] leading-relaxed",
                      m.error ? "border-critical/30 bg-critical/5 text-ink" : "border-line bg-white text-ink"
                    )}
                  >
                    {m.error && (
                      <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-critical">
                        <AlertTriangle className="h-3.5 w-3.5" /> Couldn't complete that
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>

                  {m.transcript && m.transcript.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.transcript.map((s, i) => {
                        const Icon = stepIcon(s.type);
                        return (
                          <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 font-mono text-[10.5px] text-ink-3">
                            <Icon className="h-3 w-3" /> {s.label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {m.edits && m.edits.length > 0 && (
                    <div className="space-y-1.5">
                      {m.edits.map((e) => (
                        <DiffCard key={e.path} edit={e} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {busy && (
          <div className="flex gap-3">
            <div className="mt-0.5 shrink-0">
              <span className="grid h-[34px] w-[34px] place-items-center rounded-full animate-pulse-ring">
                <RobotHead size={34} float={false} glow={false} />
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-line bg-white px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-blue" />
              <AnimatePresence mode="wait">
                <motion.span
                  key={workingLine}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-[13.5px] text-ink-2"
                >
                  {WORKING_LINES[workingLine]}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* publish bar */}
      <AnimatePresence>
        {staged.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-blue/30 bg-blue-mist/50 px-4 py-3"
          >
            <Sparkles className="h-4 w-4 text-blue" />
            <span className="text-[13.5px] font-medium text-ink">
              {staged.length} file{staged.length > 1 ? "s" : ""} ready
              <span className="ml-2 font-mono text-[12px] text-ink-3">
                <span className="text-emerald-600">+{totals.add}</span> <span className="text-critical">−{totals.del}</span>
              </span>
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  if (confirm("Discard all unpublished changes?")) setStaged([]);
                }}
                className="rounded-full border border-line-2 bg-white px-3.5 py-2 text-[13px] font-semibold text-ink hover:border-ink-3"
              >
                Discard
              </button>
              <button
                onClick={publish}
                disabled={publishing}
                className="flex items-center gap-2 rounded-full bg-blue px-4 py-2 text-[13.5px] font-semibold text-white shadow-soft hover:bg-blue-ink disabled:opacity-60"
              >
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCommitHorizontal className="h-4 w-4" />}
                {publishing ? "Publishing…" : "Publish to live"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* brain mode */}
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Brain</span>
        <div className="flex rounded-full border border-line-2 bg-white p-0.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              title={m.hint}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
                mode === m.id ? "bg-blue text-white shadow-soft" : "text-ink-2 hover:text-ink"
              )}
            >
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
              <span className={cn("font-mono text-[10px]", mode === m.id ? "text-white/75" : "text-ink-3")}>{m.model}</span>
            </button>
          ))}
        </div>
        <span className="hidden text-[12px] text-ink-3 md:block">{MODES.find((m) => m.id === mode)?.hint}</span>
      </div>

      {/* input */}
      <div className="mt-2 flex items-end gap-2 rounded-2xl border border-line bg-white p-2 shadow-soft focus-within:border-blue">
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask AIREA to change something on the site…"
          className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2.5 py-2 text-[14px] text-ink outline-none placeholder:text-ink-3"
        />
        <button
          onClick={() => send(input)}
          disabled={busy || !input.trim()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue text-white shadow-soft transition-colors hover:bg-blue-ink disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
