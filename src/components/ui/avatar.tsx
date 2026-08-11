import Image from "next/image";
import { cn } from "@/lib/utils";

const employeePortraits: Record<string, string> = {
  AN: "/employees/ana.png",
  A: "/employees/ana.png",
  CA: "/employees/carlos.png",
  C: "/employees/carlos.png",
  SO: "/employees/sofia.png",
  S: "/employees/sofia.png",
  JU: "/employees/julia.png",
  J: "/employees/julia.png",
  LU: "/employees/lucas.png",
  L: "/employees/lucas.png",
  MA: "/employees/marta.png",
  M: "/employees/marta.png",
  RA: "/employees/rafael.png",
  R: "/employees/rafael.png",
};

export function Avatar({ initials, color, size = "md", status }: { initials: string; color: string; size?: "xs" | "sm" | "md" | "lg" | "xl"; status?: string }) {
  const portraitKey = initials.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const portrait = employeePortraits[portraitKey];
  return <div className={cn("avatar", portrait && "avatar-with-photo", `avatar-${size}`)} style={{ "--avatar-color": color } as React.CSSProperties} aria-label={`Avatar ${initials}`}>
    {portrait ? <Image className="avatar-image" src={portrait} alt="" fill sizes={size === "xl" ? "76px" : size === "lg" ? "52px" : size === "md" ? "38px" : size === "sm" ? "28px" : "25px"} /> : <span>{initials}</span>}
    {status && <i className={cn("avatar-status", status === "trabalhando" ? "active" : status === "aguardando aprovação" ? "waiting" : "idle")} />}
  </div>;
}
