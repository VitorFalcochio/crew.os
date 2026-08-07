import Image from "next/image";

export function Logo({ iconOnly = false }: { iconOnly?: boolean }) {
  return <div className={`logo ${iconOnly ? "logo-icon-only" : ""}`}><span className="logo-mark"><Image src="/crewos-logo.png" alt="Símbolo CrewOS" width={40} height={40} priority /></span><span className="logo-label">CrewOS</span></div>;
}
