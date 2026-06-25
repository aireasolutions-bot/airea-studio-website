import { supabase } from "@/lib/supabase";
import type { AgentEdit, AgentMode, AgentStep } from "./client";

export type Attachment = { url: string; key?: string; name?: string };

export type ConvoMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: Attachment[];
  transcript?: AgentStep[];
  edits?: AgentEdit[];
  error?: boolean;
  publishedUrl?: string;
};

export type ConversationMeta = { id: string; title: string; updated_at: string };

export type Conversation = ConversationMeta & {
  messages: ConvoMessage[];
  staged: AgentEdit[];
  mode: AgentMode;
  created_at: string;
};

export function conversationsReady(): boolean {
  return !!supabase;
}

async function currentEmail(): Promise<string> {
  const { data } = await supabase!.auth.getSession();
  return data.session?.user?.email ?? "";
}

export async function listConversations(): Promise<ConversationMeta[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("agent_conversations")
    .select("id,title,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ConversationMeta[]) ?? [];
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("agent_conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Conversation) ?? null;
}

export async function createConversation(initial?: Partial<Conversation>): Promise<Conversation> {
  if (!supabase) throw new Error("Not connected to Supabase.");
  const row = {
    user_email: await currentEmail(),
    title: initial?.title ?? "New chat",
    messages: initial?.messages ?? [],
    staged: initial?.staged ?? [],
    mode: initial?.mode ?? "build",
  };
  const { data, error } = await supabase.from("agent_conversations").insert(row).select("*").single();
  if (error) throw error;
  return data as Conversation;
}

export async function saveConversation(
  id: string,
  patch: { messages?: ConvoMessage[]; staged?: AgentEdit[]; mode?: AgentMode; title?: string }
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("agent_conversations")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function renameConversation(id: string, title: string): Promise<void> {
  return saveConversation(id, { title });
}

export async function deleteConversation(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("agent_conversations").delete().eq("id", id);
  if (error) throw error;
}

// Derive a short title from the first user message of a conversation.
export function titleFrom(messages: ConvoMessage[]): string {
  const first = messages.find((m) => m.role === "user" && m.content.trim());
  if (!first) return "New chat";
  const t = first.content.trim().replace(/\s+/g, " ");
  return t.length > 48 ? t.slice(0, 48) + "…" : t;
}
