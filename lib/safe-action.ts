import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSafeActionClient } from "next-safe-action";
import type { Database } from "@/database.types";
import { createClient } from "@/utils/supabase/server";

export const actionClient = createSafeActionClient({
  handleServerError(error) {
    if (error instanceof Error) {
      return error.message;
    }

    return "Une erreur est survenue";
  },
});

export const authActionClient = actionClient.use(async ({ next }) => {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Non autorisé");
  }

  return next({
    ctx: {
      supabase: supabase as SupabaseClient<Database>,
      user: user as User,
    },
  });
});
