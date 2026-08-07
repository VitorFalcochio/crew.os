import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import { Toaster } from "sonner";
import { MotionSystem } from "@/components/motion/motion-system";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = { title: { default: "CrewOS", template: "%s · CrewOS" }, description: "O sistema operacional da força de trabalho digital." };
export const viewport: Viewport = { themeColor: "#0B0909", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={sora.variable}><body>{children}<MotionSystem /><Toaster theme="dark" position="top-right" toastOptions={{ className: "toast-custom" }} /></body></html>;
}
