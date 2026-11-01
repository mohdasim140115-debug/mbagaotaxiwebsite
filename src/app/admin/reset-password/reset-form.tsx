"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetPasswordAction, type PasswordState } from "@/server/admin/auth-actions";
import { Button } from "@/components/ui/button";
import { Notice, inputCls } from "@/components/admin/ui";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(resetPasswordAction, {});
  if (state.success) {
    return (
      <div className="mt-6 space-y-4">
        <Notice kind="success">{state.success}</Notice>
        <Link href="/admin/login/" className="font-semibold text-teal-700 underline">
          Go to sign in
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="mt-6 space-y-4">
      {state.error && <Notice kind="error">{state.error}</Notice>}
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="next" className="block text-sm font-semibold">
          New password
        </label>
        <input id="next" name="next" type="password" minLength={12} autoComplete="new-password" required className={`${inputCls} mt-1 h-11`} />
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-semibold">
          Confirm new password
        </label>
        <input id="confirm" name="confirm" type="password" minLength={12} autoComplete="new-password" required className={`${inputCls} mt-1 h-11`} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}
