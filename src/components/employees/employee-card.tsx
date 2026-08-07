import Link from "next/link";
import type { Employee } from "@/types/domain";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill } from "@/components/ui/status-pill";

export function EmployeeCard({ employee }: { employee: Employee }) { return <Link href={`/equipe/${employee.id}`} className="card employee-card"><div className="employee-top"><Avatar initials={employee.initials} color={employee.color} size="lg" status={employee.status} /><div className="employee-title"><h3>{employee.name}</h3><p>{employee.role} · {employee.department}</p></div><StatusPill status={employee.status} /></div><div className="employee-task"><label>Tarefa atual</label><p>{employee.currentTask}</p></div><div className="employee-stats"><div className="employee-stat"><small>Concluídas</small><strong>{employee.tasksCompleted} tarefas</strong></div><div className="employee-stat"><small>Desempenho</small><strong>{employee.performance}%</strong><div className="mini-progress"><span style={{ width: `${employee.performance}%` }} /></div></div></div></Link>; }
