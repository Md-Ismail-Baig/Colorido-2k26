"use client";

import { useActionState, useState } from "react";
import type { HostFormState } from "@/app/admin/hosts/actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-brand-gold focus:outline-none";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500";

function randomPassword() {
  const parts = ["Clr26", "xK", "9m", "Qv", "2z", "Rt"];
  return parts.join("") + Math.floor(10 + Math.random() * 89);
}

export function CreateHostForm({
  action,
}: {
  action: (state: HostFormState, formData: FormData) => Promise<HostFormState>;
}) {
  const [state, formAction] = useActionState(action, {});
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className={labelCls}>Full Name *</label>
        <input name="full_name" required minLength={2} maxLength={120} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Email *</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="host@college.edu"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Initial Password *</label>
        <div className="flex gap-2">
          <input
            name="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => setPassword(randomPassword())}
            className="whitespace-nowrap rounded-lg border border-slate-300 px-3 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
          >
            Generate
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Share the password with the host securely — they can change it later.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
          {state.ok} Assign their events below, then share the credentials.
        </p>
      )}

      <button
        type="submit"
        className="rounded-full bg-brand-deep-purple px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-gold"
      >
        Create Host Account
      </button>
    </form>
  );
}
