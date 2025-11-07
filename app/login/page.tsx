import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100svh-0px)] items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>Connectez-vous pour continuer</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="submit" formAction={login} className="w-full">
                Se connecter
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-muted-foreground text-sm">
          En continuant, vous acceptez nos Conditions d'utilisation.
        </CardFooter>
      </Card>
    </div>
  );
}
