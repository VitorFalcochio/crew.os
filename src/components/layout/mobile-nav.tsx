"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BadgeCheck, BookOpen, LayoutDashboard, UsersRound } from "lucide-react";
import { useDemo } from "@/features/demo/demo-provider";

const links = [
  { href: "/central", label: "Central", icon: LayoutDashboard },
  { href: "/equipe", label: "Equipe", icon: UsersRound },
  { href: "/aprovacoes", label: "Aprovar", icon: BadgeCheck },
  { href: "/atividades", label: "Atividades", icon: Activity },
  { href: "/briefing", label: "Briefing", icon: BookOpen },
];

export function MobileNav() {
  const pathname = usePathname();
  const { approvals } = useDemo();
  const pending = approvals.filter((item) => item.status === "pendente").length;
  return <nav className="mobile-nav" aria-label="Navegação principal móvel">{links.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className={pathname.startsWith(href) ? "active" : ""}><span className="mobile-nav-icon"><Icon size={18} />{href === "/aprovacoes" && pending > 0 && <i>{pending}</i>}</span><small>{label}</small></Link>)}</nav>;
}
