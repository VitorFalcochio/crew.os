import { createHash } from "node:crypto";
import { classifyFinancialText } from "@/features/finance/document-intelligence";
import type { ActionGateway } from "../core/action-gateway";

export interface InboxAttachment { id: string; fileName: string; mimeType: string; size: number; text: string }

export async function processAnaFinancialInbox(input: { organizationId: string; employeeId: string; taskId: string; messageId: string; attachments: InboxAttachment[]; gateway: ActionGateway }) {
  const pdfs = input.attachments.filter((item) => item.mimeType === "application/pdf");
  const parsed = pdfs.map((item) => classifyFinancialText({ fileName: item.fileName, mimeType: item.mimeType, size: item.size, hash: createHash("sha256").update(item.text).digest("hex"), text: item.text, extractionMethod: "pdf-text" }));
  const financial = parsed.filter((document) => document.direction === "payable" && document.amount && document.dueDate);
  const results = [];
  for (const document of financial) {
    results.push(await input.gateway.execute({ organizationId: input.organizationId, employeeId: input.employeeId, taskId: input.taskId, capability: "finance.accountsPayable.create", idempotencyKey: `gmail:${input.messageId}:${document.hash}`, input: { supplier: document.counterparty ?? "Não identificado", taxId: document.taxId, amount: document.amount, dueDate: document.dueDate, documentNumber: document.documentNumber, barcode: document.barcode, description: `${document.type} recebido por Gmail`, source: { type: "gmail", messageId: input.messageId, attachmentId: input.attachments.find((item) => item.fileName === document.fileName)?.id }, untrustedDocument: true } }));
  }
  return { parsed, financialDocuments: financial.length, results };
}
