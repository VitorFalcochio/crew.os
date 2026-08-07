import { z } from "zod";

const autonomySchema = z.enum(["read", "draft", "act_within_scope", "approval_required", "forbidden"]);
const brainSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9-]*$/), displayName: z.string().min(2), role: z.string().min(3), department: z.string().min(2),
  seniority: z.enum(["pleno", "senior", "especialista"]), mission: z.string().min(20), expertise: z.array(z.string().min(3)).min(3),
  operatingPrinciples: z.array(z.string().min(8)).min(3), workflow: z.array(z.string().min(8)).min(3), qualityGates: z.array(z.string().min(8)).min(3),
  escalationRules: z.array(z.string().min(8)).min(1), memoryPolicy: z.object({ remember: z.array(z.string()).min(1), neverRemember: z.array(z.string()).min(1) }),
  tools: z.record(z.string(), autonomySchema), preferredReasoning: z.enum(["low", "medium", "high"]),
});

export type EmployeeBrain = Readonly<z.infer<typeof brainSchema>>;
export interface BrainRuntimeContext { employeeName?: string; organizationFacts?: string[]; operationalMemories?: string[] }

export function defineBrain(definition: z.input<typeof brainSchema>): EmployeeBrain { return Object.freeze(brainSchema.parse(definition)); }
function section(title: string, items: string[]) { return `${title}:\n${items.map((item, index) => `${index + 1}. ${item}`).join("\n")}`; }

export function buildBrainPrompt(brain: EmployeeBrain, context: BrainRuntimeContext = {}) {
  const name = context.employeeName ?? brain.displayName;
  const facts = context.organizationFacts?.slice(0, 20) ?? [];
  const memories = context.operationalMemories?.slice(0, 20) ?? [];
  return [
    `IDENTIDADE\nVocê é ${name}, agente de IA ${brain.seniority} em ${brain.role}, no departamento ${brain.department}. Você não se apresenta como humano nem alega possuir licença profissional.`,
    `MISSÃO\n${brain.mission}`, section("DOMÍNIOS DE ESPECIALIDADE", brain.expertise), section("PRINCÍPIOS OPERACIONAIS", brain.operatingPrinciples),
    section("MÉTODO DE TRABALHO", brain.workflow), section("CRITÉRIOS DE QUALIDADE", brain.qualityGates), section("REGRAS DE ESCALONAMENTO", brain.escalationRules),
    section("AUTONOMIA POR FERRAMENTA", Object.entries(brain.tools).map(([tool, autonomy]) => `${tool}: ${autonomy}`)),
    section("MEMÓRIA PERMITIDA", brain.memoryPolicy.remember), section("NUNCA MEMORIZAR", brain.memoryPolicy.neverRemember),
    facts.length ? section("CONTEXTO VERIFICADO DA ORGANIZAÇÃO", facts) : "", memories.length ? section("MEMÓRIA OPERACIONAL RELEVANTE", memories) : "",
    "POLÍTICA GLOBAL\nSepare fatos, inferências e recomendações. Não invente dados, documentos ou resultados de ferramentas. Antes de qualquer pagamento, compra, publicação, envio externo, alteração destrutiva, compromisso jurídico ou decisão irreversível, solicite aprovação humana. Minimize dados pessoais e responda em português do Brasil.",
  ].filter(Boolean).join("\n\n");
}
