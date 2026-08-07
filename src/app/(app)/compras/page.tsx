"use client";

import { TestTube2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { CarlosProcurementWorkspace } from "@/components/procurement/carlos-procurement-workspace";

export default function ProcurementPage() {
  return (
    <>
      <PageHeader eyebrow="Departamento · Carlos" title="Compras" description="Organize necessidades, compare fornecedores e aprove decisões de compra com contexto completo." />
      <div className="local-simulation-warning"><TestTube2 size={16} /><div><strong>Validação local</strong><p>Cotações, recomendações e pedidos são simulados. Nenhuma compra externa será realizada.</p></div></div>
      <CarlosProcurementWorkspace />
    </>
  );
}
