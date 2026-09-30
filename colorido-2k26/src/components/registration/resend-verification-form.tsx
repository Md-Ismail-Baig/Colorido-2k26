"use client";

import { useActionState } from "react";
import {
  resendVerificationEmail,
  type ResendState,
} from "@/app/(public)/registration/actions";

/**
 * "Resend verification email" control for pending registrations.
 * Rendered inside the pending banner on /registration/[id]; talks to the
 * rate-limited resendVerificationEmail server action.
 */
export function ResendVerificationForm({ registrationId }: { registrationId: string }) {
  const [state, formAction, pending] = useActionState<
    ResendState,
    FormData
  >(resendVerificationEmail, {});

  return (
    <div className="mt-4">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="registrationId" value={registrationId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand-deep-purple px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-gold transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Sending…" : "Resend verification email"}
        </button>
        <span className="text-[11px] text-slate-400">Max 5 per hour</span>
      </form>
      {state.ok && state.message && (
        <p
          role="status"
          className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"
        >
          {state.message}
        </p>
      )}
      {state.error && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          {state.error}
        </p>
      )}
    </div>
  );
}
