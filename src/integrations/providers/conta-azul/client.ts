import { contaAzulApiBaseUrl } from "./oauth";

type JsonRecord = Record<string, unknown>;

export class ContaAzulHttpError extends Error {
  constructor(message: string, public readonly status: number, public readonly retryAfter?: number) {
    super(message);
    this.name = "ContaAzulHttpError";
  }
}
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function pageItems(payload: unknown) {
  const object = asRecord(payload);
  const items = Array.isArray(object.items) ? object.items : Array.isArray(object.itens) ? object.itens : [];
  const total = Number(object.totalItems ?? object.itens_totais ?? items.length);
  return { items: items.map(asRecord), total: Number.isFinite(total) ? total : items.length };
}

export class ContaAzulClient {
  constructor(private readonly accessToken: string, private readonly baseUrl = contaAzulApiBaseUrl()) {}

  private async request(path: string, search?: URLSearchParams, retry = true): Promise<unknown> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (search) url.search = search.toString();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (response.status === 429 && retry) {
      const seconds = Math.min(5, Math.max(1, Number(response.headers.get("retry-after")) || 1));
      await wait(seconds * 1000);
      return this.request(path, search, false);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const body = asRecord(payload);
      throw new ContaAzulHttpError(String(body.message ?? body.error ?? `Conta Azul respondeu com HTTP ${response.status}`), response.status, Number(response.headers.get("retry-after")) || undefined);
    }
    return payload;
  }

  private async paginated(path: string, extra: Record<string, string> = {}, pageSize = 500, maxPages = 20) {
    const all: JsonRecord[] = [];
    for (let page = 1; page <= maxPages; page += 1) {
      const search = new URLSearchParams({ ...extra, pagina: String(page), tamanho_pagina: String(pageSize) });
      const result = pageItems(await this.request(path, search));
      all.push(...result.items);
      if (!result.items.length || all.length >= result.total || result.items.length < pageSize) break;
    }
    return all;
  }

  listPeople(profile: "Cliente" | "Fornecedor") {
    return this.paginated("/v1/pessoas", { tipo_perfil: profile }, 500);
  }

  listFinancialEvents(direction: "receivable" | "payable") {
    const resource = direction === "receivable" ? "contas-a-receber" : "contas-a-pagar";
    return this.paginated(`/v1/financeiro/eventos-financeiros/${resource}/buscar`, {}, 500);
  }

  listFinancialAccounts() {
    return this.paginated("/v1/conta-financeira", {}, 500);
  }

  async getCurrentBalance(accountId: string) {
    return asRecord(await this.request(`/v1/conta-financeira/${encodeURIComponent(accountId)}/saldo-atual`));
  }
}
