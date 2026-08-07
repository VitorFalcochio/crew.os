const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured() { return Boolean(url && key); }
export function isDemoModeAllowed(input: { environment?: string; explicitFlag?: string } = {}) {
  const environment = input.environment ?? process.env.NODE_ENV;
  const explicitFlag = input.explicitFlag ?? process.env.CREWOS_ALLOW_DEMO;
  return environment !== "production" || explicitFlag === "true";
}
export function getSupabaseConfig() {
  if (!url || !key) throw new Error("Supabase não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e a chave pública.");
  return { url, key };
}
