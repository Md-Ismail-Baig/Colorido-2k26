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

function toPostgres(input: z.infer<typeof eventFormSchema>) {
  const row = {
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
  const row = toPostgres(parsed.data);
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
  const row = toPostgres(parsed.data);
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

export async function deleteEvent(formData: FormData): Promise<void> {
  await requireRole("admin");

  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  // FK constraint blocks deletes with registrations — surface a clear error
  // via redirect param instead of a stack trace.
  const { error } = await supabase.from("events").delete().eq("id", id.data);
  if (error) {
    console.error("[admin/events] delete failed:", error.message);
    const { redirect } = await import("next/navigation");
    redirect("/admin/events?error=has-registrations");
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
}
