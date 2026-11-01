import { ResetForm } from "./reset-form";

export const metadata = { title: "Set password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/admin/reset-password">) {
  const token = String((await searchParams).token ?? "");
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-[12px] border border-line bg-white p-8 shadow-2">
        <h1 className="font-display text-3xl font-semibold">Set your password</h1>
        <p className="mt-2 text-sm text-ink-700">Use at least 12 characters. A passphrase of several words works well.</p>
        <ResetForm token={token} />
      </div>
    </main>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
