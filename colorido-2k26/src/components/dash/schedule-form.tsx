"use client";

import { useActionState } from "react";
import { scheduleFormSchema, type ScheduleFormInput } from "@/lib/validations/admin";
import type { SimpleFormState } from "@/app/admin/schedule/actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-brand-gold focus:outline-none";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500";

export function ScheduleForm({
  action,
  events,
  slot,
  submitLabel,
}: {
  action: (state: SimpleFormState, formData: FormData) => Promise<SimpleFormState>;
  events: { id: string; name: string }[];
  slot?: ScheduleFormInput & { id?: string };
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      {slot?.id && <input type="hidden" name="id" value={slot.id} />}

      <div className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Event *</label>
          <select name="event_id" required defaultValue={slot?.event_id ?? ""} className={inputCls}>
            <option value="">Select event…</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Date *</label>
          <input
            name="event_date"
            type="date"
            required
            defaultValue={slot?.event_date ?? "2026-12-28"}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Round</label>
          <input
            name="round"
            defaultValue={slot?.round ?? ""}
            placeholder="e.g. Prelims / Finals"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Start Time</label>
          <input name="start_time" type="time" defaultValue={slot?.start_time ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>End Time</label>
          <input name="end_time" type="time" defaultValue={slot?.end_time ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Reporting Time</label>
          <input name="reporting_time" type="time" defaultValue={slot?.reporting_time ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Venue</label>
          <input name="venue" defaultValue={slot?.venue ?? ""} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Status *</label>
          <select name="status" defaultValue={slot?.status ?? "scheduled"} className={inputCls}>
            <option value="scheduled">Scheduled</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="is_published"
              value="true"
              defaultChecked={slot?.is_published ?? false}
              className="h-4 w-4 rounded border-slate-300"
            />
            Published (visible to public)
          </label>
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

// Keep the schema import referenced for callers that validate client-side.
export { scheduleFormSchema };
export type { ScheduleFormInput };
