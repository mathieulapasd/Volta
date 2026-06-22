"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Tables } from "@/database.types";
import { authActionClient } from "@/lib/safe-action";
import { DEFAULT_CHAT_TITLE, DEFAULT_WORKSPACE_NAME } from "@/lib/workspace/defaults";

const uuidSchema = z.uuid();
const nameSchema = z.string().trim().min(1).max(200);

const idSchema = z.object({
  id: uuidSchema,
});

const renameSchema = z.object({
  id: uuidSchema,
  name: nameSchema,
});

const createWorkspaceSchema = z.object({
  name: nameSchema.optional(),
});

const workspaceIdSchema = z.object({
  workspaceId: uuidSchema,
});

const createChatSchema = workspaceIdSchema.extend({
  title: nameSchema.optional(),
});

const chatMutationSchema = z.object({
  id: uuidSchema,
  workspaceId: uuidSchema,
});

const renameChatSchema = chatMutationSchema.extend({
  title: nameSchema,
});

async function assertWorkspaceOwnership(
  supabase: Awaited<ReturnType<typeof import("@/utils/supabase/server").createClient>>,
  workspaceId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("auth_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Espace de travail introuvable");
  }
}

export const createWorkspaceAction = authActionClient
  .schema(createWorkspaceSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { data, error } = await ctx.supabase
      .from("workspaces")
      .insert({
        auth_id: ctx.user.id,
        name: parsedInput.name ?? DEFAULT_WORKSPACE_NAME,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Échec de la création");
    }

    revalidatePath("/");

    return data satisfies Tables<"workspaces">;
  });

export const renameWorkspaceAction = authActionClient.schema(renameSchema).action(async ({ parsedInput, ctx }) => {
  const { error } = await ctx.supabase
    .from("workspaces")
    .update({ name: parsedInput.name })
    .eq("id", parsedInput.id)
    .eq("auth_id", ctx.user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath(`/workspace/${parsedInput.id}`);
});

export const deleteWorkspaceAction = authActionClient.schema(idSchema).action(async ({ parsedInput, ctx }) => {
  const { error } = await ctx.supabase.from("workspaces").delete().eq("id", parsedInput.id).eq("auth_id", ctx.user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
});

export const createChatAction = authActionClient.schema(createChatSchema).action(async ({ parsedInput, ctx }) => {
  await assertWorkspaceOwnership(ctx.supabase, parsedInput.workspaceId, ctx.user.id);

  const { data, error } = await ctx.supabase
    .from("chats")
    .insert({
      workspace_id: parsedInput.workspaceId,
      auth_id: ctx.user.id,
      title: parsedInput.title ?? DEFAULT_CHAT_TITLE,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Échec de la création");
  }

  revalidatePath(`/workspace/${parsedInput.workspaceId}`);

  return data satisfies Tables<"chats">;
});

export const renameChatAction = authActionClient.schema(renameChatSchema).action(async ({ parsedInput, ctx }) => {
  const { error } = await ctx.supabase
    .from("chats")
    .update({ title: parsedInput.title })
    .eq("id", parsedInput.id)
    .eq("workspace_id", parsedInput.workspaceId)
    .eq("auth_id", ctx.user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/workspace/${parsedInput.workspaceId}`);
});

export const deleteChatAction = authActionClient.schema(chatMutationSchema).action(async ({ parsedInput, ctx }) => {
  const { error } = await ctx.supabase
    .from("chats")
    .delete()
    .eq("id", parsedInput.id)
    .eq("workspace_id", parsedInput.workspaceId)
    .eq("auth_id", ctx.user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/workspace/${parsedInput.workspaceId}`);
});
