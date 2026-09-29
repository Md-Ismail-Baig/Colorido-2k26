"use client";

import { useActionState } from "react";
import type { SimpleFormState } from "@/app/admin/results/actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-brand-gold focus:outline-none";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500";

export function ResultForm({
  action,
  events,
  submitLabel,
  lockEventId,
}: {
  action: (state: SimpleFormState, formData: FormData) => Promise<SimpleFormState>;
  events: { id: string; name: string }[];
  submitLabel: string;
  lockEventId?: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {lockEventId ? (
        <input type="hidden" name="event_id" value={lockEventId} />
      ) : (
        <div>
          <label className={labelCls}>Event *</label>
          <select name="event_id" required defaultValue="" className={inputCls}>
            <option value="">Select event…</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Position *</label>
          <input name="position" type="number" min={1} max={999} required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Score</label>
          <input name="score" maxLength={60} placeholder="e.g. 92/100" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Participant Name</label>
          <input name="participant_name" maxLength={120} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Team Name</label>
          <input name="team_name" maxLength={120} className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>College</label>
          <input name="college" maxLength={200} className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Remarks</label>
          <input name="remarks" maxLength={500} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Status *</label>
          <select name="status" defaultValue="draft" className={inputCls}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        className="rounded-full bg-brand-deep-purple px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-gold"
      >
        {submitLabel}
      </button>
    </form>
  );
}
