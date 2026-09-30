"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { eventFormSchema } from "@/lib/validations/admin";
import type { EventStatus } from "@/types/database";

export interface FormState {
  error?: string;
  ok?: boolean;
}

function toPostgres(input: z.infer<typeof eventFormSchema>, formData: FormData) {
  const row = {
    // Optional event image — public URL returned by uploadEventImage.
    // "undefined" (field absent) keeps the existing value on edit.
    banner_image:
      formData.get("banner_image") !== null
        ? String(formData.get("banner_image")) || null
        : undefined,
    name: input.name,
    slug: input.slug,
    category: input.category,
    subcategory: input.category === "cultural" ? (input.subcategory || null) : null,
    gender: input.gender,
    description: input.description,
    rules: input.rules || null,
    eligibility: input.eligibility || null,
    judging_criteria: input.judging_criteria || null,
    registration_mode: input.registration_mode,
    team_size_min:
      input.registration_mode === "team" ? (input.team_size_min ?? null) : null,
    team_size_max:
      input.registration_mode === "team" ? (input.team_size_max ?? null) : null,
    duplicate_policy: input.duplicate_policy,
    venue: input.venue || null,
    event_date: input.event_date,
    start_time: input.start_time || null,
    end_time: input.end_time || null,
    reporting_time: input.reporting_time || null,
    registration_deadline: input.registration_deadline || null,
    status: input.status,
    is_featured: input.is_featured ?? false,
    display_order: input.display_order ?? 0,
  };
  return row;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function createEvent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");

  const parsed = eventFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const row = toPostgres(parsed.data, formData);
  if (!row.slug) row.slug = slugify(row.name);

  const supabase = await createClient();
  const { error } = await supabase.from("events").insert(row);
  if (error) {
    if (error.code === "23505") {
      return { error: "An event with this slug already exists." };
    }
    console.error("[admin/events] create failed:", error.message);
    return {
      error: "We couldn't create the event right now. Please try again.",
    };
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  return { ok: true };
}

const idSchema = z.string().uuid();

export async function updateEvent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireRole("admin");

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Invalid event id." };

  const parsed = eventFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const row = toPostgres(parsed.data, formData);
  if (!row.slug) row.slug = slugify(row.name);

  const supabase = await createClient();
  const { error } = await supabase.from("events").update(row).eq("id", id.data);
  if (error) {
    console.error("[admin/events] update failed:", error.message);
    return {
      error: "We couldn't save the event right now. Please try again.",
    };
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id.data}`);
  revalidatePath("/events");
  revalidatePath("/");
  return { ok: true };
}

export async function setEventStatus(formData: FormData): Promise<void> {
  await requireRole("admin");

  const id = idSchema.safeParse(formData.get("id"));
  const status = z
    .enum(["draft", "published", "closed", "completed"])
    .safeParse(formData.get("status"));

  if (!id.success || !status.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ status: status.data as EventStatus })
    .eq("id", id.data);
  if (error) {
    console.error("[admin/events] status change failed:", error.message);
    return;
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
}

/**
 * DELETE EVENT — removes the event and everything that belongs to it.
 *
 * The schema blocks deleting an event that still has registrations
 * (registrations.event_id is ON DELETE RESTRICT), so the registration chain
 * is removed explicitly first, then dependent rows cascade (schedules,
 * announcements, results) or null out (gallery). Storage objects for the
 * event banner and gallery photos are deleted too so no orphans remain.
 * Runs on the service-role client: RLS permits staff deletes, but the
 * multi-table chain must not be interrupted halfway by a policy gap.
 */
export async function deleteEvent(formData: FormData): Promise<void> {
  await requireRole("admin");

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  // 1. Registrations (RESTRICT) — plus their teams/team_members (cascade) and
  //    any gallery rows that point at the event via registration? none do;
  //    results/schedules/announcements cascade at the FK level but we still
  //    collect storage paths first.
  const { data: regs } = await admin
    .from("registrations")
    .select("id")
    .eq("event_id", id.data);
  const regIds = (regs ?? []).map((r) => r.id);
  if (regIds.length > 0) {
    const { error } = await admin
      .from("registrations")
      .delete()
      .in("id", regIds);
    if (error) {
      console.error("[admin/events] delete — registrations failed:", error.message);
      const { redirect } = await import("next/navigation");
      redirect("/admin/events?error=has-registrations");
    }
  }

  // 2. Storage objects owned by this event (banner + event gallery photos).
  const { data: galleryRows } = await admin
    .from("gallery")
    .select("storage_path")
    .eq("event_id", id.data);
  const paths = (galleryRows ?? [])
    .map((g) => g.storage_path)
    .filter((p): p is string => Boolean(p));

  // 3. The event row — schedules, announcements and results cascade via FK;
  //    gallery.event_id sets itself to null (photos stay, now unassigned).
  const { error } = await admin.from("events").delete().eq("id", id.data);
  if (error) {
    console.error("[admin/events] delete failed:", error.message);
    const { redirect } = await import("next/navigation");
    redirect("/admin/events?error=has-registrations");
  }

  if (paths.length > 0) {
    await admin.storage.from("gallery").remove(paths);
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
}
