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
