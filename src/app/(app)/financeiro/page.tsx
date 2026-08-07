"use client";

import { TestTube2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AnaFinanceWorkspace } from "@/components/finance/ana-finance-workspace";

export default function FinancePage() {
  return <>
    <PageHeader eyebrow="Financeiro" title="Ana" description="Organize documentos, contas, cobranças e decisões financeiras em um único espaço." />
    <div className="local-simulation-warning"><TestTube2 size={16} /><div><strong>Validação local</strong><p>Dados e decisões ficam neste navegador. Pagamentos, cobranças e envios externos continuam simulados.</p></div></div>
    <AnaFinanceWorkspace />
  </>;
}
