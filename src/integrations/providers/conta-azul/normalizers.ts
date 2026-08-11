type JsonRecord = Record<string, unknown>;

const record = (value: unknown): JsonRecord => value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
const text = (...values: unknown[]) => values.find((value) => typeof value === "string" && value.trim())?.toString().trim() ?? "";
const amount = (...values: unknown[]) => {
  for (const value of values) {
    const candidate = typeof value === "string" ? Number(value.replace(/\./g, "").replace(",", ".")) : Number(value);
    if (Number.isFinite(candidate)) return candidate;
  }
  return 0;
};
const isoDate = (value: unknown) => {
  const parsed = new Date(String(value ?? ""));
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
};

export function normalizeContaAzulEmail(item: JsonRecord) {
  const billing = record(item.contato_cobranca_faturamento);
  const billingEmails = Array.isArray(billing.emails) ? billing.emails : [];
  const first = text(billingEmails[0], item.email).split(/[;,]/)[0]?.trim().toLowerCase();
  return first && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(first) ? first : undefined;
}

export function normalizeContaAzulContact(item: JsonRecord, profile: "customer" | "supplier") {
  const externalId = text(item.id, item.uuid, item.id_pessoa);
  if (!externalId) return null;
  return {
    external_id: externalId,
    profile,
    name: text(item.nome, item.razao_social, item.nome_fantasia, "Contato sem nome"),
    trade_name: text(item.nome_fantasia) || null,
    document: text(item.cnpj, item.cpf, item.documento) || null,
    email: normalizeContaAzulEmail(item) ?? null,
    active: item.ativo !== false,
    metadata: { profiles: Array.isArray(item.perfis) ? item.perfis : [] },
  };
}
function eventParty(item: JsonRecord, direction: "receivable" | "payable") {
  return record(item[direction === "receivable" ? "cliente" : "fornecedor"] ?? item.pessoa ?? item.contato);
}

export function normalizeContaAzulFinancialEvent(item: JsonRecord, direction: "receivable" | "payable", today = new Date().toISOString().slice(0, 10)) {
  const party = eventParty(item, direction);
  const valueDetails = record(item.detalhe_valor ?? item.valor);
  const externalId = text(item.id, item.id_parcela, item.uuid, item.id_evento_financeiro);
  if (!externalId) return null;
  const dueDate = isoDate(item.data_vencimento ?? item.vencimento);
  const providerStatus = text(item.status, item.situacao).toUpperCase();
  let status: "open" | "paid" | "overdue" | "cancelled" = "open";
  if (["RECEBIDO", "PAGO", "QUITADO"].includes(providerStatus)) status = "paid";
  else if (["PERDIDO", "CANCELADO"].includes(providerStatus)) status = "cancelled";
  else if (providerStatus === "ATRASADO" || dueDate < today) status = "overdue";
  return {
    external_id: externalId,
    customer_name: text(party.nome, party.nome_fantasia, item.nome_cliente, item.nome_fornecedor, item.descricao, direction === "receivable" ? "Cliente Conta Azul" : "Fornecedor Conta Azul"),
    document: text(item.numero_documento, item.documento, item.descricao) || null,
    amount: amount(item.valor, item.valor_liquido, valueDetails.valor_liquido, valueDetails.total, item.total),
    due_date: dueDate,
    direction,
    status,
    source: "conta-azul",
    metadata: {
      customerEmail: normalizeContaAzulEmail(party) ?? normalizeContaAzulEmail(item),
      providerStatus,
      contactExternalId: text(party.id, party.uuid) || undefined,
    },
  };
}

export function normalizeContaAzulBalance(account: JsonRecord, balancePayload: JsonRecord, at = new Date().toISOString()) {
  const externalId = text(account.id, account.uuid, account.id_conta_financeira);
  if (!externalId) return null;
  return {
    external_account_id: externalId,
    account_name: text(account.nome, account.descricao, "Conta financeira"),
    account_type: text(account.tipo, account.tipo_conta) || null,
    balance: amount(balancePayload.saldo_atual, balancePayload.saldo, 0),
    active: account.ativo !== false,
    balance_at: at,
    metadata: { bank: text(account.banco, account.nome_banco) || undefined },
  };
}
