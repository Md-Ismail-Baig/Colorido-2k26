"use client";

import { useFormStatus } from "react-dom";

function SelectControl({
  options,
  value,
}: {
  options: string[];
  value: string;
}) {
  const { pending } = useFormStatus();
  return (
    <select
      name="status"
      aria-label="Change status"
      defaultValue={value}
      disabled={pending}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium capitalize text-slate-700 disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}

/**
 * Inline status <select> that submits the given server action on change.
 */
export function StatusSelect({
  action,
  id,
  options,
  value,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  options: string[];
  value: string;
}) {
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <SelectControl options={options} value={value} />
    </form>
  );
}
