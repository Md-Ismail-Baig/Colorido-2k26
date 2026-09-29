"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { scheduleFormSchema } from "@/lib/validations/admin";

export interface SimpleFormState {
  error?: string;
  ok?: boolean;
}

function toRow(input: z.infer<typeof scheduleFormSchema>) {
  return {
    event_id: input.event_id,
    event_date: input.event_date,
    start_time: input.start_time || null,
    end_time: input.end_time || null,
    venue: input.venue || null,
    round: input.round || null,
    reporting_time: input.reporting_time || null,
    status: input.status,
    is_published: input.is_published ?? false,
  };
}

export async function createScheduleSlot(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  await requireRole("admin");
  const parsed = scheduleFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedules")
    .insert(toRow(parsed.data));
  if (error) {
    console.error("[admin/schedule] create failed:", error.message);
    return { error: "We couldn't create the schedule slot. Please try again." };
  }
  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
  return { ok: true };
}

export async function updateScheduleSlot(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Invalid slot id." };
  const parsed = scheduleFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedules")
    .update(toRow(parsed.data))
    .eq("id", id.data);
  if (error) {
    console.error("[admin/schedule] update failed:", error.message);
    return { error: "We couldn't save the slot. Please try again." };
  }
  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
  return { ok: true };
}

export async function deleteScheduleSlot(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", id.data);
  if (error) {
    console.error("[admin/schedule] delete failed:", error.message);
    return;
  }
  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
}
