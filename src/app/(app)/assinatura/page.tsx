import { redirect } from "next/navigation";

export default function BillingRedirect() {
  redirect("/configuracoes?tab=assinatura");
}
