"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/server/admin/auth-actions";
import { Button } from "@/components/ui/button";
import { inputCls } from "@/components/admin/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      {state.error && (
        <p role="alert" className="rounded-md bg-danger-50 p-3 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} className={`${inputCls} mt-1 h-11`} />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold">
          Password
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={`${inputCls} mt-1 h-11`} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-xs text-ink-500">Forgot your password? Ask a Super Admin for a reset link.</p>
    </form>
  );
}
