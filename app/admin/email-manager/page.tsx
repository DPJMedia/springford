import { redirect } from "next/navigation";

export default function EmailManagerRedirectPage() {
  redirect("/admin/newsletter");
}
