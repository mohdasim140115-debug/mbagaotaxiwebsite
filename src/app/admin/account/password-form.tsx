"use client";

import Link from "next/link";
import { useActionState } from "react";
import { changePasswordAction, type PasswordState } from "@/server/admin/auth-actions";
import { Button } from "@/components/ui/button";
import { Notice, inputCls } from "@/components/admin/ui";

export function PasswordForm() {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="mt-3 space-y-4">
      {state.error && <Notice kind="error">{state.error}</Notice>}
      {state.success && (
        <Notice kind="success">
          {state.success}{" "}
          <Link href="/admin/" className="underline">
            Continue to dashboard
          </Link>
        </Notice>
      )}
      {[
        ["current", "Current password", "current-password"],
        ["next", "New password (12+ characters)", "new-password"],
        ["confirm", "Confirm new password", "new-password"],
      ].map(([name, label, ac]) => (
        <div key={name}>
          <label htmlFor={name} className="block text-sm font-semibold">
            {label}
          </label>
          <input id={name} name={name} type="password" autoComplete={ac} required className={`${inputCls} mt-1 h-11`} />
        </div>
      ))}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
