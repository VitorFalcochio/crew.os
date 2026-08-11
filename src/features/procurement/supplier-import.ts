export interface SupplierImportRow { name: string; email: string; taxId?: string; categories: string[]; notes: string }

export function parseSupplierCsv(text: string) {
  const normalized = text.replace(/^\uFEFF/, "").trim();
  if (!normalized) throw new Error("O arquivo CSV está vazio");
  const firstLine = normalized.split(/\r?\n/, 1)[0];
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows = parseDelimited(normalized, delimiter);
  if (rows.length < 2) throw new Error("O CSV precisa ter cabeçalho e pelo menos um fornecedor");
  if (rows.length > 501) throw new Error("Importe no máximo 500 fornecedores por arquivo");
  const headers = rows[0].map(normalizeHeader);
  const nameIndex = findHeader(headers, ["nome", "fornecedor", "razao social", "name", "supplier"]);
  const emailIndex = findHeader(headers, ["email", "e mail"]);
  const taxIdIndex = findHeader(headers, ["cnpj", "cpf cnpj", "documento", "tax id"]);
  const categoryIndex = findHeader(headers, ["categoria", "categorias", "category", "categories"]);
  const notesIndex = findHeader(headers, ["observacoes", "observacao", "notas", "notes"]);
  if (nameIndex < 0 || emailIndex < 0) throw new Error("O CSV precisa das colunas nome e email");
  const errors: string[] = [];
  const suppliers: SupplierImportRow[] = [];
  const seen = new Set<string>();
  rows.slice(1).forEach((row, index) => {
    if (row.every((value) => !value.trim())) return;
    const name = row[nameIndex]?.trim() ?? "";
    const email = (row[emailIndex]?.trim() ?? "").toLowerCase();
    if (!name || !isSupplierEmail(email)) { errors.push(`Linha ${index + 2}: nome ou e-mail inválido`); return; }
    if (seen.has(email)) { errors.push(`Linha ${index + 2}: e-mail duplicado no arquivo`); return; }
    seen.add(email);
    suppliers.push({ name, email, taxId: taxIdIndex >= 0 ? row[taxIdIndex]?.trim() || undefined : undefined, categories: categoryIndex >= 0 ? (row[categoryIndex] ?? "").split(/[|/]/).map((value) => value.trim()).filter(Boolean) : [], notes: notesIndex >= 0 ? row[notesIndex]?.trim() ?? "" : "" });
  });
  return { suppliers, errors };
}

export function isSupplierEmail(value: string) { return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.trim()) && value.length <= 254; }

function normalizeHeader(value: string) { return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " "); }
function findHeader(headers: string[], accepted: string[]) { return headers.findIndex((header) => accepted.includes(header)); }

function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = []; let row: string[] = []; let field = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') { if (quoted && text[index + 1] === '"') { field += '"'; index += 1; } else quoted = !quoted; }
    else if (character === delimiter && !quoted) { row.push(field); field = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && text[index + 1] === "\n") index += 1; row.push(field); rows.push(row); row = []; field = ""; }
    else field += character;
  }
  row.push(field); rows.push(row);
  return rows;
}
