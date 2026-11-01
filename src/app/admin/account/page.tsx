import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import { PasswordForm } from "./password-form";

export const metadata = { title: "My account" };

export default async function AccountPage({ searchParams }: PageProps<"/admin/account">) {
  const user = await requireAdmin();
  const forced = (await searchParams).force === "1" || user.mustChangePassword;
  return (
    <main className="mx-auto max-w-lg p-4 md:p-10">
      {!user.mustChangePassword && (
        <Link href="/admin/" className="text-sm font-semibold text-teal-700 underline">
          ← Back to dashboard
        </Link>
      )}
      <div className="mt-4 rounded-[12px] border border-line bg-white p-8">
        <h1 className="font-display text-3xl font-semibold">My account</h1>
        <p className="mt-1 text-ink-700">
          {user.name} · {user.email} · {user.roleName}
        </p>
        {forced && <p className="mt-4 rounded-md bg-sunset-50 p-3 text-sm font-medium text-sunset-600">Please set a new password before continuing.</p>}
        <h2 className="mt-6 font-semibold">Change password</h2>
        <PasswordForm />
      </div>
    </main>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
