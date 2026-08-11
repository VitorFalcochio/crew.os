"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const credentialsSchema = z.object({ email: z.email(), password: z.string().min(8).max(128) });
const signupSchema = credentialsSchema.extend({ name: z.string().trim().min(2).max(100) });
const ownerPasswordSchema = z.object({ password: z.string().min(8).max(128) });

function messagePath(path: string, key: "error" | "message", message: string) { return `${path}?${key}=${encodeURIComponent(message)}`; }
function safeNext(value: FormDataEntryValue | null, fallback: string) { const path = typeof value === "string" ? value : fallback; return path.startsWith("/") && !path.startsWith("//") ? path : fallback; }

export async function login(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/central");
  const result = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) redirect(messagePath("/login", "error", "Informe um e-mail válido e uma senha com pelo menos 8 caracteres."));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);
  if (error) redirect(messagePath("/login", "error", "E-mail ou senha incorretos."));
  redirect(safeNext(formData.get("next"), "/central"));
}

export async function loginOwnerWithPassword(formData: FormData) {
  if (!isSupabaseConfigured()) redirect(messagePath("/acesso", "error", "O acesso seguro ainda não foi configurado."));
  const ownerEmail = process.env.CREWOS_OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail || !z.email().safeParse(ownerEmail).success) redirect(messagePath("/acesso", "error", "Configure o e-mail proprietário no servidor."));
  const result = ownerPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) redirect(messagePath("/acesso", "error", "Informe uma senha válida."));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: ownerEmail, password: result.data.password });
  if (error || !data.user) redirect(messagePath("/acesso", "error", "Senha incorreta."));
  const { data: membership, error: membershipError } = await supabase.from("organization_members").select("role").eq("user_id", data.user.id).in("role", ["owner", "admin"]).limit(1).maybeSingle();
  if (membershipError || !membership) {
    await supabase.auth.signOut();
    redirect(messagePath("/acesso", "error", "Esta conta não possui acesso administrativo ao painel."));
  }
  redirect(safeNext(formData.get("next"), "/central"));
}

export async function signup(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/onboarding");
  const result = signupSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) redirect(messagePath("/cadastro", "error", "Revise os dados. A senha deve ter pelo menos 8 caracteres."));
  const headerStore = await headers();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? headerStore.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email: result.data.email, password: result.data.password, options: { data: { full_name: result.data.name }, emailRedirectTo: `${origin}/auth/callback?next=/onboarding` } });
  if (error) redirect(messagePath("/cadastro", "error", error.message));
  if (!data.session) redirect(messagePath("/login", "message", "Conta criada. Confirme seu e-mail para continuar."));
  redirect("/onboarding");
}

export async function recoverPassword(formData: FormData) {
  if (!isSupabaseConfigured()) redirect(messagePath("/recuperar", "message", "Modo demo: nenhuma mensagem foi enviada."));
  const parsed = z.object({ email: z.email() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath("/recuperar", "error", "Informe um e-mail válido."));
  const headerStore = await headers();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? headerStore.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${origin}/auth/callback?next=/nova-senha` });
  if (error) redirect(messagePath("/recuperar", "error", "Não foi possível enviar as instruções."));
  redirect(messagePath("/recuperar", "message", "Se esse e-mail estiver cadastrado, enviaremos as instruções."));
}

export async function updatePassword(formData: FormData) {
  if (!isSupabaseConfigured()) redirect("/login");
  const parsed = z.object({ password: z.string().min(8).max(128), confirmation: z.string() }).refine((value) => value.password === value.confirmation, { message: "As senhas não coincidem" }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath("/nova-senha", "error", "Use pelo menos 8 caracteres e confirme a mesma senha."));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) redirect(messagePath("/nova-senha", "error", "O link expirou ou a senha não pôde ser alterada."));
  await supabase.auth.signOut();
  redirect(messagePath("/login", "message", "Senha alterada. Entre novamente com a nova senha."));
}

export async function logout() {
  if (isSupabaseConfigured()) { const supabase = await createClient(); await supabase.auth.signOut(); }
  redirect("/acesso");
}
