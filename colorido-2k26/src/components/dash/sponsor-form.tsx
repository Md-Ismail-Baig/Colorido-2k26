"use client";

import { useActionState } from "react";
import type { SimpleFormState } from "@/app/admin/gallery/actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-brand-gold focus:outline-none";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500";

export function SponsorForm({
  action,
  submitLabel,
}: {
  action: (state: SimpleFormState, formData: FormData) => Promise<SimpleFormState>;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label className={labelCls}>Name *</label>
        <input name="name" required minLength={2} maxLength={200} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Website</label>
        <input
          name="website"
          type="url"
          placeholder="https://…"
          className={inputCls}
        />
      </div>
      <div>
        <label className={labelCls}>Logo (optional)</label>
        <input
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-brand-cream file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wider file:text-brand-burgundy"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          JPG / PNG / WebP / GIF · max 8 MB — stored in Supabase Storage.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Tier *</label>
          <select name="tier" defaultValue="associate" className={inputCls}>
            <option value="title">Title</option>
            <option value="platinum">Platinum</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="associate">Associate</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Display Order</label>
          <input name="display_order" type="number" min={0} max={999} defaultValue={0} className={inputCls} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="is_active"
          value="true"
          defaultChecked
          className="h-4 w-4 rounded border-slate-300"
        />
        Active (visible publicly)
      </label>

      {state.error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
          Sponsor added.
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
