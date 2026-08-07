import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { signup } from "@/features/auth/actions";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return <AuthShell><form className="auth-form" action={signup}><h2>Comece a montar sua equipe</h2><p>Crie sua conta e configure a empresa em poucos minutos.</p>{query.error && <div className="form-alert error">{query.error}</div>}<div className="field"><label>Seu nome</label><input className="input" name="name" required minLength={2} autoComplete="name" placeholder="Como devemos chamar você?" /></div><div className="field"><label>E-mail profissional</label><input className="input" name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com.br" /></div><div className="field"><label>Senha</label><input className="input" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="No mínimo 8 caracteres" /></div><label className="checkbox-row"><input required type="checkbox" /><span>Concordo com os <Link href="/termos">Termos de Uso</Link> e a <Link href="/privacidade">Política de Privacidade</Link>.</span></label><Button className="auth-submit" size="lg" type="submit">Criar minha conta</Button><p className="auth-footer">Já usa o CrewOS? <Link href="/login">Entrar</Link></p></form></AuthShell>;
}
