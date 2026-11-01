"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import type { NavItem } from "@/server/cms/public";
import type { ResolvedCta } from "@/lib/cms/cta";
import { CtaLink } from "./cta-link";
import { cn } from "@/lib/utils";
import { track } from "@/components/analytics/track";

type Props = {
  nav: NavItem[];
  businessName: string;
  logo: { url: string; width: number; height: number } | null;
  phoneHref: string;
  phoneLabel: string;
  hours: string;
  booking: ResolvedCta;
};

function isActive(pathname: string, href: string) {
  if (!href.startsWith("/")) return false;
  const clean = href.split("#")[0]!;
  if (clean === "/") return pathname === "/";
  return pathname === clean || pathname.startsWith(clean);
}

export function HeaderClient({ nav, businessName, logo, phoneHref, phoneLabel, hours, booking }: Props) {
  const pathname = usePathname();
  // The menu is open only for the path it was opened on, so navigating closes it without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const setOpen = (v: boolean | ((p: boolean) => boolean)) =>
    setOpenPath((cur) => ((typeof v === "function" ? v(cur === pathname) : v) ? pathname : null));
  const [scrolled, setScrolled] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // The homepage hero is dark and full-bleed, so the header starts transparent there.
  const overHero = false; // solid white header on every page

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Drawer: lock scroll, close on Escape, keep focus inside.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const drawer = drawerRef.current;
    drawer?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenPath(null);
        toggleRef.current?.focus();
      }
      if (e.key === "Tab" && drawer) {
        const items = Array.from(drawer.querySelectorAll<HTMLElement>("a, button"));
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,color] duration-200",
        overHero ? "bg-transparent text-white" : cn("border-b border-line bg-white text-ink-900", scrolled ? "shadow-2" : "shadow-1"),
      )}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-ink-900">
        Skip to content
      </a>
      <div className="container-wide flex h-[72px] items-center justify-between gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${businessName} — home`}>
          {logo && <Image src={logo.url} alt="" width={logo.width} height={logo.height} className="h-11 w-auto" priority sizes="80px" />}
          <span className="font-display text-lg font-semibold leading-none sm:text-xl">{businessName}</span>
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {nav.map((item) => (
              <li key={item.id} className="group relative">
                <Link
                  href={item.href}
                  {...(item.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className={cn(
                    "relative inline-flex h-10 items-center gap-1 rounded-md px-3 text-[0.9375rem] font-medium transition-colors",
                    overHero ? "hover:bg-sand-100" : "hover:bg-sand-100",
                    "after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-sunset-500 after:transition-transform aria-[current=page]:after:scale-x-100",
                  )}
                >
                  {item.label}
                  {item.children.length > 0 && <ChevronDown className="size-4" aria-hidden="true" />}
                </Link>
                {item.children.length > 0 && (
                  <ul className="invisible absolute left-0 top-full min-w-56 rounded-[10px] border border-line bg-paper-raised p-2 text-ink-900 opacity-0 shadow-2 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    {item.children.map((c) => (
                      <li key={c.id}>
                        <Link href={c.href} className="block rounded-md px-3 py-2 hover:bg-sand-100">
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={phoneHref}
            onClick={() => track("phone_click", { context: "header" })}
            className={cn(
              "hidden min-h-10 items-center gap-2.5 rounded-[10px] px-3 text-sm font-semibold xl:inline-flex",
              overHero ? "hover:bg-sand-100" : "hover:bg-sand-100",
            )}
          >
            <Phone className="size-5 text-sunset-600" aria-hidden="true" />
            <span className="leading-tight">
              {phoneLabel}
              {hours && <span className="block text-xs font-normal text-ink-500">{hours}</span>}
            </span>
          </a>
          <CtaLink cta={booking} variant="primary" size="sm" className="hidden sm:inline-flex" context="header" showIcon={false} />
          <button
            ref={toggleRef}
            type="button"
            className={cn("inline-flex size-11 items-center justify-center rounded-[10px] lg:hidden", overHero ? "hover:bg-sand-100" : "hover:bg-sand-100")}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        ref={drawerRef}
        hidden={!open}
        className="h-[calc(100dvh-72px)] overflow-y-auto border-t border-line bg-paper text-ink-900 lg:hidden"
      >
        <nav aria-label="Mobile" className="container-wide py-4">
          <ul className="divide-y divide-line">
            {nav.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className="flex min-h-14 items-center text-lg font-medium aria-[current=page]:text-teal-700"
                >
                  {item.label}
                </Link>
                {item.children.length > 0 && (
                  <ul className="pb-3 pl-4">
                    {item.children.map((c) => (
                      <li key={c.id}>
                        <Link href={c.href} className="flex min-h-11 items-center text-ink-700">
                          {c.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-6 grid gap-3">
            <CtaLink cta={booking} size="lg" className="w-full" context="mobile_menu" />
            <a href={phoneHref} className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[10px] border border-ink-900/20 font-semibold" onClick={() => track("phone_click", { context: "mobile_menu" })}>
              <Phone className="size-4" aria-hidden="true" /> Call {phoneLabel}
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
