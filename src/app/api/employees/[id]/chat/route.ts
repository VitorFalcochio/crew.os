import { z } from "zod";
import { buildBrainPrompt } from "@/agents/brains/brain";
import { getBrain } from "@/agents/brains/registry";
import { createOpenAIProvider, selectModelRoute } from "@/agents/providers/model-router";
import { rateLimit } from "@/lib/rate-limit";

const brainKeys: Record<string, string> = {
  ana: "ana-financeiro",
  carlos: "carlos-compras",
  sofia: "sofia-atendimento",
  julia: "julia-marketing",
  lucas: "lucas-comercial",
  fiscal: "marta-fiscal",
  imob: "rafael-imobiliario",
};

const chatSchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  context: z.string().max(20_000),
  history: z.array(z.object({ from: z.enum(["user", "employee"]), text: z.string().max(4_000) })).max(16),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const brain = getBrain(brainKeys[id]);
    if (!brain) return Response.json({ error: "Funcionário sem cérebro configurado" }, { status: 404 });
    if (!process.env.OPENAI_API_KEY) return Response.json({ fallback: true }, { status: 503 });
    if (!rateLimit(`employee-chat:${id}`, 30).allowed) return Response.json({ error: "Muitas mensagens. Aguarde um minuto." }, { status: 429 });
    const input = chatSchema.parse(await request.json());
    const route = selectModelRoute({ priority: "média", descriptionLength: input.message.length + input.context.length, employeeRole: brain.role, preferredReasoning: brain.preferredReasoning });
    const provider = createOpenAIProvider(route);
    const history = input.history.map((item) => `${item.from === "user" ? "GESTOR" : brain.displayName.toUpperCase()}: ${item.text}`).join("\n");
    const system = `${buildBrainPrompt(brain)}\n\nMODO CONVERSA\nResponda diretamente à dúvida do gestor usando apenas o contexto fornecido. Seja claro e conciso. Quando não houver dados suficientes, diga exatamente o que falta. Não alegue ter executado ações.`;
    const result = await provider.generateText({ system, prompt: `CONTEXTO LOCAL ATUAL\n${input.context}\n\nHISTÓRICO RECENTE\n${history || "Sem mensagens anteriores."}\n\nPERGUNTA DO GESTOR\n${input.message}`, maxOutputTokens: 900, reasoningEffort: brain.preferredReasoning, safetyIdentifier: `crewos-${id}` });
    return Response.json({ text: result.text });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Mensagem ou contexto inválido" }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível responder" }, { status: 500 });
  }
}
