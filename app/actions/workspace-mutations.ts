"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Tables } from "@/database.types";
import { assertCompanyMembership, assertWorkspaceInCompany } from "@/lib/company/access";
import { authActionClient } from "@/lib/safe-action";
import { DEFAULT_CHAT_TITLE, DEFAULT_WORKSPACE_NAME } from "@/lib/workspace/defaults";

const uuidSchema = z.uuid();
const nameSchema = z.string().trim().min(1).max(200);

const companyIdSchema = z.object({
  companyId: uuidSchema,
});

const idSchema = companyIdSchema.extend({
  id: uuidSchema,
});

const renameSchema = idSchema.extend({
  name: nameSchema,
});

const createWorkspaceSchema = companyIdSchema.extend({
  name: nameSchema.optional(),
});

const createChatSchema = companyIdSchema.extend({
  workspaceId: uuidSchema,
  title: nameSchema.optional(),
});

const chatMutationSchema = companyIdSchema.extend({
  id: uuidSchema,
  workspaceId: uuidSchema,
});

const renameChatSchema = chatMutationSchema.extend({
  title: nameSchema,
});

export const createWorkspaceAction = authActionClient
  .schema(createWorkspaceSchema)
  .action(async ({ parsedInput, ctx }) => {
    await assertCompanyMembership(ctx.supabase, parsedInput.companyId, ctx.user.id);

    const { data, error } = await ctx.supabase
      .from("workspaces")
      .insert({
        company_id: parsedInput.companyId,
        auth_id: ctx.user.id,
        name: parsedInput.name ?? DEFAULT_WORKSPACE_NAME,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Échec de la création");
    }

    revalidatePath(`/company/${parsedInput.companyId}`);

    return data satisfies Tables<"workspaces">;
  });

export const renameWorkspaceAction = authActionClient.schema(renameSchema).action(async ({ parsedInput, ctx }) => {
  await assertCompanyMembership(ctx.supabase, parsedInput.companyId, ctx.user.id);

  const { error } = await ctx.supabase
    .from("workspaces")
    .update({ name: parsedInput.name })
    .eq("id", parsedInput.id)
    .eq("company_id", parsedInput.companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/company/${parsedInput.companyId}`);
  revalidatePath(`/company/${parsedInput.companyId}/workspace/${parsedInput.id}`);
});

export const deleteWorkspaceAction = authActionClient.schema(idSchema).action(async ({ parsedInput, ctx }) => {
  await assertCompanyMembership(ctx.supabase, parsedInput.companyId, ctx.user.id);

  const { error } = await ctx.supabase
    .from("workspaces")
    .delete()
    .eq("id", parsedInput.id)
    .eq("company_id", parsedInput.companyId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/company/${parsedInput.companyId}`);
});

export const createChatAction = authActionClient.schema(createChatSchema).action(async ({ parsedInput, ctx }) => {
  await assertCompanyMembership(ctx.supabase, parsedInput.companyId, ctx.user.id);
  await assertWorkspaceInCompany(ctx.supabase, parsedInput.workspaceId, parsedInput.companyId);

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

  revalidatePath(`/company/${parsedInput.companyId}/workspace/${parsedInput.workspaceId}`);

  return data satisfies Tables<"chats">;
});

export const renameChatAction = authActionClient.schema(renameChatSchema).action(async ({ parsedInput, ctx }) => {
  await assertWorkspaceInCompany(ctx.supabase, parsedInput.workspaceId, parsedInput.companyId);

  const { error } = await ctx.supabase
    .from("chats")
    .update({ title: parsedInput.title })
    .eq("id", parsedInput.id)
    .eq("workspace_id", parsedInput.workspaceId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/company/${parsedInput.companyId}/workspace/${parsedInput.workspaceId}`);
});

export const deleteChatAction = authActionClient.schema(chatMutationSchema).action(async ({ parsedInput, ctx }) => {
  await assertWorkspaceInCompany(ctx.supabase, parsedInput.workspaceId, parsedInput.companyId);

  const { error } = await ctx.supabase
    .from("chats")
    .delete()
    .eq("id", parsedInput.id)
    .eq("workspace_id", parsedInput.workspaceId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/company/${parsedInput.companyId}/workspace/${parsedInput.workspaceId}`);
});
