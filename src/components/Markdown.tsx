import { type ReactNode } from "react";

// Minimal, safe Markdown → React renderer for blog bodies (agent-written or
// pasted-in). Supports #/##/### headings, paragraphs, unordered + ordered lists,
// blockquotes, fenced code, --- rules, images/videos `![caption](url)` (video
// files — .mp4/.webm/.mov — become players), and inline **bold**, *italic*,
// `code`, and [links](url). Renders real React nodes (never
// dangerouslySetInnerHTML) so it's injection-safe.

const VIDEO_URL = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

function Media({ src, caption, k }: { src: string; caption?: string; k: string }) {
  return (
    <figure key={k} className="my-8">
      {VIDEO_URL.test(src) ? (
        <video src={src} controls playsInline preload="metadata" className="w-full rounded-2xl border border-line shadow-soft" />
      ) : (
        <img src={src} alt={caption || ""} loading="lazy" className="w-full rounded-2xl border border-line shadow-soft" />
      )}
      {caption && <figcaption className="mt-2.5 text-center text-[13px] text-ink-3">{caption}</figcaption>}
    </figure>
  );
}

const INLINE =
  /(!\[([^\]]*)\]\s*\(([^)\s]+)\))|(\[([^\]]+)\]\s*\(([^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;

function inline(text: string, kp: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${kp}-${i++}`;
    if (m[1]) {
      // image/video inside a paragraph — inline elements only (<figure> can't
      // legally nest in <p>)
      out.push(
        VIDEO_URL.test(m[3]) ? (
          <video key={key} src={m[3]} controls playsInline preload="metadata" className="my-3 inline-block w-full rounded-xl border border-line" />
        ) : (
          <img key={key} src={m[3]} alt={m[2] || ""} loading="lazy" className="my-3 inline-block max-h-[480px] rounded-xl border border-line" />
        )
      );
    } else if (m[4]) {
      const href = m[6];
      const external = /^https?:\/\//.test(href) && !href.includes("aireastudio.ai");
      out.push(
        <a
          key={key}
          href={href}
          className="font-medium text-blue underline decoration-blue/30 underline-offset-2 transition-colors hover:decoration-blue"
          {...(external ? { target: "_blank", rel: "noopener nofollow" } : {})}
        >
          {m[5]}
        </a>
      );
    } else if (m[7]) {
      out.push(
        <strong key={key} className="font-semibold text-ink">
          {m[8]}
        </strong>
      );
    } else if (m[9]) {
      out.push(<em key={key}>{m[10]}</em>);
    } else if (m[11]) {
      out.push(
        <code key={key} className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          {m[12]}
        </code>
      );
    }
    last = INLINE.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const BLOCK_START = /^(#{1,6}\s|>|\s*[-*+]\s|\s*\d+\.\s|```|!\[)/;
const RULE = /^(-{3,}|\*{3,}|_{3,})$/;
const MEDIA_BLOCK = /^!\[([^\]]*)\]\s*\(([^)\s]+)\)\s*$/;

export function Markdown({ content }: { content: string }) {
  const lines = (content || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // fenced code
    if (line.trim().startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      blocks.push(
        <pre key={key++} className="my-6 overflow-x-auto rounded-xl bg-ink/[0.04] p-4 text-[13.5px] leading-relaxed">
          <code className="font-mono text-ink-2">{buf.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // image / video on its own line
    const media = MEDIA_BLOCK.exec(line.trim());
    if (media) {
      blocks.push(<Media key={key} k={`m${key++}`} src={media[2]} caption={media[1] || undefined} />);
      i++;
      continue;
    }

    // headings — a clearly distinct ladder: # big serif, ## smaller serif,
    // ### sans semibold, #### small sans (the article's h1 is the post title).
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const txt = h[2];
      if (level === 1)
        blocks.push(
          <h2 key={key} className="mb-5 mt-14 font-display text-[clamp(30px,3.6vw,40px)] leading-tight tracking-[-0.015em] text-ink">
            {inline(txt, `h${key++}`)}
          </h2>
        );
      else if (level === 2)
        blocks.push(
          <h3 key={key} className="mb-4 mt-11 font-display text-[clamp(23px,2.6vw,29px)] leading-tight tracking-[-0.01em] text-ink">
            {inline(txt, `h${key++}`)}
          </h3>
        );
      else if (level === 3)
        blocks.push(
          <h4 key={key} className="mb-3 mt-8 text-[19px] font-semibold text-ink">
            {inline(txt, `h${key++}`)}
          </h4>
        );
      else
        blocks.push(
          <h5 key={key} className="mb-2 mt-6 text-[15.5px] font-semibold uppercase tracking-wide text-ink-2">
            {inline(txt, `h${key++}`)}
          </h5>
        );
      i++;
      continue;
    }

    // horizontal rule
    if (RULE.test(line.trim())) {
      blocks.push(<hr key={key++} className="my-10 border-line" />);
      i++;
      continue;
    }

    // blockquote
    if (line.trim().startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={key} className="my-6 border-l-2 border-blue bg-blue-mist/40 py-2 pl-5 pr-4 text-[16.5px] italic text-ink-2">
          {inline(buf.join(" "), `q${key++}`)}
        </blockquote>
      );
      continue;
    }

    // unordered list — blank lines between items don't split the list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        if (/^\s*[-*+]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
          i++;
          continue;
        }
        if (!lines[i].trim()) {
          let j = i;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && /^\s*[-*+]\s+/.test(lines[j])) {
            i = j;
            continue;
          }
        }
        break;
      }
      const k = key++;
      blocks.push(
        <ul key={k} className="my-5 list-disc space-y-2 pl-5 marker:text-blue">
          {items.map((it, j) => (
            <li key={j} className="pl-1 text-[16.5px] leading-relaxed text-ink-2">
              {inline(it, `ul${k}-${j}`)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ordered list — survives blank lines between items and honors the typed
    // starting number, so long spaced-out lists never restart at 1
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      const startNum = parseInt(/^\s*(\d+)[.)]/.exec(line)?.[1] ?? "1", 10) || 1;
      while (i < lines.length) {
        if (/^\s*\d+[.)]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
          i++;
          continue;
        }
        if (!lines[i].trim()) {
          let j = i;
          while (j < lines.length && !lines[j].trim()) j++;
          if (j < lines.length && /^\s*\d+[.)]\s+/.test(lines[j])) {
            i = j;
            continue;
          }
        }
        break;
      }
      const k = key++;
      blocks.push(
        <ol key={k} start={startNum} className="my-5 list-decimal space-y-2 pl-5 marker:font-semibold marker:text-ink-3">
          {items.map((it, j) => (
            <li key={j} className="pl-1 text-[16.5px] leading-relaxed text-ink-2">
              {inline(it, `ol${k}-${j}`)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // paragraph — gather until a blank line or the next block
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i]) && !RULE.test(lines[i].trim())) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key} className="my-4 text-[16.5px] leading-[1.75] text-ink-2">
        {inline(buf.join(" "), `p${key++}`)}
      </p>
    );
  }

  return <>{blocks}</>;
}
