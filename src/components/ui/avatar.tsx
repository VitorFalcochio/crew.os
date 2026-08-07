import Image from "next/image";
import { cn } from "@/lib/utils";

const employeePortraits: Record<string, string> = {
  AN: "/employees/ana.png",
  CA: "/employees/carlos.png",
  SO: "/employees/sofia.png",
  JU: "/employees/julia.png",
  LU: "/employees/lucas.png",
  MA: "/employees/marta.png",
  RA: "/employees/rafael.png",
};

export function Avatar({ initials, color, size = "md", status }: { initials: string; color: string; size?: "sm" | "md" | "lg" | "xl"; status?: string }) {
  const portrait = employeePortraits[initials.toUpperCase()];
  return <div className={cn("avatar", portrait && "avatar-with-photo", `avatar-${size}`)} style={{ "--avatar-color": color } as React.CSSProperties} aria-label={`Avatar ${initials}`}>
    {portrait ? <Image className="avatar-image" src={portrait} alt="" fill sizes={size === "xl" ? "76px" : size === "lg" ? "52px" : size === "md" ? "38px" : "28px"} /> : <span>{initials}</span>}
    {status && <i className={cn("avatar-status", status === "trabalhando" ? "active" : status === "aguardando aprovação" ? "waiting" : "idle")} />}
  </div>;
}
