"use client";

import { useActionState, useRef, useState } from "react";
import type { SimpleFormState } from "@/app/admin/gallery/actions";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-brand-gold focus:outline-none";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_MB = 1;

export function GalleryUploadForm({
  action,
  events,
}: {
  action: (state: SimpleFormState, formData: FormData) => Promise<SimpleFormState>;
  events: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(action, {});
  const [clientError, setClientError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        setClientError(null);
        formAction(fd);
      }}
      onSubmit={(e) => {
        const file = (e.currentTarget.elements.namedItem("file") as HTMLInputElement)
          ?.files?.[0];
        if (!file) {
          e.preventDefault();
          setClientError("Choose a photo to upload.");
          return;
        }
        if (!ALLOWED.includes(file.type)) {
          e.preventDefault();
          setClientError("Only JPG, PNG, WebP or GIF images are allowed.");
          return;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
          e.preventDefault();
          setClientError(`Photo is too large — maximum ${MAX_MB} MB.`);
        }
      }}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className={labelCls}>Photo *</label>
        <input
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          required
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-brand-cream-dark file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wider file:text-brand-burgundy"
        />
        {fileName && (
          <p className="mt-1 text-xs text-slate-400">{fileName}</p>
        )}
      </div>
      <div>
        <label className={labelCls}>Title</label>
        <input name="title" maxLength={200} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Category *</label>
        <select name="category" defaultValue="cultural" className={inputCls}>
          <option value="cultural">Cultural</option>
          <option value="sports">Sports</option>
          <option value="behind_the_scenes">Behind the scenes</option>
          <option value="previous_editions">Previous editions</option>
        </select>
      </div>
      <div>
        <label className={labelCls}>Associated Event</label>
        <select name="event_id" defaultValue="" className={inputCls}>
          <option value="">None</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {(clientError || state.error) && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {clientError ?? state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
          Photo uploaded and published.
        </p>
      )}

      <button
        type="submit"
        className="rounded-full bg-brand-deep-purple px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-gold"
      >
        Upload Photo
      </button>
      <p className="text-[11px] text-slate-400">
        JPG / PNG / WebP / GIF · max {MAX_MB} MB · stored in Supabase Storage
      </p>
    </form>
  );
}
