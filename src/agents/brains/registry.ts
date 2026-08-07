import type { EmployeeBrain } from "./brain";
import { anaFinanceiroBrain } from "./ana-financeiro";
import { carlosComprasBrain } from "./carlos-compras";
import { juliaMarketingBrain } from "./julia-marketing";
import { lucasComercialBrain } from "./lucas-comercial";
import { martaFiscalBrain } from "./marta-fiscal";
import { rafaelImobiliarioBrain } from "./rafael-imobiliario";
import { sofiaAtendimentoBrain } from "./sofia-atendimento";

export const employeeBrains = [anaFinanceiroBrain, carlosComprasBrain, sofiaAtendimentoBrain, juliaMarketingBrain, lucasComercialBrain, martaFiscalBrain, rafaelImobiliarioBrain] as const;
const brainsByKey = new Map<string, EmployeeBrain>(employeeBrains.map((brain) => [brain.key, brain]));
const roleMatchers: Array<[RegExp, EmployeeBrain]> = [
  [/financ|controlador/i, anaFinanceiroBrain], [/compr|suprimento/i, carlosComprasBrain], [/atendimento|suporte|customer/i, sofiaAtendimentoBrain],
  [/marketing|conteúdo/i, juliaMarketingBrain], [/fiscal|tribut/i, martaFiscalBrain], [/imobili|corretor/i, rafaelImobiliarioBrain], [/comercial|vendas/i, lucasComercialBrain],
];
export function getBrain(key: string) { return brainsByKey.get(key); }
export function resolveEmployeeBrain(input: { brainKey?: unknown; role: string; department?: string; name?: string }) {
  if (typeof input.brainKey === "string") { const configured = getBrain(input.brainKey); if (configured) return configured; }
  const searchable = [input.role, input.department, input.name].filter(Boolean).join(" ");
  return roleMatchers.find(([pattern]) => pattern.test(searchable))?.[1];
}
