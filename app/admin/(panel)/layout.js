import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getSetting } from "@/lib/models";
import { settingImageUrl } from "@/lib/img";
import AdminShell from "./AdminShell";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  // Serve the logo as a cacheable URL rather than inlining its base64 in the
  // HTML of every admin page.
  const logo = settingImageUrl("store_logo", getSetting("store_logo", ""));
  return <AdminShell user={user} logo={logo}>{children}</AdminShell>;
}
