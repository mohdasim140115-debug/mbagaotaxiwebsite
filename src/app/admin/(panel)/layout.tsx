import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { AdminNav } from "@/components/admin/admin-nav";
import { logoutAction } from "@/server/admin/auth-actions";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  // Accounts created with a temporary password must set their own first (/admin/account/ is outside this layout).
  if (user.mustChangePassword) redirect("/admin/account/?force=1");
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[240px_1fr]">
      <AdminNav
        user={{ name: user.name, role: user.roleName, permissions: user.permissions }}
        logout={
          <form action={logoutAction}>
            <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-white/10">
              Sign out
            </button>
          </form>
        }
      />
      <main id="admin-main" className="min-w-0 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
