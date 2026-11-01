"use client";

import { Phone } from "lucide-react";
import type { ResolvedCta } from "@/lib/cms/cta";
import { buttonVariants, type ButtonVariantProps } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/icons";
import { track } from "@/components/analytics/track";
import { cn } from "@/lib/utils";

/** Renders a resolved CMS button with the correct link semantics and a privacy-safe click event. */
export function CtaLink({
  cta,
  variant,
  size,
  className,
  context,
  showIcon = true,
}: {
  cta: ResolvedCta | null;
  className?: string;
  context?: string;
  showIcon?: boolean;
} & ButtonVariantProps) {
  if (!cta) return null;
  const isWa = cta.href.startsWith("https://wa.me/") || cta.href.includes("whatsform.com");
  const isTel = cta.href.startsWith("tel:");
  const resolvedVariant = variant ?? (isWa ? "whatsapp" : isTel ? "call" : "primary");
  return (
    <a
      href={cta.href}
      className={cn(buttonVariants({ variant: resolvedVariant, size }), className)}
      {...(cta.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      onClick={() => {
        if (cta.event) track(cta.event, { cta_label: cta.label, context: context ?? "" });
      }}
    >
      {showIcon && isWa && <WhatsAppIcon />}
      {showIcon && isTel && <Phone aria-hidden="true" />}
      <span>{cta.label}</span>
      {cta.external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}
