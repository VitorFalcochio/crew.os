"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authenticateLocalAccount, readLocalWorkspace } from "./local-workspace";

export function LocalLoginForm({ nextPath = "/central" }: { nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const data = new FormData(event.currentTarget);
    const valid = await authenticateLocalAccount(String(data.get("email") ?? ""), String(data.get("password") ?? ""));
    if (!valid) {
      setError("E-mail ou senha local incorretos.");
      setPending(false);
      return;
    }
    const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/central";
    router.push(readLocalWorkspace() ? safeNext : "/onboarding");
  }

  return <form className="auth-form" onSubmit={submit}><div className="local-mode-notice"><strong>MVP local</strong><span>Entre com a conta criada neste navegador.</span></div><h2>Bem-vindo de volta</h2><p>Entre para acompanhar o trabalho da sua equipe.</p>{error && <div className="form-alert error">{error}</div>}<div className="field"><label>E-mail profissional</label><input className="input" name="email" type="email" autoComplete="email" required /></div><div className="field"><label>Senha local</label><input className="input" name="password" type="password" autoComplete="current-password" required minLength={8} /></div><Button className="auth-submit" size="lg" type="submit" disabled={pending}>{pending ? "Entrando..." : "Entrar no CrewOS"}</Button><p className="auth-footer">Ainda não tem uma conta? <Link href="/cadastro">Criar conta</Link></p></form>;
}
