"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/store/useChatStore";
import { useDraftStore } from "@/lib/store/useDraftStore";

export default function ResetBuilderDialog() {
  const resetDraft = useDraftStore((s) => s.resetDraft);
  const setMessages = useChatStore((s) => s.setMessages);
  const resetTokens = useChatStore((s) => s.resetTokens);

  const handleConfirm = () => {
    resetDraft();

    setMessages([
      {
        id: Date.now().toString(),
        role: "assistant",
        content:
          "Bonjour! Je suis votre assistant de génération d'e-mail. Décrivez l'e-mail que vous souhaitez créer et je le générerai pour vous. Vous pouvez également importer des images ou les importer depuis des URL.",
        timestamp: new Date().toISOString(),
      },
    ]);

    resetTokens();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Réinitialiser
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Réinitialiser ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action va effacer l'e-mail actuel, les modifications et l'historique des messages.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Confirmer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
