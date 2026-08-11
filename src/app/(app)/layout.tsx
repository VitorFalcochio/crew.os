import { DemoProvider } from "@/features/demo/demo-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AuthenticationError, OrganizationAccessError, requireOrganization } from "@/lib/auth/session";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured()) {
    try { await requireOrganization(); }
    catch (error) {
      if (error instanceof AuthenticationError) redirect("/acesso");
      if (error instanceof OrganizationAccessError) redirect("/onboarding");
      throw error;
    }
  }
  return <DemoProvider><div className="app-shell"><Sidebar /><main className="main"><Topbar /><div className="content">{children}</div></main><MobileNav /></div></DemoProvider>;
}
