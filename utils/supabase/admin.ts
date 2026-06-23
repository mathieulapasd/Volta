/** biome-ignore-all lint/style/noNonNullAssertion: supabase */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";

/**
 * Admin Supabase client that bypasses RLS, using the new Supabase secret key
 * (sb_secret_..., the replacement for the legacy service_role key). Only use
 * from the localhost super admin tooling (see lib/admin/guard.ts). Never expose
 * to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
