import type { Metadata } from "next";

// Admin pages are per-request and authenticated; they are allowed to block while rendering.
export const instant = false;

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · MBA Travels Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-dvh bg-[#f6f4ef] text-ink-900">{children}</div>;
}
