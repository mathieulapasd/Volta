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
        content: "Quel email créons-nous aujourd'hui ?",
        timestamp: new Date().toISOString(),
      },
    ]);

    resetTokens();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" className="rounded-full border border-[#FCF5CA]/30 bg-transparent px-4 text-[#FCF5CA]/70 transition-all hover:border-[#FCF5CA] hover:bg-[#FCF5CA]/10 hover:text-[#FCF5CA]">
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
