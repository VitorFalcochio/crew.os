import Link from "next/link";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { login } from "@/features/auth/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const query = await searchParams;
  return <AuthShell><form className="auth-form" action={login}><h2>Bem-vindo de volta</h2><p>Entre para acompanhar o trabalho da sua equipe.</p>{query.error && <div className="form-alert error">{query.error}</div>}{query.message && <div className="form-alert success">{query.message}</div>}<input type="hidden" name="next" value={query.next ?? "/central"} /><div className="field"><label>E-mail profissional</label><input className="input" name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com.br" /></div><div className="field"><label>Senha</label><input className="input" name="password" type="password" autoComplete="current-password" required minLength={8} /><Link href="/recuperar" style={{ justifySelf: "end", color: "var(--accent-light)", fontSize: 10 }}>Esqueci minha senha</Link></div><Button className="auth-submit" size="lg" type="submit">Entrar no CrewOS</Button><p className="auth-footer">Ainda não tem uma conta? <Link href="/cadastro">Criar conta</Link></p></form></AuthShell>;
}
