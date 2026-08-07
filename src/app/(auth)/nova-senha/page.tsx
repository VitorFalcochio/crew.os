import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { updatePassword } from "@/features/auth/actions";

export default async function NewPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return <AuthShell><form className="auth-form" action={updatePassword}><h2>Defina sua nova senha</h2><p>Escolha uma senha segura que você ainda não utiliza.</p>{query.error && <div className="form-alert error">{query.error}</div>}<div className="field"><label>Nova senha</label><input className="input" name="password" type="password" autoComplete="new-password" required minLength={8} /></div><div className="field"><label>Confirmar nova senha</label><input className="input" name="confirmation" type="password" autoComplete="new-password" required minLength={8} /></div><Button className="auth-submit" size="lg" type="submit">Salvar nova senha</Button></form></AuthShell>;
}
