// Thin OpenAI Chat Completions wrapper (function calling). Server-only env:
//   OPENAI_API_KEY (required), OPENAI_MODEL (default gpt-4.1 — set to the latest
//   model you want, e.g. a newer GPT, on the OpenAI dashboard / Vercel env).
export function openaiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4.1";
}

export async function chat(messages: any[], tools: any[]): Promise<any> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    // No temperature / max_tokens so this stays compatible across model families
    // (including reasoning models that reject those params).
    body: JSON.stringify({ model: getModel(), messages, tools, tool_choice: "auto" }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 400)}`);
  }
  return res.json();
}
