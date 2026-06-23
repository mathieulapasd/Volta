"use server";

import { z } from "zod";
import type { Tables } from "@/database.types";
import type { EmailMessage } from "@/lib/schemas";
import { unlayerDesignSchema } from "@/lib/schemas";
import { createClient } from "@/utils/supabase/server";

const uuidSchema = z.uuid();

async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
}

export async function listWorkspaces(companyId: string): Promise<Tables<"workspaces">[]> {
  const parsedCompanyId = uuidSchema.safeParse(companyId);

  if (!parsedCompanyId.success) {
    throw new Error("Invalid company id");
  }

  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("company_id", parsedCompanyId.data)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getWorkspace(id: string, companyId: string): Promise<Tables<"workspaces"> | null> {
  const parsedId = uuidSchema.safeParse(id);
  const parsedCompanyId = uuidSchema.safeParse(companyId);

  if (!parsedId.success || !parsedCompanyId.success) {
    return null;
  }

  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", parsedId.data)
    .eq("company_id", parsedCompanyId.data)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listChats(workspaceId: string, companyId: string): Promise<Tables<"chats">[]> {
  const parsedWorkspaceId = uuidSchema.safeParse(workspaceId);

  if (!parsedWorkspaceId.success) {
    throw new Error("Invalid workspace id");
  }

  const { supabase } = await requireUser();

  const workspace = await getWorkspace(parsedWorkspaceId.data, companyId);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("workspace_id", parsedWorkspaceId.data)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getChat(
  chatId: string,
  workspaceId: string,
  companyId: string
): Promise<{
  chat: Tables<"chats">;
  messages: EmailMessage[];
} | null> {
  const parsedChatId = uuidSchema.safeParse(chatId);
  const parsedWorkspaceId = uuidSchema.safeParse(workspaceId);

  if (!parsedChatId.success || !parsedWorkspaceId.success) {
    return null;
  }

  const { supabase } = await requireUser();

  const workspace = await getWorkspace(parsedWorkspaceId.data, companyId);

  if (!workspace) {
    return null;
  }

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("*")
    .eq("id", parsedChatId.data)
    .eq("workspace_id", parsedWorkspaceId.data)
    .maybeSingle();

  if (chatError) {
    throw new Error(chatError.message);
  }

  if (!chat) {
    return null;
  }

  const { data: rows, error: messagesError } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", parsedChatId.data)
    .order("created_at", { ascending: true });

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  const messages: EmailMessage[] = (rows ?? []).map((row) => ({
    id: String(row.id),
    role: row.role as "user" | "assistant",
    content: row.message,
    timestamp: row.created_at,
    authorEmail: row.author_email ?? undefined,
  }));

  return { chat, messages };
}

export async function getChatUnlayerDesign(chatId: string): Promise<unknown | null> {
  const parsedChatId = uuidSchema.safeParse(chatId);

  if (!parsedChatId.success) {
    return null;
  }

  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("chats")
    .select("unlayer_design")
    .eq("id", parsedChatId.data)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.unlayer_design) {
    return null;
  }

  const parsed = unlayerDesignSchema.safeParse(data.unlayer_design);

  return parsed.success ? parsed.data : data.unlayer_design;
}
