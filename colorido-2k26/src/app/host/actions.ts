"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertHostEvent } from "@/lib/queries/host-events";
import {
  scheduleFormSchema,
  announcementFormSchema,
  resultFormSchema,
} from "@/lib/validations/admin";

export interface SimpleFormState {
  error?: string;
  ok?: boolean;
}

const idSchema = z.string().uuid();

// ------------------------------------------------------------ schedule ----

export async function hostCreateScheduleSlot(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const { profile } = await requireRole("event_host");
  const parsed = scheduleFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await assertHostEvent(profile.id, parsed.data.event_id); // 404 if not assigned

  const supabase = await createClient();
  const { error } = await supabase.from("schedules").insert({
    event_id: parsed.data.event_id,
    event_date: parsed.data.event_date,
    start_time: parsed.data.start_time || null,
    end_time: parsed.data.end_time || null,
    venue: parsed.data.venue || null,
    round: parsed.data.round || null,
    reporting_time: parsed.data.reporting_time || null,
    status: parsed.data.status,
    is_published: parsed.data.is_published ?? false,
  });
  if (error) {
    console.error("[host/schedule] create failed:", error.message);
    return { error: "We couldn't create the schedule slot. Please try again." };
  }
  revalidatePath("/host/schedule");
  revalidatePath("/schedule");
  return { ok: true };
}

export async function hostDeleteScheduleSlot(formData: FormData): Promise<void> {
  const { profile } = await requireRole("event_host");
  const id = idSchema.safeParse(formData.get("id"));
  const eventId = idSchema.safeParse(formData.get("event_id"));
  if (!id.success || !eventId.success) return;
  await assertHostEvent(profile.id, eventId.data);

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", id.data)
    .eq("event_id", eventId.data); // scope delete to the assigned event
  if (error) {
    console.error("[host/schedule] delete failed:", error.message);
    return;
  }
  revalidatePath("/host/schedule");
  revalidatePath("/schedule");
}

// ------------------------------------------------------- announcements ----

export async function hostCreateAnnouncement(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const { profile } = await requireRole("event_host");
  const parsed = announcementFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const eventId = parsed.data.event_id || "";
  await assertHostEvent(profile.id, eventId);

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    title: parsed.data.title,
    description: parsed.data.description,
    scope: "event",
    event_id: eventId,
    priority: parsed.data.priority,
    status: parsed.data.status,
    published_at:
      parsed.data.status === "published" ? new Date().toISOString() : null,
    expiry_date: parsed.data.expiry_date || null,
  });
  if (error) {
    console.error("[host/announcements] create failed:", error.message);
    return { error: "We couldn't create the announcement. Please try again." };
  }
  revalidatePath("/host/announcements");
  revalidatePath("/announcements");
  revalidatePath("/");
  return { ok: true };
}

export async function hostDeleteAnnouncement(formData: FormData): Promise<void> {
  const { profile } = await requireRole("event_host");
  const id = idSchema.safeParse(formData.get("id"));
  const eventId = idSchema.safeParse(formData.get("event_id"));
  if (!id.success || !eventId.success) return;
  await assertHostEvent(profile.id, eventId.data);

  const supabase = await createClient();
  // Delete only announcements belonging to the assigned event.
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id.data)
    .eq("event_id", eventId.data)
    .eq("scope", "event");
  if (error) {
    console.error("[host/announcements] delete failed:", error.message);
    return;
  }
  revalidatePath("/host/announcements");
  revalidatePath("/announcements");
}

// -------------------------------------------------- registration status ----

/**
 * Host check-in/status update. The registration must belong to one of the
 * host's assigned events — verified before the write.
 */
export async function hostSetRegistrationStatus(formData: FormData): Promise<void> {
  const { profile } = await requireRole("event_host");
  const id = idSchema.safeParse(formData.get("id"));
  const status = z
    .enum(["pending", "confirmed", "cancelled", "rejected", "checked_in"])
    .safeParse(formData.get("status"));
  if (!id.success || !status.success) return;

  // Scope check first (404-safe via assertHostEvent), then the write via the
  // service-role client — RLS has no registrations UPDATE policy (migration
  // 0005 adds it for defense-in-depth), so unscoped user-client writes would
  // be silently dropped.
  const supabase = await createClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select("event_id")
    .eq("id", id.data)
    .single();
  if (!reg?.event_id) return;
  await assertHostEvent(profile.id, reg.event_id);

  const admin = createAdminClient();
  const { error } = await admin
    .from("registrations")
    .update({ status: status.data })
    .eq("id", id.data);
  if (error) {
    console.error("[host/registrations] status failed:", error.message);
    return;
  }
  revalidatePath("/host/registrations");
}

// -------------------------------------------------------------- results ----

export async function hostCreateResult(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const { profile } = await requireRole("event_host");
  const parsed = resultFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  await assertHostEvent(profile.id, parsed.data.event_id);

  const supabase = await createClient();
  const { error } = await supabase.from("results").insert({
    event_id: parsed.data.event_id,
    position: parsed.data.position,
    participant_name: parsed.data.participant_name || null,
    team_name: parsed.data.team_name || null,
    college: parsed.data.college || null,
    score: parsed.data.score || null,
    remarks: parsed.data.remarks || null,
    status: parsed.data.status,
    published_at:
      parsed.data.status === "published" ? new Date().toISOString() : null,
  });
  if (error) {
    console.error("[host/results] create failed:", error.message);
    return { error: "We couldn't create the result. Please try again." };
  }
  revalidatePath("/host/results");
  revalidatePath("/results");
  return { ok: true };
}

export async function hostDeleteResult(formData: FormData): Promise<void> {
  const { profile } = await requireRole("event_host");
  const id = idSchema.safeParse(formData.get("id"));
  const eventId = idSchema.safeParse(formData.get("event_id"));
  if (!id.success || !eventId.success) return;
  await assertHostEvent(profile.id, eventId.data);

  const supabase = await createClient();
  const { error } = await supabase
    .from("results")
    .delete()
    .eq("id", id.data)
    .eq("event_id", eventId.data);
  if (error) {
    console.error("[host/results] delete failed:", error.message);
    return;
  }
  revalidatePath("/host/results");
  revalidatePath("/results");
}
