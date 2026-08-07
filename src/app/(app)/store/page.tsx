"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useDemo } from "@/features/demo/demo-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { currency } from "@/lib/utils";

const categories = ["Recomendados", "Financeiro", "Comercial", "Atendimento", "Marketing", "Construção civil"] as const;
type Category = typeof categories[number];

export default function StorePage() {
  const { employees, hireEmployee } = useDemo();
  const [category, setCategory] = useState<Category>("Recomendados");
  const displayed = category === "Recomendados" ? employees : category === "Construção civil" ? employees.filter((employee) => ["ana", "carlos", "fiscal"].includes(employee.id)) : employees.filter((employee) => employee.department === category);
  return <><PageHeader eyebrow="Crew Store" title="Expanda sua equipe com especialistas" description="Funcionários digitais preparados para funções e segmentos específicos. Adicione, configure permissões e comece a delegar." />
    <div className="filters">{categories.map((item) => <button key={item} className={`filter ${category === item ? "active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}</div>
    {displayed.length ? <section className="employee-grid">{displayed.map((employee) => <article className="card store-card" key={employee.id}><div className="employee-top"><Avatar initials={employee.initials} color={employee.color} size="lg" /><div className="employee-title"><h3>{employee.name} · {employee.role}</h3><p>{employee.department} · {employee.level}</p></div><span style={{ color: "#fbbf24", fontSize: 10 }}><Star size={11} fill="currentColor" style={{ display: "inline", verticalAlign: -1 }} /> {(employee.performance / 20).toFixed(1)}</span></div><p className="description">{employee.description}</p><div className="skill-list" style={{ marginBottom: 16 }}>{employee.skills.slice(0, 3).map((skill) => <span className="skill" key={skill}>{skill}</span>)}</div><div className="store-card-footer"><div className="price"><strong>{currency(employee.monthlyPrice)}</strong><small> / mês</small></div><Button size="sm" variant={employee.hired ? "secondary" : "primary"} disabled={employee.hired} onClick={() => hireEmployee(employee.id)}>{employee.hired ? "Na sua equipe" : "Adicionar à equipe"}</Button></div></article>)}</section> : <article className="card"><EmptyState title="Nenhum especialista nesta categoria" description="Novos funcionários digitais serão adicionados em breve." /></article>}
  </>;
}
