import { redirect } from "next/navigation";

export default function NewClientRedirectPage() {
  redirect("/admin/clientes");
}
