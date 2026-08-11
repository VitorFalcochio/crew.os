import type { Capability } from "./types";
import { IntegrationError } from "./errors";

export interface CapabilityDefinition { key: Capability; domain: string; description: string; critical: boolean; amountPath?: string }

const definitions: CapabilityDefinition[] = [
  { key: "email.read", domain: "email", description: "Ler uma mensagem", critical: false },
  { key: "email.search", domain: "email", description: "Buscar mensagens", critical: false },
  { key: "email.send", domain: "email", description: "Enviar uma mensagem", critical: true },
  { key: "email.reply", domain: "email", description: "Responder uma mensagem", critical: true },
  { key: "email.downloadAttachment", domain: "email", description: "Baixar anexo", critical: false },
  { key: "files.search", domain: "files", description: "Buscar arquivos", critical: false },
  { key: "files.read", domain: "files", description: "Ler arquivo", critical: false },
  { key: "files.upload", domain: "files", description: "Enviar arquivo", critical: true },
  { key: "files.createFolder", domain: "files", description: "Criar pasta", critical: true },
  { key: "files.move", domain: "files", description: "Mover arquivo", critical: true },
  { key: "calendar.events.list", domain: "calendar", description: "Listar eventos", critical: false },
  { key: "calendar.event.create", domain: "calendar", description: "Criar evento", critical: true },
  { key: "calendar.event.update", domain: "calendar", description: "Atualizar evento", critical: true },
  { key: "calendar.event.delete", domain: "calendar", description: "Excluir evento", critical: true },
  { key: "finance.transactions.list", domain: "finance", description: "Listar transações", critical: false },
  { key: "finance.accountsPayable.list", domain: "finance", description: "Listar contas a pagar", critical: false },
  { key: "finance.accountsPayable.create", domain: "finance", description: "Criar conta a pagar", critical: true, amountPath: "amount" },
  { key: "finance.accountsReceivable.list", domain: "finance", description: "Listar contas a receber", critical: false },
  { key: "finance.accountsReceivable.create", domain: "finance", description: "Criar conta a receber", critical: true, amountPath: "amount" },
  { key: "finance.cashFlow.read", domain: "finance", description: "Consultar fluxo de caixa", critical: false },
  { key: "finance.balance.read", domain: "finance", description: "Consultar saldo", critical: false },
  { key: "finance.invoices.list", domain: "finance", description: "Listar notas", critical: false },
  { key: "finance.customers.list", domain: "finance", description: "Listar clientes", critical: false },
  { key: "finance.suppliers.list", domain: "finance", description: "Listar fornecedores", critical: false },
  { key: "crm.leads.list", domain: "crm", description: "Listar leads", critical: false },
  { key: "crm.lead.create", domain: "crm", description: "Criar lead", critical: true },
  { key: "crm.lead.update", domain: "crm", description: "Atualizar lead", critical: true },
  { key: "crm.deals.list", domain: "crm", description: "Listar negócios", critical: false },
  { key: "crm.deal.create", domain: "crm", description: "Criar negócio", critical: true },
  { key: "crm.deal.update", domain: "crm", description: "Atualizar negócio", critical: true },
  { key: "crm.deal.move", domain: "crm", description: "Mover negócio", critical: true },
  { key: "crm.note.create", domain: "crm", description: "Criar nota", critical: true },
  { key: "crm.followUp.create", domain: "crm", description: "Criar follow-up", critical: true },
  { key: "messages.send", domain: "messages", description: "Enviar mensagem", critical: true },
];

export class CapabilityRegistry {
  private readonly entries = new Map(definitions.map((item) => [item.key, item]));
  register(definition: CapabilityDefinition) { if (this.entries.has(definition.key)) throw new Error(`Capability já registrada: ${definition.key}`); this.entries.set(definition.key, definition); }
  get(key: Capability) { const found = this.entries.get(key); if (!found) throw new IntegrationError("CAPABILITY_NOT_SUPPORTED", `Capability não cadastrada: ${key}`, false, 422); return found; }
  list() { return [...this.entries.values()]; }
}

export const capabilityRegistry = new CapabilityRegistry();
