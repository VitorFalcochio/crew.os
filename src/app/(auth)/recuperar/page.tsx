import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { recoverPassword } from "@/features/auth/actions";

export default async function RecoveryPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const query = await searchParams;
  return <AuthShell><form className="auth-form" action={recoverPassword}><h2>Recupere seu acesso</h2><p>Informe seu e-mail para receber um link seguro de redefinição.</p>{query.error && <div className="form-alert error">{query.error}</div>}{query.message && <div className="form-alert success">{query.message}</div>}<div className="field"><label>E-mail profissional</label><input className="input" name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com.br" /></div><Button className="auth-submit" size="lg" type="submit">Enviar instruções</Button><p className="auth-footer"><Link href="/login">Voltar para o login</Link></p></form></AuthShell>;
}
