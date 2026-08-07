import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: string }) {
  const tone = status.includes("conclu") || status === "aprovada" || status === "disponível" ? "success" : status.includes("aguardando") || status === "pendente" || status === "planejando" ? "warning" : status === "falhou" || status === "recusada" || status === "com erro" ? "danger" : "info";
  return <span className={cn("status-pill", tone)}><i />{status}</span>;
}
