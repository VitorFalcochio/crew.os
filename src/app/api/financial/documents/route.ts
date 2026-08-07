import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { classifyFinancialText, type ParsedFinancialDocument } from "@/features/finance/document-intelligence";

export const runtime = "nodejs";
export const maxDuration = 60;

async function extractPdf(data: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let index = 1; index <= Math.min(document.numPages, 12); index += 1) {
    const page = await document.getPage(index);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
  }
  return pages.join("\n");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);
  if (!files.length) return NextResponse.json({ error: "Envie pelo menos um arquivo" }, { status: 400 });
  if (files.length > 20) return NextResponse.json({ error: "O limite é de 20 arquivos por processamento" }, { status: 400 });
  if (files.some((file) => file.size > 10 * 1024 * 1024)) return NextResponse.json({ error: "Cada arquivo pode ter no máximo 10 MB" }, { status: 400 });
  if (files.reduce((sum, file) => sum + file.size, 0) > 50 * 1024 * 1024) return NextResponse.json({ error: "O lote pode ter no máximo 50 MB" }, { status: 400 });

  let ocrWorker: Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>> | null = null;
  const documents: ParsedFinancialDocument[] = [];
  try {
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const hash = createHash("sha256").update(bytes).digest("hex");
      let text = "";
      let extractionMethod: ParsedFinancialDocument["extractionMethod"] = "metadata";
      try {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          text = await extractPdf(bytes);
          extractionMethod = text.trim() ? "pdf-text" : "metadata";
        } else if (file.type.startsWith("image/")) {
          const { createWorker } = await import("tesseract.js");
          ocrWorker ??= await createWorker("por");
          const result = await ocrWorker.recognize(Buffer.from(bytes));
          text = result.data.text;
          extractionMethod = "ocr";
        } else if (file.type.startsWith("text/") || /\.(csv|txt)$/i.test(file.name)) {
          text = new TextDecoder().decode(bytes);
          extractionMethod = "plain-text";
        }
      } catch {
        extractionMethod = "metadata";
      }
      documents.push(classifyFinancialText({ fileName: file.name, mimeType: file.type || "application/octet-stream", size: file.size, hash, text: `${file.name}\n${text}`, extractionMethod }));
    }
  } finally {
    if (ocrWorker) await ocrWorker.terminate();
  }
  return NextResponse.json({ documents });
}
