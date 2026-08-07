"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BadgeCheck, BookOpen, Building2, ChevronDown, ChevronLeft, ChevronRight, CreditCard, LayoutDashboard, LogOut, PackageSearch, Plug, ReceiptText, Repeat2, Settings, ShieldCheck, ShoppingBag, UsersRound } from "lucide-react";
import { Logo } from "./logo";
import { useDemo } from "@/features/demo/demo-provider";
import { logout } from "@/features/auth/actions";

const navigation = [
  { href: "/central", label: "Central", icon: LayoutDashboard },
  { href: "/equipe", label: "Minha Equipe", icon: UsersRound },
  { href: "/financeiro", label: "Financeiro", icon: ReceiptText },
  { href: "/compras", label: "Compras", icon: PackageSearch },
  { href: "/delegacoes", label: "Delegações", icon: Building2 },
  { href: "/rotinas", label: "Rotinas", icon: Repeat2 },
  { href: "/aprovacoes", label: "Aprovações", icon: BadgeCheck, approvals: true },
  { href: "/atividades", label: "Atividades", icon: Activity },
  { href: "/briefing", label: "Crew Briefing", icon: BookOpen },
  { href: "/autonomia", label: "Autonomia", icon: ShieldCheck },
  { href: "/store", label: "Crew Store", icon: ShoppingBag },
  { href: "/integracoes", label: "Integrações", icon: Plug },
  { href: "/assinatura", label: "Assinatura", icon: CreditCard },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

const SIDEBAR_STORAGE_KEY = "crewos-sidebar-collapsed";
const SIDEBAR_CHANGE_EVENT = "crewos:sidebar-change";

function subscribeToSidebar(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, callback);
  };
}

function getSidebarSnapshot() {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
}

function getServerSidebarSnapshot() {
  return false;
}

export function Sidebar() {
  const pathname = usePathname();
  const { approvals, employees, account, backendEnabled, logoutLocal } = useDemo();
  const collapsed = useSyncExternalStore(subscribeToSidebar, getSidebarSnapshot, getServerSidebarSnapshot);
  const [teamOpen, setTeamOpen] = useState(() => pathname.startsWith("/equipe"));

  function toggleSidebar() {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "0" : "1");
    window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
  }

  function toggleTeam() {
    if (collapsed) {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, "0");
      window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
      setTeamOpen(true);
      return;
    }
    setTeamOpen((current) => !current);
  }

  const pending = approvals.filter((approval) => approval.status === "pendente").length;
  const hired = employees.filter((employee) => employee.hired).length;
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <Logo iconOnly={collapsed} />
        <button type="button" className="sidebar-toggle icon-button" onClick={toggleSidebar} aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"} aria-expanded={!collapsed} title={collapsed ? "Expandir menu" : "Recolher menu"}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <span className="nav-label">Empresa</span>
      <nav className="nav">
        {navigation.map(({ href, label, icon: Icon, approvals: showApprovals }) => href === "/equipe" ? (
          <div className={`sidebar-team ${teamOpen ? "open" : ""}`} key={href}>
            <button type="button" className={`nav-link sidebar-team-trigger ${pathname.startsWith("/equipe") ? "active" : ""}`} onClick={toggleTeam} title={collapsed ? label : undefined} aria-label={label} aria-expanded={teamOpen}>
              <Icon size={17} strokeWidth={1.8} />
              <span className="nav-link-label">{label}</span>
              <ChevronDown className="sidebar-team-chevron" size={15} />
            </button>
            <div className="sidebar-team-submenu">
              <div>
                <Link href="/equipe" className={`sidebar-team-link ${pathname === "/equipe" ? "active" : ""}`}>
                  <span className="sidebar-team-overview"><UsersRound size={13} /></span>
                  <span>Visão da equipe</span>
                </Link>
                {employees.filter((employee) => employee.hired).map((employee) => (
                  <Link key={employee.id} href={`/equipe/${employee.id}`} className={`sidebar-team-link ${pathname === `/equipe/${employee.id}` ? "active" : ""}`}>
                    <span className="sidebar-team-avatar" style={{ background: `${employee.color}22`, color: employee.color }}>{employee.initials}</span>
                    <span><strong>{employee.name}</strong><small>{employee.department}</small></span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Link key={href} href={href} className={`nav-link ${pathname.startsWith(href) ? "active" : ""}`} title={collapsed ? label : undefined} aria-label={label}>
            <Icon size={17} strokeWidth={1.8} />
            <span className="nav-link-label">{label}</span>
            {showApprovals && pending > 0 && <span className="badge">{pending}</span>}
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="capacity">
          <div className="capacity-row"><span>Equipe digital</span><strong>{hired}/6</strong></div>
          <div className="progress"><span style={{ width: `${Math.min(100, hired / 6 * 100)}%` }} /></div>
        </div>
        <div className="user-menu">
          <span className="user-dot">{account.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
          <div className="user-details"><strong>{account.name}</strong><small>{account.organization}</small></div>
          {backendEnabled ? <form action={logout}><button className="logout-button" title="Sair" aria-label="Sair da conta"><LogOut size={14} /></button></form> : <button className="logout-button" title="Sair" aria-label="Sair da conta local" onClick={logoutLocal}><LogOut size={14} /></button>}
        </div>
      </div>
    </aside>
  );
}
