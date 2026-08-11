"use client";

import { TestTube2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AnaFinanceWorkspace } from "@/components/finance/ana-finance-workspace";

export default function FinancePage() {
  return <>
    <PageHeader eyebrow="Ana · Assistente administrativa e financeira" title="Central Financeira" description="Acompanhe documentos, vencimentos, cobranças, caixa e decisões importantes em uma operação organizada pela Ana." />
    <div className="local-simulation-warning"><TestTube2 size={16} /><div><strong>Validação local</strong><p>Dados e decisões ficam neste navegador. Pagamentos, cobranças e envios externos continuam simulados.</p></div></div>
    <AnaFinanceWorkspace />
  </>;
}
