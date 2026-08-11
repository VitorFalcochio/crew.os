import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import { Toaster } from "sonner";
import { MotionSystem } from "@/components/motion/motion-system";
import "./globals.css";
import "@/components/layout/product-theme.css";
import "@/components/finance/ana-finance-workspace.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = { title: { default: "CrewOS", template: "%s · CrewOS" }, description: "O sistema operacional da força de trabalho digital." };
export const viewport: Viewport = { themeColor: "#0D0E0C", colorScheme: "light dark" };

const themeScript = `(function(){try{var t=localStorage.getItem('crewos-theme');if(t!=='light'&&t!=='dark')t='dark';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={sora.variable} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body>{children}<MotionSystem /><Toaster theme="system" position="top-right" toastOptions={{ className: "toast-custom" }} /></body></html>;
}
