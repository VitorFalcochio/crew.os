"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createLocalAccount } from "./local-workspace";

export function LocalSignupForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    if (name.length < 2 || !email.includes("@") || password.length < 8) {
      setError("Revise os dados. A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setPending(true);
    try {
      await createLocalAccount({ name, email, password });
      router.push("/onboarding");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar a conta local.");
      setPending(false);
    }
  }

  return <form className="auth-form" onSubmit={submit}><div className="local-mode-notice"><strong>MVP local</strong><span>Conta e operação serão salvas somente neste navegador.</span></div><h2>Comece a montar sua equipe</h2><p>Crie sua conta e configure a empresa em poucos minutos.</p>{error && <div className="form-alert error">{error}</div>}<div className="field"><label>Seu nome</label><input className="input" name="name" required minLength={2} autoComplete="name" placeholder="Como devemos chamar você?" /></div><div className="field"><label>E-mail profissional</label><input className="input" name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com.br" /></div><div className="field"><label>Senha local</label><input className="input" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="No mínimo 8 caracteres" /></div><label className="checkbox-row"><input required type="checkbox" /><span>Concordo com os <Link href="/termos">Termos de Uso</Link> e a <Link href="/privacidade">Política de Privacidade</Link>.</span></label><Button className="auth-submit" size="lg" type="submit" disabled={pending}>{pending ? "Criando ambiente..." : "Criar minha conta"}</Button><p className="auth-footer">Já usa o CrewOS local? <Link href="/login">Entrar</Link></p></form>;
}
