"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import type { Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const GROUPS: { title: string; items: { href: string; label: string; perm: Permission }[] }[] = [
  { title: "", items: [{ href: "/admin/", label: "Dashboard", perm: "dashboard.view" }] },
  {
    title: "Website",
    items: [
      { href: "/admin/pages/", label: "Pages", perm: "content.view" },
      { href: "/admin/content/packages/", label: "Packages", perm: "content.view" },
      { href: "/admin/content/services/", label: "Services", perm: "content.view" },
      { href: "/admin/content/vehicles/", label: "Fleet & fares", perm: "content.view" },
      { href: "/admin/content/hotels/", label: "Hotels", perm: "content.view" },
      { href: "/admin/content/destinations/", label: "Destinations", perm: "content.view" },
      { href: "/admin/content/faqs/", label: "FAQs", perm: "content.view" },
      { href: "/admin/content/testimonials/", label: "Testimonials", perm: "content.view" },
      { href: "/admin/content/posts/", label: "Blog posts", perm: "content.view" },
      { href: "/admin/media/", label: "Media library", perm: "content.view" },
      { href: "/admin/navigation/", label: "Navigation", perm: "navigation.manage" },
    ],
  },
  { title: "Leads", items: [{ href: "/admin/enquiries/", label: "Enquiries", perm: "enquiries.view" }] },
  {
    title: "SEO & settings",
    items: [
      { href: "/admin/seo/", label: "SEO overview", perm: "seo.manage" },
      { href: "/admin/redirects/", label: "Redirects", perm: "redirects.manage" },
      { href: "/admin/settings/", label: "Site settings", perm: "settings.manage" },
      { href: "/admin/migration/", label: "Migration report", perm: "content.view" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/users/", label: "Users & roles", perm: "users.manage" },
      { href: "/admin/audit/", label: "Audit log", perm: "audit.view" },
    ],
  },
];

export function AdminNav({ user, logout }: { user: { name: string; role: string; permissions: Permission[] }; logout: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin/" ? pathname === "/admin/" || pathname === "/admin" : pathname.startsWith(href));
  return (
    <>
      <div className="flex items-center justify-between bg-ocean-900 px-4 py-3 text-white lg:hidden">
        <span className="font-display font-semibold">MBA Admin</span>
        <button type="button" aria-expanded={open} aria-controls="admin-sidebar" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} className="inline-flex size-10 items-center justify-center rounded-md hover:bg-white/10">
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      <aside id="admin-sidebar" className={cn("bg-ocean-900 text-white/85 lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto", open ? "block" : "hidden")}>
        <div className="hidden px-5 py-5 lg:block">
          <Link href="/admin/" className="font-display text-xl font-semibold text-white">
            MBA Travels
          </Link>
          <p className="text-xs text-white/60">Website admin</p>
        </div>
        <nav aria-label="Admin" className="px-3 pb-4">
          {GROUPS.map((g) => {
            const items = g.items.filter((i) => user.permissions.includes(i.perm));
            if (!items.length) return null;
            return (
              <div key={g.title || "main"} className="mt-3">
                {g.title && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">{g.title}</p>}
                <ul>
                  {items.map((i) => (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        onClick={() => setOpen(false)}
                        aria-current={active(i.href) ? "page" : undefined}
                        className="block rounded-md px-3 py-2 text-sm hover:bg-white/10 aria-[current=page]:bg-white/15 aria-[current=page]:font-semibold aria-[current=page]:text-white"
                      >
                        {i.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <div className="mt-6 border-t border-white/10 pt-3">
            <p className="px-3 text-sm font-semibold text-white">{user.name}</p>
            <p className="px-3 pb-2 text-xs text-white/60">{user.role}</p>
            <Link href="/admin/account/" className="block rounded-md px-3 py-2 text-sm hover:bg-white/10">
              My account
            </Link>
            <a href="/" target="_blank" rel="noopener" className="block rounded-md px-3 py-2 text-sm hover:bg-white/10">
              View website
            </a>
            {logout}
          </div>
        </nav>
      </aside>
    </>
  );
}
