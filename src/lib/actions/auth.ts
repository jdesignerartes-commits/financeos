"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthError } from "@supabase/supabase-js";

export type AuthState = { error?: string } | undefined;

const ERROR_MESSAGES_BY_CODE: Record<string, string> = {
  over_email_send_rate_limit:
    "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente novamente.",
  user_already_exists: "Já existe uma conta com este e-mail.",
  invalid_credentials: "E-mail ou senha inválidos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar.",
  weak_password: "A senha é muito fraca. Use ao menos 6 caracteres.",
  same_password: "A nova senha precisa ser diferente da atual.",
};

function authErrorMessage(error: AuthError, fallback: string): string {
  return ERROR_MESSAGES_BY_CODE[error.code ?? ""] ?? error.message ?? fallback;
}

export async function signIn(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/overview");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: authErrorMessage(error, "E-mail ou senha inválidos.") };
  }

  redirect(redirectTo);
}

export async function signUp(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get("fullName") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback`,
    },
  });

  if (error) {
    return {
      error: authErrorMessage(error, "Não foi possível criar a conta. Verifique os dados e tente novamente."),
    };
  }

  redirect("/login?cadastro=confirme-seu-email");
}

export async function requestPasswordReset(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/callback?next=/atualizar-senha`,
  });

  if (error) {
    return { error: authErrorMessage(error, "Não foi possível enviar o e-mail de recuperação.") };
  }

  redirect("/login?recuperacao=email-enviado");
}

export async function updatePassword(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: authErrorMessage(error, "Não foi possível atualizar a senha.") };
  }

  redirect("/overview");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
