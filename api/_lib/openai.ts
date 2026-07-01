// OpenAI Chat Completions wrapper (function calling), model-aware. Server-only env:
//   OPENAI_API_KEY          (required)
//   OPENAI_MODEL            — broad / multi-file architecture work (default gpt-5.5)
//   OPENAI_REASONING_MODEL  — bug-hunting / algorithmic work       (default o3-mini)
//   OPENAI_REASONING_EFFORT — effort for the reasoning model        (default high)
export function openaiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-5.5";
}
export function getReasoningModel(): string {
  return process.env.OPENAI_REASONING_MODEL || "o3-mini";
}
export function getReasoningEffort(): string {
  return process.env.OPENAI_REASONING_EFFORT || "high";
}

// reasoning_effort is accepted by the o-series (o1/o3/o4) alongside function
// tools on Chat Completions; gpt-5.x rejects that combination (it requires the
// Responses API), so we only attach effort for o-series models.
const O_SERIES = /^(o1|o3|o4)/;

export async function chat(
  messages: any[],
  tools: any[],
  opts: { model?: string; reasoningEffort?: string } = {}
): Promise<any> {
  const model = opts.model || getModel();
  const body: any = { model, messages, tools, tool_choice: "auto" };
  // No temperature — reasoning models (o-series, gpt-5.x) only accept the default.
  if (opts.reasoningEffort && O_SERIES.test(model)) body.reasoning_effort = opts.reasoningEffort;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json();
}

// The model to use for live web research (web_search tool). Override with
// OPENAI_SEARCH_MODEL if the default doesn't support the tool on your account.
export function getSearchModel(): string {
  return process.env.OPENAI_SEARCH_MODEL || getModel();
}

// Pull the aggregated text + de-duped URL citations out of a Responses API result.
function extractResponse(data: any): { text: string; citations: { url: string; title?: string }[] } {
  let text = typeof data?.output_text === "string" ? data.output_text : "";
  const citations: { url: string; title?: string }[] = [];
  const seen = new Set<string>();
  for (const item of data?.output || []) {
    if (item.type === "message") {
      for (const c of item.content || []) {
        if (c.type === "output_text") {
          if (!text) text += c.text || "";
          for (const a of c.annotations || []) {
            if (a?.type === "url_citation" && a.url && !seen.has(a.url)) {
              seen.add(a.url);
              citations.push({ url: a.url, title: a.title || undefined });
            }
          }
        }
      }
    }
  }
  return { text: text.trim(), citations };
}

// Live web research via the Responses API + web_search tool. The model decides
// how many searches to run (agentic), then synthesizes — returning grounded,
// current text plus the real source URLs it cited.
export async function respondWithSearch(
  input: string,
  opts: { model?: string; instructions?: string; maxOutputTokens?: number } = {}
): Promise<{ text: string; citations: { url: string; title?: string }[] }> {
  const body: any = {
    model: opts.model || getSearchModel(),
    input,
    tools: [{ type: "web_search" }],
  };
  if (opts.instructions) body.instructions = opts.instructions;
  if (opts.maxOutputTokens) body.max_output_tokens = opts.maxOutputTokens;

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI Responses ${res.status}: ${text.slice(0, 400)}`);
  }
  return extractResponse(await res.json());
}

// Chat Completions with strict JSON-schema Structured Outputs — guarantees a
// valid object back (no fragile parsing), even with a long markdown body.
export async function completeJson(
  messages: any[],
  schema: { name: string; schema: any },
  opts: { model?: string } = {}
): Promise<any> {
  const body: any = {
    model: opts.model || getModel(),
    messages,
    response_format: { type: "json_schema", json_schema: { name: schema.name, schema: schema.schema, strict: true } },
  };
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
}

// Streaming live research + writing via the Responses API (web_search + reasoning).
// Calls onEvent(evt) for every parsed SSE event object so the caller can surface
// the agent's real working (searches, sources, reasoning, text) as it happens.
// Returns the aggregated final text + de-duped citations.
export async function streamResponses(
  input: string,
  opts: { model?: string; instructions?: string; maxOutputTokens?: number; reasoning?: boolean },
  onEvent: (evt: any) => void
): Promise<{ text: string; citations: { url: string; title?: string }[] }> {
  const body: any = {
    model: opts.model || getSearchModel(),
    input,
    tools: [{ type: "web_search" }],
    stream: true,
  };
  if (opts.instructions) body.instructions = opts.instructions;
  if (opts.maxOutputTokens) body.max_output_tokens = opts.maxOutputTokens;
  if (opts.reasoning) body.reasoning = { summary: "auto" };

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI Responses ${res.status}: ${t.slice(0, 300)}`);
  }

  const reader = (res.body as any).getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  const citations: { url: string; title?: string }[] = [];
  const seen = new Set<string>();
  const cite = (a: any) => {
    if (a?.url && !seen.has(a.url)) {
      seen.add(a.url);
      citations.push({ url: a.url, title: a.title || undefined });
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const chunks = buf.split("\n\n");
    buf = chunks.pop() || "";
    for (const chunk of chunks) {
      const dataStr = chunk
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("");
      if (!dataStr || dataStr === "[DONE]") continue;
      let evt: any;
      try {
        evt = JSON.parse(dataStr);
      } catch {
        continue;
      }
      const type = evt?.type || "";
      if (type === "response.output_text.delta" && typeof evt.delta === "string") text += evt.delta;
      if (type === "response.output_text.annotation.added") cite(evt.annotation);
      if (type === "response.completed" && evt.response) {
        for (const item of evt.response.output || [])
          for (const c of item.content || [])
            for (const a of c.annotations || []) if (a?.type === "url_citation") cite(a);
        if (!text && typeof evt.response.output_text === "string") text = evt.response.output_text;
      }
      onEvent(evt);
    }
  }
  return { text: text.trim(), citations };
}
