import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  Eye,
  Film,
  FolderOpen,
  ImageIcon,
  LifeBuoy,
  Loader2,
  Pencil,
  Plus,
  Rocket,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import { resolveAsset } from "@/content/ContentProvider";
import { Markdown } from "@/components/Markdown";
import type { FaqCategory, FaqItem } from "@/lib/faq";
import { useAdminAuth } from "../auth";
import { AssetPicker } from "../AssetPicker";
import { logEvent } from "../activity/client";

/* Help Center — the FAQ CMS.
 * Questions and categories are rows in faq_items / faq_categories, so the team
 * can add, retag, reorder, and publish without code. One question can carry
 * several category tags; the star marks it as a "Top FAQ" on the hub. Answers
 * are markdown with image/video inserts from the Asset hub. Every question
 * publishes to its own page at /faq/<slug> (great for search + AI answers). */

const SITE = "https://aireastudio.ai";

function slugify(s: string): string {
  return s.toLowerCase().replace(/[’'"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/, "");
}

export function HelpCenter() {
  const { email } = useAdminAuth();
  const [cats, setCats] = useState<FaqCategory[]>([]);
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft" | "top">("all");
  const [catFilter, setCatFilter] = useState<string>("");
  const [editing, setEditing] = useState<FaqItem | "new" | null>(null);
  const [catEditor, setCatEditor] = useState(false);

  const flash = (kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    window.setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    if (!supabase) return;
    const [c, i] = await Promise.all([
      supabase.from("faq_categories").select("*").order("sort"),
      supabase.from("faq_items").select("*").order("sort"),
    ]);
    if (c.error || i.error) setError((c.error || i.error)!.message);
    setCats((c.data as FaqCategory[]) ?? []);
    setItems((i.data as FaqItem[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    all: items.length,
    published: items.filter((i) => i.status === "published").length,
    draft: items.filter((i) => i.status === "draft").length,
    top: items.filter((i) => i.top).length,
  }), [items]);

  const visible = useMemo(() => {
    let list = items;
    if (filter === "published" || filter === "draft") list = list.filter((i) => i.status === filter);
    if (filter === "top") list = list.filter((i) => i.top);
    if (catFilter) list = list.filter((i) => i.categories.includes(catFilter));
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((i) => (i.question + " " + i.answer).toLowerCase().includes(needle));
    return [...list].sort((a, b) => a.sort - b.sort);
  }, [items, filter, catFilter, q]);

  const toggleTop = async (it: FaqItem) => {
    if (!supabase) return;
    const { error: err } = await supabase.from("faq_items").update({ top: !it.top }).eq("id", it.id);
    if (err) return flash("err", err.message);
    setItems((list) => list.map((x) => (x.id === it.id ? { ...x, top: !it.top } : x)));
  };

  const setStatus = async (it: FaqItem, status: "published" | "draft") => {
    if (!supabase) return;
    const { error: err } = await supabase.from("faq_items").update({ status, updated_at: new Date().toISOString() }).eq("id", it.id);
    if (err) return flash("err", err.message);
    setItems((list) => list.map((x) => (x.id === it.id ? { ...x, status } : x)));
    logEvent({
      action: status === "published" ? "faq.publish" : "faq.unpublish",
      category: "content",
      target: it.slug,
      targetType: "faq",
      summary: `${status === "published" ? "Published" : "Unpublished"} FAQ: ${it.question}`,
    });
    flash("ok", status === "published" ? "Published — live at /faq/" + it.slug : "Moved back to draft.");
  };

  const remove = async (it: FaqItem) => {
    if (!supabase) return;
    if (!window.confirm(`Delete "${it.question}"?${it.status === "published" ? " It is LIVE on the site." : ""}`)) return;
    const { error: err } = await supabase.from("faq_items").delete().eq("id", it.id);
    if (err) return flash("err", err.message);
    setItems((list) => list.filter((x) => x.id !== it.id));
    logEvent({ action: "faq.delete", category: "content", target: it.slug, targetType: "faq", summary: `Deleted FAQ: ${it.question}` });
    flash("ok", "Question deleted.");
  };

  const catName = (slug: string) => cats.find((c) => c.slug === slug)?.name ?? slug;

  return (
    <div className="p-6 lg:p-8">
      {/* header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <LifeBuoy className="h-6 w-6 text-blue" />
            <h1 className="font-display text-3xl text-ink">Help Center</h1>
          </div>
          <p className="mt-1.5 max-w-2xl text-[13.5px] text-ink-2">
            Every question is its own page at <span className="font-mono text-[12.5px]">/faq/&lt;slug&gt;</span> — what search engines and AI
            assistants index. Tag questions into categories (several is fine) and star the ones that belong in Top FAQs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`${SITE}/faq`} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-white px-4 py-2.5 text-[13px] font-semibold text-ink-2 hover:border-ink-3">
            <ExternalLink className="h-3.5 w-3.5" /> View live
          </a>
          <button onClick={() => setCatEditor(true)} className="inline-flex items-center gap-1.5 rounded-full border border-line-2 bg-white px-4 py-2.5 text-[13px] font-semibold text-ink-2 hover:border-ink-3">
            <FolderOpen className="h-3.5 w-3.5" /> Categories
          </button>
          <button onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 rounded-full bg-blue px-4 py-2.5 text-[13px] font-semibold text-white shadow-soft hover:bg-blue-ink">
            <Plus className="h-4 w-4" /> New question
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

      {/* filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-line-2 bg-white px-4 py-2">
          <Search className="h-4 w-4 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search questions…" className="w-48 bg-transparent text-[13.5px] outline-none placeholder:text-ink-3" />
        </div>
        {(["all", "published", "draft", "top"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "rounded-full px-3.5 py-2 text-[12.5px] font-semibold capitalize transition-colors",
              filter === t ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-line-2 hover:text-ink"
            )}
          >
            {t === "top" ? "★ Top" : t} <span className="opacity-60">({counts[t]})</span>
          </button>
        ))}
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-full border border-line-2 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-ink-2 outline-none">
          <option value="">All categories</option>
          {cats.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* list */}
      {loading ? (
        <div className="grid h-40 place-items-center text-ink-3"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {visible.length === 0 && <p className="px-5 py-10 text-center text-[13.5px] text-ink-3">Nothing matches.</p>}
          {visible.map((it) => (
            <div key={it.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-canvas/60">
              <button onClick={() => toggleTop(it)} title={it.top ? "Remove from Top FAQs" : "Mark as Top FAQ"} className="shrink-0">
                <Star className={cn("h-4.5 w-4.5 transition-colors", it.top ? "fill-amber-400 text-amber-400" : "text-line-2 hover:text-amber-300")} />
              </button>
              <button onClick={() => setEditing(it)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[14px] font-semibold text-ink">{it.question}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {it.categories.map((cs) => (
                    <span key={cs} className="rounded-full bg-blue-mist px-2 py-0.5 text-[11px] font-medium text-blue-ink">{catName(cs)}</span>
                  ))}
                </span>
              </button>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", it.status === "published" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20" : "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20")}>
                {it.status}
              </span>
              <a
                href={`${SITE}/faq/${it.slug}${it.status === "published" ? "" : "?preview=1"}`}
                target="_blank" rel="noopener" title="Open the live page"
                className="shrink-0 rounded-lg p-1.5 text-ink-3 hover:bg-ink/5 hover:text-ink"
              >
                <Eye className="h-4 w-4" />
              </a>
              <button onClick={() => setEditing(it)} className="shrink-0 rounded-lg p-1.5 text-ink-3 hover:bg-ink/5 hover:text-ink" title="Edit">
                <Pencil className="h-4 w-4" />
              </button>
              {it.status === "published" ? (
                <button onClick={() => setStatus(it, "draft")} className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold text-ink-2 hover:bg-ink/5">Unpublish</button>
              ) : (
                <button onClick={() => setStatus(it, "published")} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-ink">
                  <Rocket className="h-3 w-3" /> Publish
                </button>
              )}
              <button onClick={() => remove(it)} className="shrink-0 rounded-lg p-1.5 text-ink-3 hover:bg-red-50 hover:text-red-600" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <QuestionEditor
          item={editing === "new" ? null : editing}
          cats={cats}
          items={items}
          email={email ?? ""}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setItems((list) => {
              const i = list.findIndex((x) => x.id === saved.id);
              return i === -1 ? [...list, saved] : list.map((x) => (x.id === saved.id ? saved : x));
            });
          }}
          onFlash={flash}
        />
      )}
      {catEditor && (
        <CategoryManager cats={cats} items={items} onClose={() => setCatEditor(false)} onChanged={load} onFlash={flash} />
      )}

      {toast && (
        <div className={cn("fixed bottom-6 right-6 z-50 rounded-2xl px-5 py-3.5 text-[13.5px] font-semibold text-white shadow-lift", toast.kind === "ok" ? "bg-ink" : "bg-red-600")}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ─── question editor ─── */
function QuestionEditor({
  item, cats, items, email, onClose, onSaved, onFlash,
}: {
  item: FaqItem | null;
  cats: FaqCategory[];
  items: FaqItem[];
  email: string;
  onClose: () => void;
  onSaved: (it: FaqItem) => void;
  onFlash: (k: "ok" | "err", m: string) => void;
}) {
  const [form, setForm] = useState({
    question: item?.question ?? "",
    slug: item?.slug ?? "",
    answer: item?.answer ?? "",
    categories: item?.categories ?? ([] as string[]),
    top: item?.top ?? false,
  });
  const [slugTouched, setSlugTouched] = useState(!!item);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"write" | "preview">("write");
  const [picker, setPicker] = useState<null | "image" | "video">(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const slug = slugTouched ? form.slug : slugify(form.question);
  // one namespace for categories + questions — /faq/<slug> resolves either
  const slugTaken =
    cats.some((c) => c.slug === slug) ||
    items.some((i) => i.slug === slug && i.id !== item?.id);

  const toggleCat = (cs: string) =>
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cs) ? f.categories.filter((x) => x !== cs) : [...f.categories, cs],
    }));

  const insertMedia = (assetKey: string) => {
    const url = resolveAsset(assetKey);
    const md = `\n\n![](${url})\n\n`;
    const el = bodyRef.current;
    const pos = el ? el.selectionStart : form.answer.length;
    setForm((f) => ({ ...f, answer: f.answer.slice(0, pos) + md + f.answer.slice(pos) }));
    setView("write");
    window.setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(pos + md.length, pos + md.length);
    }, 0);
  };

  const save = async (publish?: boolean) => {
    if (!supabase) return;
    if (!form.question.trim()) return onFlash("err", "Write the question first.");
    if (!slug) return onFlash("err", "The question needs a slug.");
    if (slugTaken) return onFlash("err", "That slug is already used by another question or category.");
    if (!form.categories.length) return onFlash("err", "Tag at least one category so people can find it.");
    setSaving(true);
    try {
      const patch = {
        question: form.question.trim(),
        slug,
        answer: form.answer,
        categories: form.categories,
        top: form.top,
        updated_at: new Date().toISOString(),
        ...(publish !== undefined ? { status: publish ? "published" : "draft" } : {}),
      };
      let saved: FaqItem;
      if (item) {
        const { data, error } = await supabase.from("faq_items").update(patch).eq("id", item.id).select().single();
        if (error) throw error;
        saved = data as FaqItem;
      } else {
        const maxSort = Math.max(0, ...items.map((i) => i.sort));
        const { data, error } = await supabase
          .from("faq_items")
          .insert({ ...patch, status: publish ? "published" : "draft", sort: maxSort + 1, created_by: email })
          .select().single();
        if (error) throw error;
        saved = data as FaqItem;
      }
      onSaved(saved);
      if (publish) {
        logEvent({ action: "faq.publish", category: "content", target: saved.slug, targetType: "faq", summary: `Published FAQ: ${saved.question}` });
      }
      onFlash("ok", publish ? `Published — live at /faq/${saved.slug}` : "Saved as draft.");
      onClose();
    } catch (e: any) {
      onFlash("err", e?.message || "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-ink/30 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-3xl flex-col overflow-y-auto bg-canvas shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line bg-white px-6 py-4">
          <h2 className="font-display text-xl text-ink">{item ? "Edit question" : "New question"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-3 hover:bg-ink/5 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-5 px-6 py-6">
          <Field label="Question">
            <input value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} placeholder="How do I…?" className={inputCls} />
          </Field>

          <Field label="Page address" hint={slugTaken ? "Already in use — pick something unique." : `aireastudio.ai/faq/${slug || "…"}`} warn={slugTaken}>
            <input
              value={slug}
              onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }}
              className={cn(inputCls, "font-mono text-[13px]", slugTaken && "border-red-400")}
            />
          </Field>

          <Field label="Categories" hint="A question can live in several categories.">
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => {
                const on = form.categories.includes(c.slug);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCat(c.slug)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                      on ? "bg-blue text-white" : "bg-white text-ink-2 ring-1 ring-line-2 hover:text-ink"
                    )}
                  >
                    {on && <Check className="h-3 w-3" />} {c.name}
                  </button>
                );
              })}
            </div>
          </Field>

          <button
            onClick={() => setForm((f) => ({ ...f, top: !f.top }))}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-line-2 bg-white px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
              <Star className={cn("h-4 w-4", form.top ? "fill-amber-400 text-amber-400" : "text-ink-3")} />
              {form.top ? "Shown in Top FAQs on the help center hub" : "Not a Top FAQ"}
            </span>
            <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", form.top ? "bg-blue" : "bg-line-2")}>
              <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all", form.top ? "left-[1.1rem]" : "left-0.5")} />
            </span>
          </button>

          <Field label="Answer" hint="Markdown — headings, lists, bold, links. Insert photos & videos from the Asset hub.">
            <div className="overflow-hidden rounded-xl border border-line-2 bg-white">
              <div className="flex items-center gap-1 border-b border-line bg-canvas px-2 py-1.5">
                {(["write", "preview"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={cn("rounded-lg px-3 py-1.5 text-[12px] font-semibold capitalize", view === v ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink")}>
                    {v}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={() => setPicker("image")} title="Insert an image from the Asset hub" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 hover:bg-ink/5">
                    <ImageIcon className="h-3.5 w-3.5" /> Image
                  </button>
                  <button onClick={() => setPicker("video")} title="Insert a video from the Asset hub" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-ink-2 hover:bg-ink/5">
                    <Film className="h-3.5 w-3.5" /> Video
                  </button>
                </div>
              </div>
              {view === "write" ? (
                <textarea
                  ref={bodyRef}
                  value={form.answer}
                  onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                  rows={14}
                  placeholder={"Write the answer…\n\nShort paragraphs read best. Use ## for a section heading."}
                  className="w-full resize-y bg-white px-4 py-3 font-mono text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-ink-3"
                />
              ) : (
                <div className="min-h-[200px] px-5 py-4 text-[14.5px] leading-relaxed text-ink-2 [&_h2]:mt-4 [&_h2]:font-semibold [&_h2]:text-ink [&_p]:mb-3">
                  {form.answer.trim() ? <Markdown content={form.answer} /> : <p className="text-ink-3">Nothing to preview yet.</p>}
                </div>
              )}
            </div>
          </Field>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-white px-6 py-4">
          <div className="text-[12px] text-ink-3">
            {item ? (item.status === "published" ? "Live on the site" : "Draft — customers can't see it") : "New question"}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => save(false)} disabled={saving} className="rounded-full border border-line-2 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-ink-2 hover:border-ink-3 disabled:opacity-50">
              {saving ? "Saving…" : "Save draft"}
            </button>
            <button onClick={() => save(true)} disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-blue px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-soft hover:bg-blue-ink disabled:opacity-50">
              <Rocket className="h-4 w-4" /> {item?.status === "published" ? "Save + keep live" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      <AssetPicker
        open={picker !== null}
        kind={picker ?? "image"}
        onClose={() => setPicker(null)}
        onSelect={(assetKey) => { insertMedia(assetKey); setPicker(null); }}
      />
    </div>
  );
}

/* ─── category manager ─── */
function CategoryManager({
  cats, items, onClose, onChanged, onFlash,
}: {
  cats: FaqCategory[];
  items: FaqItem[];
  onClose: () => void;
  onChanged: () => Promise<void>;
  onFlash: (k: "ok" | "err", m: string) => void;
}) {
  const [adding, setAdding] = useState("");
  const [busy, setBusy] = useState(false);
  const count = (slug: string) => items.filter((i) => i.categories.includes(slug)).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const add = async () => {
    if (!supabase || !adding.trim()) return;
    const name = adding.trim();
    const slug = slugify(name);
    if (cats.some((c) => c.slug === slug) || items.some((i) => i.slug === slug)) return onFlash("err", "That name clashes with an existing slug.");
    setBusy(true);
    const { error } = await supabase.from("faq_categories").insert({ slug, name, sort: Math.max(0, ...cats.map((c) => c.sort)) + 1 });
    setBusy(false);
    if (error) return onFlash("err", error.message);
    setAdding("");
    await onChanged();
  };

  const patch = async (id: string, p: Partial<FaqCategory>) => {
    if (!supabase) return;
    const { error } = await supabase.from("faq_categories").update(p).eq("id", id);
    if (error) return onFlash("err", error.message);
    await onChanged();
  };

  const remove = async (c: FaqCategory) => {
    if (!supabase) return;
    const n = count(c.slug);
    if (!window.confirm(n ? `Delete "${c.name}"? ${n} question${n === 1 ? "" : "s"} will lose this tag (the questions themselves stay).` : `Delete "${c.name}"?`)) return;
    // untag first so no question points at a dead category page
    for (const it of items.filter((i) => i.categories.includes(c.slug))) {
      await supabase.from("faq_items").update({ categories: it.categories.filter((x) => x !== c.slug) }).eq("id", it.id);
    }
    const { error } = await supabase.from("faq_categories").delete().eq("id", c.id);
    if (error) return onFlash("err", error.message);
    await onChanged();
    onFlash("ok", "Category deleted.");
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const a = cats[idx], b = cats[idx + dir];
    if (!a || !b) return;
    await Promise.all([patch(a.id, { sort: b.sort }), patch(b.id, { sort: a.sort })]);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/30 p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-display text-xl text-ink">Categories</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-3 hover:bg-ink/5 hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[55vh] overflow-y-auto px-4 py-3">
          {cats.map((c, i) => (
            <div key={c.id} className="group flex items-start gap-2 rounded-xl px-2 py-2.5 hover:bg-canvas">
              <div className="flex flex-col pt-0.5">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-ink-3 disabled:opacity-20 hover:text-ink"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => move(i, 1)} disabled={i === cats.length - 1} className="text-ink-3 disabled:opacity-20 hover:text-ink"><ArrowDown className="h-3.5 w-3.5" /></button>
              </div>
              <div className="min-w-0 flex-1">
                <input
                  defaultValue={c.name}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && patch(c.id, { name: e.target.value.trim() })}
                  className="w-full bg-transparent text-[14px] font-semibold text-ink outline-none"
                />
                <input
                  defaultValue={c.description ?? ""}
                  placeholder="Short description (shows on the category card + page)"
                  onBlur={(e) => (e.target.value || "") !== (c.description || "") && patch(c.id, { description: e.target.value || null } as any)}
                  className="mt-0.5 w-full bg-transparent text-[12.5px] text-ink-3 outline-none placeholder:text-line-2"
                />
                <span className="text-[11px] text-ink-3">/faq/{c.slug} · {count(c.slug)} question{count(c.slug) === 1 ? "" : "s"}</span>
              </div>
              <button onClick={() => remove(c)} className="rounded-lg p-1.5 text-ink-3 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-line px-6 py-4">
          <input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="New category name…"
            className={inputCls}
          />
          <button onClick={add} disabled={busy || !adding.trim()} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-ink disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-line-2 bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-blue";

function Field({ label, hint, warn, children }: { label: string; hint?: string; warn?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className={cn("mt-1 block text-[11.5px]", warn ? "font-medium text-red-600" : "text-ink-3")}>{hint}</span>}
    </label>
  );
}
