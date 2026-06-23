"use client";

import { type ReactElement, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type AdminActionResult,
  addUserToCompanyAction,
  createCompanyAction,
  createUserAction,
  moveUserToCompanyAction,
} from "./actions";

export interface AdminCompany {
  id: string;
  name: string;
}

export interface AdminUser {
  id: string;
  email: string;
  companyIds: string[];
}

interface AdminDashboardProps {
  companies: AdminCompany[];
  users: AdminUser[];
}

export default function AdminDashboard({ companies, users }: AdminDashboardProps): ReactElement {
  const [isPending, startTransition] = useTransition();

  const run = (
    action: (formData: FormData) => Promise<AdminActionResult>,
    formData: FormData,
    onSuccess?: () => void
  ) => {
    startTransition(async () => {
      const result = await action(formData);

      if (result.ok) {
        toast.success("Opération réussie");
        onSuccess?.();
      } else {
        toast.error(result.error ?? "Une erreur est survenue");
      }
    });
  };

  const companyNameById = (id: string): string => companies.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="font-semibold text-xl">Super Admin</h1>
        <p className="text-muted-foreground text-sm">
          Outil local de provisionnement des utilisateurs et des entreprises.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CreateCompanyForm isPending={isPending} onRun={run} />
        <CreateUserForm companies={companies} isPending={isPending} onRun={run} />
        <AddUserToCompanyForm companies={companies} users={users} isPending={isPending} onRun={run} />
        <MoveUserToCompanyForm companies={companies} users={users} isPending={isPending} onRun={run} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {users.map((user) => (
              <li key={user.id} className="flex flex-col gap-1 border-border border-b pb-2 last:border-0">
                <span className="font-medium">{user.email}</span>
                <span className="text-muted-foreground text-xs">
                  {user.companyIds.length > 0 ? user.companyIds.map(companyNameById).join(", ") : "Aucune entreprise"}
                </span>
              </li>
            ))}
            {users.length === 0 && <li className="text-muted-foreground">Aucun utilisateur.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

type RunFn = (
  action: (formData: FormData) => Promise<AdminActionResult>,
  formData: FormData,
  onSuccess?: () => void
) => void;

function CreateCompanyForm({ isPending, onRun }: { isPending: boolean; onRun: RunFn }): ReactElement {
  const [name, setName] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer une entreprise</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData();
            formData.set("name", name);
            onRun(createCompanyAction, formData, () => setName(""));
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="company-name">Nom</Label>
            <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <Button type="submit" disabled={isPending || !name.trim()}>
            Créer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateUserForm({
  companies,
  isPending,
  onRun,
}: {
  companies: AdminCompany[];
  isPending: boolean;
  onRun: RunFn;
}): ReactElement {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyId, setCompanyId] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créer un utilisateur</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData();
            formData.set("email", email);
            formData.set("password", password);
            if (companyId) {
              formData.set("companyId", companyId);
            }
            onRun(createUserAction, formData, () => {
              setEmail("");
              setPassword("");
              setCompanyId("");
            });
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="user-email">Email</Label>
            <Input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="user-password">Mot de passe</Label>
            <Input
              id="user-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="user-company">Entreprise (optionnel)</Label>
            <CompanySelect
              id="user-company"
              companies={companies}
              value={companyId}
              onChange={setCompanyId}
              allowEmpty
            />
          </div>
          <Button type="submit" disabled={isPending || !email.trim() || password.length < 6}>
            Créer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AddUserToCompanyForm({
  companies,
  users,
  isPending,
  onRun,
}: {
  companies: AdminCompany[];
  users: AdminUser[];
  isPending: boolean;
  onRun: RunFn;
}): ReactElement {
  const [userId, setUserId] = useState("");
  const [companyId, setCompanyId] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lier un utilisateur à une entreprise</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData();
            formData.set("userId", userId);
            formData.set("companyId", companyId);
            onRun(addUserToCompanyAction, formData);
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="add-user">Utilisateur</Label>
            <UserSelect id="add-user" users={users} value={userId} onChange={setUserId} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="add-company">Entreprise</Label>
            <CompanySelect id="add-company" companies={companies} value={companyId} onChange={setCompanyId} />
          </div>
          <Button type="submit" disabled={isPending || !userId || !companyId}>
            Lier
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MoveUserToCompanyForm({
  companies,
  users,
  isPending,
  onRun,
}: {
  companies: AdminCompany[];
  users: AdminUser[];
  isPending: boolean;
  onRun: RunFn;
}): ReactElement {
  const [userId, setUserId] = useState("");
  const [companyId, setCompanyId] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Déplacer un utilisateur (avec ses espaces)</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData();
            formData.set("userId", userId);
            formData.set("companyId", companyId);
            onRun(moveUserToCompanyAction, formData);
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="move-user">Utilisateur</Label>
            <UserSelect id="move-user" users={users} value={userId} onChange={setUserId} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="move-company">Entreprise cible</Label>
            <CompanySelect id="move-company" companies={companies} value={companyId} onChange={setCompanyId} />
          </div>
          <p className="text-muted-foreground text-xs">
            Tous les espaces de travail créés par cet utilisateur seront réaffectés à l&apos;entreprise cible.
          </p>
          <Button type="submit" disabled={isPending || !userId || !companyId}>
            Déplacer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CompanySelect({
  id,
  companies,
  value,
  onChange,
  allowEmpty,
}: {
  id: string;
  companies: AdminCompany[];
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}): ReactElement {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <option value="">{allowEmpty ? "Aucune" : "Sélectionner…"}</option>
      {companies.map((company) => (
        <option key={company.id} value={company.id}>
          {company.name}
        </option>
      ))}
    </select>
  );
}

function UserSelect({
  id,
  users,
  value,
  onChange,
}: {
  id: string;
  users: AdminUser[];
  value: string;
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <option value="">Sélectionner…</option>
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.email}
        </option>
      ))}
    </select>
  );
}
