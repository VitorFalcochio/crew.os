"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmployeeCard } from "@/components/employees/employee-card";
import { EmptyState } from "@/components/ui/empty-state";
import { useDemo } from "@/features/demo/demo-provider";

type TeamFilter = "todos" | "trabalhando" | "aguardando aprovação" | "disponível";

export default function TeamPage() {
  const { employees, account } = useDemo();
  const [filter, setFilter] = useState<TeamFilter>("todos");
  const hired = employees.filter((employee) => employee.hired);
  const filtered = filter === "todos" ? hired : hired.filter((employee) => employee.status === filter);
  const filters: { value: TeamFilter; label: string }[] = [
    { value: "todos", label: `Todos · ${hired.length}` },
    { value: "trabalhando", label: `Trabalhando · ${hired.filter((employee) => employee.status === "trabalhando").length}` },
    { value: "aguardando aprovação", label: `Aguardando aprovação · ${hired.filter((employee) => employee.status === "aguardando aprovação").length}` },
    { value: "disponível", label: `Disponíveis · ${hired.filter((employee) => employee.status === "disponível").length}` },
  ];
  return <><PageHeader eyebrow="Minha Equipe" title="Sua força de trabalho digital" description={`${hired.length} especialistas cuidando da operação da ${account.organization}. Abra um perfil para ajustar tarefas, ferramentas e permissões.`} action={<Link href="/store"><Button><Plus size={15} />Contratar funcionário</Button></Link>} />
    <div className="filters">{filters.map((item) => <button key={item.value} className={`filter ${filter === item.value ? "active" : ""}`} onClick={() => setFilter(item.value)}>{item.label}</button>)}</div>
    {filtered.length ? <section className="employee-grid">{filtered.map((employee) => <EmployeeCard key={employee.id} employee={employee} />)}</section> : <article className="card"><EmptyState title="Nenhum funcionário neste estado" description="Escolha outro filtro ou delegue uma nova tarefa à equipe." /></article>}
  </>;
}
