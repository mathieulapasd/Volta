import { headers } from "next/headers";

/**
 * The super admin tooling is local-only. It is enabled by the
 * SUPER_ADMIN_ENABLED env flag and only reachable from a localhost host.
 */
export async function isSuperAdminEnabled(): Promise<boolean> {
  if (process.env.SUPER_ADMIN_ENABLED !== "true") {
    return false;
  }

  const headerList = await headers();
  const host = (headerList.get("host") ?? "").split(":")[0];

  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export async function assertSuperAdmin(): Promise<void> {
  if (!(await isSuperAdminEnabled())) {
    throw new Error("Super admin tooling is disabled");
  }
}
