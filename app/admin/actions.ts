"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertSuperAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/utils/supabase/admin";

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

const createCompanySchema = z.object({
  name: z.string().trim().min(1).max(200),
});

const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(200),
  companyId: z.uuid().optional(),
});

const membershipSchema = z.object({
  userId: z.uuid(),
  companyId: z.uuid(),
});

function toResult(error: unknown): AdminActionResult {
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }

  return { ok: false, error: "Une erreur est survenue" };
}

export async function createCompanyAction(formData: FormData): Promise<AdminActionResult> {
  try {
    await assertSuperAdmin();

    const { name } = createCompanySchema.parse({ name: formData.get("name") });
    const admin = createAdminClient();

    const { error } = await admin.from("companies").insert({ name });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin");

    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function createUserAction(formData: FormData): Promise<AdminActionResult> {
  try {
    await assertSuperAdmin();

    const { email, password, companyId } = createUserSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
      companyId: formData.get("companyId") || undefined,
    });

    const admin = createAdminClient();

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error || !data.user) {
      throw new Error(error?.message ?? "Échec de la création de l'utilisateur");
    }

    if (companyId) {
      const { error: membershipError } = await admin
        .from("company_members")
        .insert({ company_id: companyId, user_id: data.user.id });

      if (membershipError) {
        throw new Error(membershipError.message);
      }
    }

    revalidatePath("/admin");

    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function addUserToCompanyAction(formData: FormData): Promise<AdminActionResult> {
  try {
    await assertSuperAdmin();

    const { userId, companyId } = membershipSchema.parse({
      userId: formData.get("userId"),
      companyId: formData.get("companyId"),
    });

    const admin = createAdminClient();

    const { error } = await admin
      .from("company_members")
      .upsert({ company_id: companyId, user_id: userId }, { onConflict: "company_id,user_id" });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/admin");

    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}

export async function moveUserToCompanyAction(formData: FormData): Promise<AdminActionResult> {
  try {
    await assertSuperAdmin();

    const { userId, companyId } = membershipSchema.parse({
      userId: formData.get("userId"),
      companyId: formData.get("companyId"),
    });

    const admin = createAdminClient();

    const { error: membershipError } = await admin
      .from("company_members")
      .upsert({ company_id: companyId, user_id: userId }, { onConflict: "company_id,user_id" });

    if (membershipError) {
      throw new Error(membershipError.message);
    }

    const { error: workspacesError } = await admin
      .from("workspaces")
      .update({ company_id: companyId })
      .eq("auth_id", userId);

    if (workspacesError) {
      throw new Error(workspacesError.message);
    }

    revalidatePath("/admin");

    return { ok: true };
  } catch (error) {
    return toResult(error);
  }
}
