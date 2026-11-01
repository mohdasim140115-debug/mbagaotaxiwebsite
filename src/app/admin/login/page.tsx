import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin/");
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[12px] border border-line bg-white p-8 shadow-2">
        <p className="eyebrow">MBA Travels Goa</p>
        <h1 className="font-display mt-2 text-3xl font-semibold">Admin sign in</h1>
        <LoginForm />
      </div>
    </main>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
