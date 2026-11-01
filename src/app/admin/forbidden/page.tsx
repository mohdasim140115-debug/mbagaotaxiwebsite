import Link from "next/link";

export const metadata = { title: "Not allowed" };

export default function Forbidden() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="max-w-md rounded-[12px] border border-line bg-white p-8 text-center">
        <h1 className="font-display text-3xl font-semibold">You don’t have access to this area</h1>
        <p className="mt-3 text-ink-700">Your role doesn’t include this permission. Ask a Super Admin if you need it.</p>
        <Link href="/admin/" className="mt-6 inline-block font-semibold text-teal-700 underline">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}

// Admin screens always read fresh, per-request data.
export const instant = false;
