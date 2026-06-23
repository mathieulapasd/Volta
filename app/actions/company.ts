"use server";

import { z } from "zod";
import type { Tables } from "@/database.types";
import { createClient } from "@/utils/supabase/server";

const uuidSchema = z.uuid();

async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Non autorisé");
  }

  return { supabase, user };
}

export async function listUserCompanies(): Promise<Tables<"companies">[]> {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase.from("company_members").select("companies(*)").eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  const companies = (data ?? [])
    .map((row) => row.companies)
    .filter((company): company is Tables<"companies"> => company !== null);

  companies.sort((a, b) => a.name.localeCompare(b.name));

  return companies;
}

export async function getCompany(id: string): Promise<Tables<"companies"> | null> {
  const parsedId = uuidSchema.safeParse(id);

  if (!parsedId.success) {
    return null;
  }

  const { supabase } = await requireUser();

  const { data, error } = await supabase.from("companies").select("*").eq("id", parsedId.data).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
