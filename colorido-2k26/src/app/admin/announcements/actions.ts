"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { announcementFormSchema } from "@/lib/validations/admin";

export interface SimpleFormState {
  error?: string;
  ok?: boolean;
}

function toRow(input: z.infer<typeof announcementFormSchema>) {
  return {
    title: input.title,
    description: input.description,
    scope: input.scope,
    event_id: input.scope === "event" ? (input.event_id || null) : null,
    priority: input.priority,
    status: input.status,
    published_at:
      input.status === "published"
        ? (input.published_at ? new Date(input.published_at).toISOString() : new Date().toISOString())
        : null,
    expiry_date: input.expiry_date || null,
  };
}

export async function createAnnouncement(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  await requireRole("admin");
  const parsed = announcementFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .insert(toRow(parsed.data));
  if (error) {
    console.error("[admin/announcements] create failed:", error.message);
    return { error: "We couldn't create the announcement. Please try again." };
  }
  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  revalidatePath("/");
  return { ok: true };
}

export async function updateAnnouncement(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Invalid announcement id." };
  const parsed = announcementFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update(toRow(parsed.data))
    .eq("id", id.data);
  if (error) {
    console.error("[admin/announcements] update failed:", error.message);
    return { error: "We couldn't save the announcement. Please try again." };
  }
  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteAnnouncement(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id.data);
  if (error) {
    console.error("[admin/announcements] delete failed:", error.message);
    return;
  }
  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  revalidatePath("/");
}

export async function setAnnouncementStatus(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  const status = z
    .enum(["draft", "published", "expired"])
    .safeParse(formData.get("status"));
  if (!id.success || !status.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({
      status: status.data,
      published_at:
        status.data === "published" ? new Date().toISOString() : null,
    })
    .eq("id", id.data);
  if (error) {
    console.error("[admin/announcements] status failed:", error.message);
    return;
  }
  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  revalidatePath("/");
}
