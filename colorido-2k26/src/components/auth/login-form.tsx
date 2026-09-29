"use client";

import { useActionState } from "react";
import { signInStaff, type StaffLoginState } from "@/lib/auth/actions";
import { useFormStatus } from "react-dom";

const initialState: StaffLoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-gold via-brand-light-gold to-brand-gold px-6 py-2.5 text-sm font-semibold uppercase tracking-wider text-brand-deep-purple transition hover:shadow-lg hover:shadow-brand-gold/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign In"}
    </button>
  );
}

/** Staff login form — real pending state + server-validated error display. */
export function LoginForm() {
  const [state, formAction] = useActionState(signInStaff, initialState);

  return (
    <form action={formAction}>
      <div className="space-y-3">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/70"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40"
            placeholder="you@college.edu"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/70"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40"
            placeholder="••••••••"
          />
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
