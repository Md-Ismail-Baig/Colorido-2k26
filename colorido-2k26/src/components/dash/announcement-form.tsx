"use client";

import { useActionState, useState } from "react";
import type { SimpleFormState } from "@/app/admin/announcements/actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-brand-gold focus:outline-none";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500";

export function AnnouncementForm({
  action,
  events,
  submitLabel,
  lockEventId,
  hostMode,
}: {
  action: (state: SimpleFormState, formData: FormData) => Promise<SimpleFormState>;
  events: { id: string; name: string }[];
  submitLabel: string;
  /** Host console: scope is fixed to this event. */
  lockEventId?: string;
  /** Host console, multiple events: scope pinned to "event" but event still selectable. */
  hostMode?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const [scope, setScope] = useState(lockEventId ? "event" : "festival");

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {lockEventId && (
        <input type="hidden" name="event_id" value={lockEventId} />
      )}

      <div>
        <label className={labelCls}>Title *</label>
        <input name="title" required minLength={3} maxLength={200} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Description *</label>
        <textarea name="description" required rows={4} maxLength={4000} className={inputCls} />
      </div>

      {hostMode && (
        <>
          <div>
            <label className={labelCls}>Scope</label>
            <input
              value="Event-specific"
              readOnly
              disabled
              className={`${inputCls} bg-slate-50 text-slate-500`}
            />
          </div>
          <div>
            <label className={labelCls}>Event *</label>
            <select name="event_id" required className={inputCls} defaultValue="">
              <option value="">Select event…</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      {!lockEventId && !hostMode && (
        <>
          <div>
            <label className={labelCls}>Scope *</label>
            <select
              name="scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className={inputCls}
            >
              <option value="festival">Festival-wide</option>
              <option value="event">Event-specific</option>
            </select>
          </div>
          {scope === "event" && (
            <div>
              <label className={labelCls}>Event *</label>
              <select name="event_id" required className={inputCls} defaultValue="">
                <option value="">Select event…</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Priority *</label>
          <select name="priority" defaultValue="normal" className={inputCls}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Status *</label>
          <select name="status" defaultValue="draft" className={inputCls}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Expiry Date</label>
          <input name="expiry_date" type="date" className={inputCls} />
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
