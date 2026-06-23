import type { Route } from "next";
import { redirect } from "next/navigation";
import { listUserCompanies } from "@/app/actions/company";

export default async function HomePage() {
  const companies = await listUserCompanies();

  if (companies.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <h1 className="font-semibold text-xl">Aucune entreprise</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Votre compte n&apos;est lié à aucune entreprise. Contactez un administrateur pour obtenir un accès.
          </p>
        </div>
      </div>
    );
  }

  redirect(`/company/${companies[0].id}` as Route);
}
