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
  Eye,
  FileCode2,
  GitCommitHorizontal,
  Images,
  ImagePlus,
  Loader2,
  MessageSquare,
  Monitor,
  PanelLeft,
  Plus,
  RotateCcw,
  Search,
  Smartphone,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { RobotHead } from "@/components/RobotHead";
import { cn } from "@/lib/cn";
import { resolveAsset } from "@/content/ContentProvider";
import {
  runAgent,
  publishEdits,
  uploadImage,
  requestPreview,
  getPreviewStatus,
  type AgentEdit,
  type AgentMode,
  type ChatMsg,
} from "../agent/client";
import {
  conversationsReady,
  createConversation,
  deleteConversation,
  listConversations,
  loadConversation,
  saveConversation,
  titleFrom,
  type ConversationMeta,
  type ConvoMessage,
} from "../agent/conversations";
import { lineDiff, diffStat } from "../agent/diff";
import { AssetPicker } from "../AssetPicker";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 1e6)}`);

type UIAttachment = {
  id: string;
  name?: string;
  url?: string;
  key?: string;
  preview?: string;
  uploading?: boolean;
  error?: boolean;
};

const SUGGESTIONS = [
  { icon: Wand2, text: "Change the homepage hero headline to something punchier" },
  { icon: Sparkles, text: "Add a 4th pricing tier called Enterprise" },
  { icon: ImagePlus, text: "Add an image I'll attach as a full-width banner near the top" },
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

const LEGACY_MSG = "airea.agent.messages";
const LEGACY_STAGED = "airea.agent.staged";

const stepIcon = (t: string) => (t === "edit" ? FileCode2 : t === "scan" ? Search : FileCode2);

function mergeEdits(prev: AgentEdit[], next: AgentEdit[]): AgentEdit[] {
  const map = new Map(prev.map((e) => [e.path, e]));
  for (const e of next) map.set(e.path, e);
  return Array.from(map.values());
}

function relTime(iso?: string): string {
  if (!iso) return "";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d` : `${Math.floor(d / 7)}w`;
}

function DiffCard({ edit }: { edit: AgentEdit }) {
  const [open, setOpen] = useState(false);
  const lines = useMemo(() => lineDiff(edit.oldContent || "", edit.content || ""), [edit]);
  const { add, del } = useMemo(() => diffStat(lines), [lines]);
  const shown = lines.slice(0, 600);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-canvas">
        <FileCode2 className="h-4 w-4 shrink-0 text-blue" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-[12.5px] font-medium text-ink">{edit.path}</span>
            {edit.isNew && <span className="rounded-full bg-blue-mist px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-ink">new</span>}
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
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-line">
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
              {lines.length > shown.length && <div className="px-2 py-1 text-slate-500">…{lines.length - shown.length} more lines</div>}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PreviewModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  return (
    <div className="fixed inset-0 z-[70] flex bg-ink/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="m-auto flex h-[92vh] w-[95vw] max-w-[1440px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
          <span className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <Eye className="h-4 w-4 text-blue" /> Live preview
          </span>
          <span className="hidden truncate font-mono text-[11px] text-ink-3 md:block">{url.replace(/^https?:\/\//, "")}</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-full border border-line-2 bg-white p-0.5">
              <button
                onClick={() => setDevice("desktop")}
                title="Desktop"
                className={cn("grid h-7 w-8 place-items-center rounded-full", device === "desktop" ? "bg-blue text-white" : "text-ink-3 hover:text-ink")}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDevice("mobile")}
                title="Mobile"
                className={cn("grid h-7 w-8 place-items-center rounded-full", device === "mobile" ? "bg-blue text-white" : "text-ink-3 hover:text-ink")}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-line-2 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink hover:border-blue/40 hover:text-blue"
            >
              Open in new tab <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 hover:bg-ink/5 hover:text-ink">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="grid flex-1 place-items-center overflow-auto bg-canvas p-3">
          <iframe
            src={url}
            title="Live preview"
            className={cn("h-full rounded-lg border border-line bg-white shadow-soft", device === "mobile" ? "w-[390px]" : "w-full")}
          />
        </div>
        <p className="border-t border-line px-4 py-1.5 text-center text-[11px] text-ink-3">
          Preview shows a Vercel login? Enable public preview deployments in Vercel, or use “Open in new tab”.
        </p>
      </div>
    </div>
  );
}

function ConversationList({
  conversations,
  activeId,
  onNew,
  onSwitch,
  onDelete,
}: {
  conversations: ConversationMeta[];
  activeId: string | null;
  onNew: () => void;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-2">
        <button
          onClick={onNew}
          className="flex w-full items-center gap-2 rounded-xl border border-line-2 bg-white px-3 py-2.5 text-[13.5px] font-semibold text-ink shadow-soft transition-colors hover:border-blue/40 hover:text-blue"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-[12px] text-ink-3">Your chats will appear here.</p>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => onSwitch(c.id)}
              className={cn(
                "group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                c.id === activeId ? "bg-blue-mist/70 text-blue-ink" : "text-ink-2 hover:bg-ink/5 hover:text-ink"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="min-w-0 flex-1 truncate font-medium">{c.title || "New chat"}</span>
              <span className="shrink-0 text-[10.5px] text-ink-3 group-hover:hidden">{relTime(c.updated_at)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(c.id);
                }}
                title="Delete conversation"
                className="hidden shrink-0 rounded p-0.5 text-ink-3 hover:bg-critical/10 hover:text-critical group-hover:block"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function AgentBuilder() {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConvoMessage[]>([]);
  const [staged, setStaged] = useState<AgentEdit[]>([]);
  const [mode, setMode] = useState<AgentMode>("build");

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<UIAttachment[]>([]);
  const [attachMenu, setAttachMenu] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [composerErr, setComposerErr] = useState("");

  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [workingLine, setWorkingLine] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [publishOk, setPublishOk] = useState<{ url: string } | null>(null);
  const [preview, setPreview] = useState<{ state: "building" | "ready" | "error"; url?: string; sha?: string } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false); // mobile drawer

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const skipNextSave = useRef(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- boot: migrate legacy localStorage chat, then load conversations ----
  useEffect(() => {
    (async () => {
      if (!conversationsReady()) {
        setBooting(false);
        return;
      }
      try {
        let list = await listConversations();
        let legacy: { messages: ConvoMessage[]; staged: AgentEdit[] } | null = null;
        try {
          const m = JSON.parse(localStorage.getItem(LEGACY_MSG) || "[]");
          const s = JSON.parse(localStorage.getItem(LEGACY_STAGED) || "[]");
          if (Array.isArray(m) && m.length) legacy = { messages: m, staged: Array.isArray(s) ? s : [] };
        } catch {
          /* ignore */
        }

        if (legacy) {
          const c = await createConversation({
            messages: legacy.messages,
            staged: legacy.staged,
            mode: "build",
            title: titleFrom(legacy.messages),
          });
          localStorage.removeItem(LEGACY_MSG);
          localStorage.removeItem(LEGACY_STAGED);
          skipNextSave.current = true;
          setActiveId(c.id);
          setMessages(legacy.messages);
          setStaged(legacy.staged);
          list = await listConversations();
        } else if (list.length) {
          const full = await loadConversation(list[0].id);
          if (full) {
            skipNextSave.current = true;
            setActiveId(full.id);
            setMessages(full.messages || []);
            setStaged(full.staged || []);
            setMode(full.mode || "build");
          }
        }
        setConversations(list);
      } catch {
        /* degrade to in-memory */
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  // ---- debounced autosave of the active conversation ----
  useEffect(() => {
    if (!activeId || !conversationsReady()) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const t = setTimeout(async () => {
      try {
        await saveConversation(activeId, { messages: messages.slice(-60), staged, mode, title: titleFrom(messages) });
        setConversations(await listConversations());
      } catch {
        /* ignore */
      }
    }, 800);
    return () => clearTimeout(t);
  }, [messages, staged, mode, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setWorkingLine((n) => (n + 1) % WORKING_LINES.length), 1600);
    return () => clearInterval(t);
  }, [busy]);

  // ---- conversation actions ----
  const newChat = () => {
    skipNextSave.current = true;
    setActiveId(null);
    setMessages([]);
    setStaged([]);
    setPublishOk(null);
    setAttachments([]);
    setRailOpen(false);
  };

  const switchTo = async (id: string) => {
    if (id === activeId) {
      setRailOpen(false);
      return;
    }
    setRailOpen(false);
    const full = await loadConversation(id);
    if (full) {
      skipNextSave.current = true;
      setActiveId(full.id);
      setMessages(full.messages || []);
      setStaged(full.staged || []);
      setMode(full.mode || "build");
      setPublishOk(null);
      setAttachments([]);
    }
  };

  const removeConvo = async (id: string) => {
    if (!confirm("Delete this conversation? This can't be undone.")) return;
    try {
      await deleteConversation(id);
    } catch {
      /* ignore */
    }
    const next = conversations.filter((c) => c.id !== id);
    setConversations(next);
    if (id === activeId) {
      if (next.length) await switchTo(next[0].id);
      else newChat();
    }
  };

  const clearActive = () => {
    if (!messages.length && !staged.length) return;
    if (!confirm("Clear this chat? It removes the messages and any unpublished changes (the conversation stays in your list).")) return;
    setMessages([]);
    setStaged([]);
    setPublishOk(null);
  };

  // ---- attachments ----
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setComposerErr("");
    setAttachMenu(false);
    const arr = Array.from(files).slice(0, 6);
    for (const file of arr) {
      const id = uid();
      const preview = URL.createObjectURL(file);
      setAttachments((a) => [...a, { id, name: file.name, preview, uploading: true }]);
      try {
        const { url, key } = await uploadImage(file);
        setAttachments((a) => a.map((x) => (x.id === id ? { ...x, url, key, uploading: false } : x)));
      } catch (e) {
        setAttachments((a) => a.map((x) => (x.id === id ? { ...x, uploading: false, error: true } : x)));
        setComposerErr((e as Error).message);
      }
    }
  };

  const addFromAssets = (key: string) => {
    setAttachments((a) => [...a, { id: uid(), url: resolveAsset(key), key, name: key.split("/").pop() }]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((a) => {
      const hit = a.find((x) => x.id === id);
      if (hit?.preview) URL.revokeObjectURL(hit.preview);
      return a.filter((x) => x.id !== id);
    });
  };

  const uploading = attachments.some((a) => a.uploading);

  // ---- send ----
  const send = async (text: string) => {
    const content = text.trim();
    const ready = attachments.filter((a) => a.url && !a.error);
    if ((!content && !ready.length) || busy || uploading) return;

    setInput("");
    setPublishOk(null);
    setComposerErr("");
    const atts = ready.map((a) => ({ url: a.url as string, name: a.name }));
    setAttachments([]);

    let convoId = activeId;
    if (!convoId && conversationsReady()) {
      try {
        const c = await createConversation({ mode });
        convoId = c.id;
        skipNextSave.current = true; // the message-state change below will trigger the real save
        setActiveId(c.id);
        setConversations(await listConversations());
      } catch {
        /* in-memory fallback */
      }
    }

    const userMsg: ConvoMessage = { id: uid(), role: "user", content, attachments: atts.length ? atts : undefined };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setBusy(true);
    setWorkingLine(0);

    const history: ChatMsg[] = nextMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content, attachments: m.attachments }));

    try {
      const res = await runAgent(history, staged.map((e) => ({ path: e.path, content: e.content })), mode);
      setMessages((m) => [
        ...m,
        { id: uid(), role: "assistant", content: res.reply || "Done.", transcript: res.transcript, edits: res.edits },
      ]);
      if (res.edits?.length) {
        setStaged((prev) => mergeEdits(prev, res.edits));
        setPreview(null); // staged set changed → previous preview is stale
        cancelPreviewPoll();
      }
    } catch (e) {
      setMessages((m) => [...m, { id: uid(), role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const cancelPreviewPoll = () => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
  };

  const startPreview = async () => {
    if (!staged.length || preview?.state === "building") return;
    cancelPreviewPoll();
    setPreview({ state: "building" });
    try {
      const { sha } = await requestPreview(staged.map((e) => ({ path: e.path, content: e.content })));
      let tries = 0;
      const poll = async () => {
        tries++;
        try {
          const st = await getPreviewStatus(sha);
          if (st.state === "success" && st.url) {
            setPreview({ state: "ready", url: st.url, sha });
            return;
          }
          if (st.state === "failure" || st.state === "error") {
            setPreview({ state: "error", sha });
            return;
          }
        } catch {
          /* transient — keep polling */
        }
        if (tries > 60) {
          setPreview({ state: "error", sha });
          return;
        }
        previewTimer.current = setTimeout(poll, 4000);
      };
      poll();
    } catch (e) {
      setPreview({ state: "error" });
      setMessages((m) => [...m, { id: uid(), role: "assistant", content: (e as Error).message, error: true }]);
    }
  };

  // clean up the poll on unmount
  useEffect(() => () => cancelPreviewPoll(), []);

  const publish = async () => {
    if (!staged.length || publishing) return;
    setPublishing(true);
    try {
      const summary = staged.length === 1 ? staged[0].summary || `Update ${staged[0].path}` : `Update ${staged.length} files`;
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
      setPreview(null);
      cancelPreviewPoll();
    } catch (e) {
      setMessages((m) => [...m, { id: uid(), role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setPublishing(false);
    }
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
    <div className="flex h-[calc(100vh-8rem)] gap-3">
      {/* desktop conversation rail */}
      <aside className="hidden w-60 shrink-0 overflow-hidden rounded-2xl border border-line bg-canvas lg:block">
        <ConversationList conversations={conversations} activeId={activeId} onNew={newChat} onSwitch={switchTo} onDelete={removeConvo} />
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {railOpen && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ink/40" onClick={() => setRailOpen(false)} />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "tween", duration: 0.2 }}
              className="absolute inset-y-0 left-0 w-72 border-r border-line bg-canvas shadow-card"
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Chats</span>
                <button onClick={() => setRailOpen(false)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-ink/5">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-[calc(100%-3rem)]">
                <ConversationList conversations={conversations} activeId={activeId} onNew={newChat} onSwitch={switchTo} onDelete={removeConvo} />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* chat column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* header */}
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-gradient-to-r from-white to-blue-mist/40 px-4 py-3">
          <button onClick={() => setRailOpen(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-ink/5 hover:text-ink lg:hidden">
            <PanelLeft className="h-5 w-5" />
          </button>
          <div className="relative hidden sm:block">
            <RobotHead size={42} float={false} glow={false} />
            <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white", busy ? "bg-blue animate-pulse" : "bg-emerald-500")} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[19px] leading-tight tracking-tight text-ink">AIREA · Website Builder</h1>
            <p className="truncate text-[12.5px] text-ink-2">Describe a change — attach images if you like — I write the code and you publish it live.</p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-line-2 bg-white px-2.5 py-1 font-mono text-[10.5px] text-ink-2 md:flex">
            <GitCommitHorizontal className="h-3.5 w-3.5 text-blue" /> GitHub → Vercel
          </span>
          {!empty && (
            <button onClick={clearActive} title="Clear this chat" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-ink/5 hover:text-ink">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* conversation */}
        <div ref={scrollRef} className="mt-3 flex-1 space-y-5 overflow-y-auto rounded-2xl border border-line bg-canvas p-4 md:p-6">
          {booting ? (
            <div className="grid h-full place-items-center text-ink-3">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : empty && !busy ? (
            <div className="grid h-full place-items-center">
              <div className="max-w-lg text-center">
                <RobotHead size={120} className="mx-auto" />
                <h2 className="mt-4 font-display text-[26px] tracking-tight text-ink">Hey, I'm AIREA 👋</h2>
                <p className="mx-auto mt-2 max-w-md text-[14.5px] text-ink-2">
                  I know this whole website — every section, the design system, and how it's built. Tell me what to change (attach images and I'll place them), and I'll write the code, show you the diff, and publish it live.
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
          ) : (
            messages.map((m) => (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                {m.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] space-y-2">
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-2">
                          {m.attachments.map((a, i) => (
                            <a key={i} href={a.url} target="_blank" rel="noreferrer" className="block">
                              <img src={a.url} alt={a.name || "attachment"} className="h-24 w-24 rounded-xl border border-line object-cover shadow-soft" />
                            </a>
                          ))}
                        </div>
                      )}
                      {m.content && (
                        <div className="rounded-2xl rounded-br-sm bg-blue px-4 py-2.5 text-[14px] text-white shadow-soft">{m.content}</div>
                      )}
                    </div>
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
                      <div className={cn("rounded-2xl rounded-tl-sm border px-4 py-3 text-[14px] leading-relaxed", m.error ? "border-critical/30 bg-critical/5 text-ink" : "border-line bg-white text-ink")}>
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
            ))
          )}

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
                  <motion.span key={workingLine} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="text-[13.5px] text-ink-2">
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
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-blue/30 bg-blue-mist/50 px-4 py-3">
              <Sparkles className="h-4 w-4 text-blue" />
              <span className="text-[13.5px] font-medium text-ink">
                {staged.length} file{staged.length > 1 ? "s" : ""} ready
                <span className="ml-2 font-mono text-[12px] text-ink-3">
                  <span className="text-emerald-600">+{totals.add}</span> <span className="text-critical">−{totals.del}</span>
                </span>
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    if (confirm("Discard all unpublished changes?")) {
                      setStaged([]);
                      setPreview(null);
                      cancelPreviewPoll();
                    }
                  }}
                  className="rounded-full border border-line-2 bg-white px-3.5 py-2 text-[13px] font-semibold text-ink hover:border-ink-3"
                >
                  Discard
                </button>

                {preview?.state === "ready" && preview.url ? (
                  <button
                    onClick={() => setPreviewModalOpen(true)}
                    title="View the built preview inside the admin"
                    className="flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-[13px] font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <Eye className="h-4 w-4" /> Open preview
                  </button>
                ) : preview?.state === "building" ? (
                  <span
                    title="Vercel is building your preview — about a minute"
                    className="flex items-center gap-2 rounded-full border border-line-2 bg-white px-3.5 py-2 text-[13px] font-semibold text-ink-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-blue" /> Building preview…
                  </span>
                ) : preview?.state === "error" ? (
                  <button
                    onClick={startPreview}
                    className="flex items-center gap-2 rounded-full border border-critical/40 bg-critical/5 px-3.5 py-2 text-[13px] font-semibold text-critical hover:bg-critical/10"
                  >
                    <AlertTriangle className="h-4 w-4" /> Preview failed · Retry
                  </button>
                ) : (
                  <button
                    onClick={startPreview}
                    title="Build a preview of these changes before publishing"
                    className="flex items-center gap-2 rounded-full border border-line-2 bg-white px-3.5 py-2 text-[13px] font-semibold text-ink hover:border-blue/40 hover:text-blue"
                  >
                    <Eye className="h-4 w-4" /> Preview
                  </button>
                )}

                <button onClick={publish} disabled={publishing} className="flex items-center gap-2 rounded-full bg-blue px-4 py-2 text-[13.5px] font-semibold text-white shadow-soft hover:bg-blue-ink disabled:opacity-60">
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
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors", mode === m.id ? "bg-blue text-white shadow-soft" : "text-ink-2 hover:text-ink")}
              >
                <m.icon className="h-3.5 w-3.5" />
                {m.label}
                <span className={cn("font-mono text-[10px]", mode === m.id ? "text-white/75" : "text-ink-3")}>{m.model}</span>
              </button>
            ))}
          </div>
          <span className="hidden text-[12px] text-ink-3 md:block">{MODES.find((m) => m.id === mode)?.hint}</span>
        </div>

        {/* composer */}
        <div className="mt-2 rounded-2xl border border-line bg-white p-2 shadow-soft focus-within:border-blue">
          {/* attachment chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1 pb-2">
              {attachments.map((a) => (
                <div key={a.id} className="relative">
                  <img src={a.url || a.preview} alt={a.name || "attachment"} className={cn("h-14 w-14 rounded-lg border border-line object-cover", a.error && "opacity-40")} />
                  {a.uploading && (
                    <span className="absolute inset-0 grid place-items-center rounded-lg bg-white/60">
                      <Loader2 className="h-4 w-4 animate-spin text-blue" />
                    </span>
                  )}
                  {a.error && <span className="absolute inset-0 grid place-items-center rounded-lg bg-critical/10 text-critical"><AlertTriangle className="h-4 w-4" /></span>}
                  <button onClick={() => removeAttachment(a.id)} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-line bg-white text-ink-3 shadow-soft hover:text-critical">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {composerErr && <p className="px-2 pb-1.5 text-[12px] text-critical">{composerErr}</p>}

          <div className="flex items-end gap-2">
            {/* attach */}
            <div className="relative">
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
              <button
                onClick={() => setAttachMenu((o) => !o)}
                title="Attach an image"
                className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line-2 text-ink-2 transition-colors hover:border-blue/40 hover:text-blue", attachMenu && "border-blue/40 text-blue")}
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <AnimatePresence>
                {attachMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setAttachMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      className="absolute bottom-12 left-0 z-20 w-52 overflow-hidden rounded-xl border border-line bg-white p-1 shadow-card"
                    >
                      <button onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink hover:bg-canvas">
                        <ImagePlus className="h-4 w-4 text-blue" /> Upload from computer
                      </button>
                      <button onClick={() => { setAttachMenu(false); setPickerOpen(true); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-ink hover:bg-canvas">
                        <Images className="h-4 w-4 text-blue" /> Choose from assets
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

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
              disabled={busy || uploading || (!input.trim() && !attachments.some((a) => a.url && !a.error))}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue text-white shadow-soft transition-colors hover:bg-blue-ink disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <AssetPicker open={pickerOpen} kind="image" onClose={() => setPickerOpen(false)} onSelect={addFromAssets} />
      {previewModalOpen && preview?.url && <PreviewModal url={preview.url} onClose={() => setPreviewModalOpen(false)} />}
    </div>
  );
}
