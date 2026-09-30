"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Event } from "@/types/database";
import type { FormState } from "@/app/admin/events/actions";
import {
  uploadEventImage,
  type UploadResult,
} from "@/app/admin/events/upload-image";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-brand-gold focus:outline-none";
const labelCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500";

const CULTURAL_SUBCATEGORIES = [
  ["fine_arts", "Fine Arts"],
  ["music", "Music"],
  ["dance", "Dance"],
  ["choreoday", "Choreoday"],
  ["dramatics", "Dramatics"],
  ["fashion_show", "Fashion Show"],
  ["tekraft", "Tekraft"],
  ["literary", "Literary"],
] as const;

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export function EventForm({
  action,
  event,
  submitLabel,
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  event?: Event;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [category, setCategory] = useState(event?.category ?? "cultural");
  const [mode, setMode] = useState(event?.registration_mode ?? "individual");
  const [slug, setSlug] = useState(event?.slug ?? "");

  // Event image (banner) — uploaded to Supabase Storage via the
  // uploadEventImage server action; the resulting public URL rides into the
  // form as banner_image and lands in the events table on save.
  const [bannerImage, setBannerImage] = useState(event?.banner_image ?? "");
  const [imgError, setImgError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async (file: File | undefined) => {
    setImgError(null);
    if (!file) return;
    if (file.size >= 1024 * 1024) {
      setImgError("Image must be below 1 MB — pick a smaller one.");
      return;
    }
    if (!slug) {
      setImgError("Fill in the slug first, then upload the image.");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("category", category);
    fd.set("slug", slug);
    const res = await uploadEventImage({}, fd);
    setUploading(false);
    if (res.url) {
      setBannerImage(res.url);
    } else {
      setImgError(res.error ?? "The upload failed. Please try again.");
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      {event && <input type="hidden" name="id" value={event.id} />}

      <div className="grid gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <Field label="Event Name *">
          <input
            name="name"
            required
            defaultValue={event?.name}
            className={inputCls}
            placeholder="e.g. Dance — Solo"
          />
        </Field>
        <Field label="Slug (URL) *">
          <input
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            defaultValue={event?.slug}
            onChange={(e) => setSlug(e.target.value)}
            className={inputCls}
            placeholder="dance-solo"
          />
        </Field>

        <Field label="Category *">
          <select
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as "cultural" | "sports")}
            className={inputCls}
          >
            <option value="cultural">Cultural</option>
            <option value="sports">Sports</option>
          </select>
        </Field>

        {category === "cultural" && (
          <Field label="Subcategory *">
            <select
              name="subcategory"
              defaultValue={event?.subcategory ?? ""}
              className={inputCls}
            >
              <option value="">Select…</option>
              {CULTURAL_SUBCATEGORIES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Division *">
          <select
            name="gender"
            defaultValue={event?.gender ?? "open"}
            className={inputCls}
          >
            <option value="open">Open</option>
            <option value="boys">Boys</option>
            <option value="girls">Girls</option>
          </select>
        </Field>

        <Field label="Registration Mode *">
          <select
            name="registration_mode"
            value={mode}
            onChange={(e) =>
              setMode(e.target.value as "individual" | "team")
            }
            className={inputCls}
          >
            <option value="individual">Individual</option>
            <option value="team">Team</option>
          </select>
        </Field>

        {mode === "team" && (
          <>
            <Field label="Team Size Min *">
              <input
                name="team_size_min"
                type="number"
                min={1}
                max={50}
                required
                defaultValue={event?.team_size_min ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label="Team Size Max *">
              <input
                name="team_size_max"
                type="number"
                min={1}
                max={50}
                required
                defaultValue={event?.team_size_max ?? ""}
                className={inputCls}
              />
            </Field>
          </>
        )}

        <Field label="Duplicate Policy *">
          <select
            name="duplicate_policy"
            defaultValue={event?.duplicate_policy ?? "college_roll_event"}
            className={inputCls}
          >
            <option value="college_roll_event">
              One per student per event (college + roll)
            </option>
            <option value="event">One per email per event</option>
          </select>
        </Field>

        <Field label="Status *">
          <select
            name="status"
            defaultValue={event?.status ?? "draft"}
            className={inputCls}
          >
            <option value="draft">Draft (hidden from public)</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
            <option value="completed">Completed</option>
          </select>
        </Field>

        <Field label="Event Date *" full>
          <input
            name="event_date"
            type="date"
            required
            defaultValue={event?.event_date ?? "2026-12-28"}
            className={inputCls}
          />
        </Field>

        <Field label="Start Time">
          <input
            name="start_time"
            type="time"
            defaultValue={event?.start_time ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="End Time">
          <input
            name="end_time"
            type="time"
            defaultValue={event?.end_time ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Reporting Time">
          <input
            name="reporting_time"
            type="time"
            defaultValue={event?.reporting_time ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Registration Deadline">
          <input
            name="registration_deadline"
            type="date"
            defaultValue={event?.registration_deadline ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Venue">
          <input
            name="venue"
            defaultValue={event?.venue ?? ""}
            className={inputCls}
            placeholder="Leave blank for “To be announced”"
          />
        </Field>

        <Field label="Event Image" full>
          <div className="rounded-xl border border-slate-200 p-4">
            {bannerImage ? (
              <div className="mb-3 flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerImage}
                  alt="Event preview"
                  className="h-20 w-32 rounded-lg border border-slate-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setBannerImage("")}
                  className="text-xs font-semibold uppercase tracking-wider text-red-600 hover:underline"
                >
                  Remove image
                </button>
              </div>
            ) : (
              <p className="mb-3 text-xs text-slate-500">
                No image yet — shown on the event card, the event page hero and
                wherever the event appears.
              </p>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => void pickImage(e.target.files?.[0])}
              disabled={!slug || uploading}
              className="w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-brand-cream-dark file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wider file:text-brand-burgundy disabled:opacity-50"
            />
            {!slug && (
              <p className="mt-1 text-xs text-amber-600">
                Fill in the slug first, then upload the image.
              </p>
            )}
            {uploading && (
              <p className="mt-1 text-xs text-slate-500">Uploading…</p>
            )}
            {(imgError) && (
              <p role="alert" className="mt-2 text-xs text-red-600">
                {imgError}
              </p>
            )}
            <p className="mt-2 text-[11px] text-slate-400">
              JPG / PNG / WebP / GIF · below 1 MB
            </p>
            <input type="hidden" name="banner_image" value={bannerImage} />
          </div>
        </Field>

        <Field label="Description *" full>
          <textarea
            name="description"
            required
            rows={3}
            defaultValue={event?.description}
            className={inputCls}
          />
        </Field>
        <Field label="Rules" full>
          <textarea
            name="rules"
            rows={4}
            defaultValue={event?.rules ?? ""}
            className={inputCls}
            placeholder="One rule per line"
          />
        </Field>
        <Field label="Eligibility" full>
          <textarea
            name="eligibility"
            rows={2}
            defaultValue={event?.eligibility ?? ""}
            className={inputCls}
          />
        </Field>
        <Field label="Judging Criteria" full>
          <textarea
            name="judging_criteria"
            rows={2}
            defaultValue={event?.judging_criteria ?? ""}
            className={inputCls}
          />
        </Field>

        <Field label="Display Order">
          <input
            name="display_order"
            type="number"
            min={0}
            max={999}
            defaultValue={event?.display_order ?? 0}
            className={inputCls}
          />
        </Field>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={event?.is_featured ?? false}
              value="true"
              className="h-4 w-4 rounded border-slate-300"
            />
            Featured on home page
          </label>
        </div>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-full bg-brand-deep-purple px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-gold transition hover:bg-brand-purple"
        >
          {submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-full border border-slate-300 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
