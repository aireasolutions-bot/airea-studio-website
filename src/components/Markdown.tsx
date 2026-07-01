import { type ReactNode } from "react";

// Minimal, safe Markdown → React renderer for blog bodies (our own agent's output).
// Supports #/##/### headings, paragraphs, unordered + ordered lists, blockquotes,
// fenced code, --- rules, and inline **bold**, *italic*, `code`, and [links](url).
// Renders real React nodes (never dangerouslySetInnerHTML) so it's injection-safe.

const INLINE = /(\[([^\]]+)\]\(([^)\s]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;

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
      const href = m[3];
      const external = /^https?:\/\//.test(href) && !href.includes("aireastudio.ai");
      out.push(
        <a
          key={key}
          href={href}
          className="font-medium text-blue underline decoration-blue/30 underline-offset-2 transition-colors hover:decoration-blue"
          {...(external ? { target: "_blank", rel: "noopener nofollow" } : {})}
        >
          {m[2]}
        </a>
      );
    } else if (m[4]) {
      out.push(
        <strong key={key} className="font-semibold text-ink">
          {m[5]}
        </strong>
      );
    } else if (m[6]) {
      out.push(<em key={key}>{m[7]}</em>);
    } else if (m[8]) {
      out.push(
        <code key={key} className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[0.88em] text-ink">
          {m[9]}
        </code>
      );
    }
    last = INLINE.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const BLOCK_START = /^(#{1,6}\s|>|\s*[-*+]\s|\s*\d+\.\s|```)/;
const RULE = /^(-{3,}|\*{3,}|_{3,})$/;

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

    // headings
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const txt = h[2];
      if (level <= 2)
        blocks.push(
          <h2 key={key} className="mb-4 mt-12 font-display text-[clamp(24px,3vw,32px)] tracking-[-0.01em] text-ink">
            {inline(txt, `h${key++}`)}
          </h2>
        );
      else if (level === 3)
        blocks.push(
          <h3 key={key} className="mb-3 mt-8 font-display text-[20px] text-ink">
            {inline(txt, `h${key++}`)}
          </h3>
        );
      else
        blocks.push(
          <h4 key={key} className="mb-2 mt-6 text-[16px] font-semibold text-ink">
            {inline(txt, `h${key++}`)}
          </h4>
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

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
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

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      const k = key++;
      blocks.push(
        <ol key={k} className="my-5 list-decimal space-y-2 pl-5 marker:font-semibold marker:text-ink-3">
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
