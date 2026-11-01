"use client";

import { useState, useTransition } from "react";
import { Button, type ButtonVariantProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const inputCls =
  "h-10 w-full rounded-[6px] border border-line bg-white px-3 text-[0.9375rem] text-ink-900 placeholder:text-ink-500 focus:border-teal-600 aria-[invalid=true]:border-danger disabled:bg-sand-100";

export function Field({ id, label, help, error, children, className }: { id: string; label: string; help?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink-900">
        {label}
      </label>
      {help && <p className="text-xs text-ink-500">{help}</p>}
      <div className="mt-1">{children}</div>
      {error && (
        <p id={`${id}-err`} className="mt-1 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Card({ title, children, actions, className }: { title?: string; children: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[10px] border border-line bg-white", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  published: "bg-[#e6f4ec] text-success",
  draft: "bg-sand-100 text-ink-700",
  archived: "bg-[#f1f1f1] text-ink-500",
  new: "bg-sunset-50 text-sunset-600",
  contacted: "bg-teal-50 text-teal-700",
  quoted: "bg-teal-50 text-teal-700",
  booked: "bg-[#e6f4ec] text-success",
  closed: "bg-[#f1f1f1] text-ink-500",
  spam: "bg-danger-50 text-danger",
  owner: "bg-[#e6f4ec] text-success",
  licensed: "bg-teal-50 text-teal-700",
  pending: "bg-sunset-50 text-sunset-600",
  do_not_use: "bg-danger-50 text-danger",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[value] ?? "bg-sand-100 text-ink-700")}>{label ?? value.replace(/_/g, " ")}</span>;
}

export function Notice({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-[8px] px-4 py-3 text-sm",
        kind === "error" && "border border-danger/30 bg-danger-50 text-danger",
        kind === "success" && "border border-success/30 bg-[#ecf7f1] text-success",
        kind === "info" && "border border-teal-600/20 bg-teal-50 text-teal-700",
      )}
    >
      {children}
    </div>
  );
}

export type Result = { ok: true; message?: string; data?: unknown } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Button that runs a server action, optionally after a confirm() prompt, and reports the result. */
export function ActionButton({
  action,
  confirmText,
  children,
  onDone,
  variant = "secondary",
  size = "sm",
}: {
  action: () => Promise<Result>;
  confirmText?: string;
  children: React.ReactNode;
  onDone?: (r: Result) => void;
} & ButtonVariantProps) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Result | null>(null);
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          start(async () => {
            const r = await action();
            setMsg(r);
            onDone?.(r);
          });
        }}
      >
        {pending ? "Working…" : children}
      </Button>
      {msg && !msg.ok && <span role="alert" className="max-w-xs text-xs text-danger">{msg.error}</span>}
    </span>
  );
}

export function PageTitle({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-ink-700">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
