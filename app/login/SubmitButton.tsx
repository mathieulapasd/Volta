"use client";

import { Loader2 } from "lucide-react";
import type { ReactElement } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

interface SubmitButtonProps {
  formAction: (formData: FormData) => void | Promise<void>;
}

export default function SubmitButton({ formAction }: SubmitButtonProps): ReactElement {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" formAction={formAction} className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          Connexion...
        </>
      ) : (
        "Se connecter"
      )}
    </Button>
  );
}
