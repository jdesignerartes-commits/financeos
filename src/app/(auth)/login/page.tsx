"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const INFO_MESSAGES: Record<string, string> = {
  "confirme-seu-email": "Conta criada! Confirme seu e-mail para poder entrar.",
  "email-enviado": "Enviamos um link de recuperação para o seu e-mail.",
};

const ERROR_MESSAGES: Record<string, string> = {
  "confirmacao-invalida": "Link inválido ou expirado. Solicite um novo.",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/overview";
  const info = searchParams.get("cadastro") ?? searchParams.get("recuperacao");
  const erro = searchParams.get("erro");

  const [state, formAction, isPending] = useActionState(signIn, undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="redirect" value={redirectTo} />

          {info && INFO_MESSAGES[info] && (
            <p className="rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
              {INFO_MESSAGES[info]}
            </p>
          )}
          {erro && ERROR_MESSAGES[erro] && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {ERROR_MESSAGES[erro]}
            </p>
          )}
          {state?.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link href="/recuperar-senha" className="text-xs text-muted-foreground hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link href="/registro" className="text-foreground hover:underline">
            Criar conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
