"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { resultFormSchema } from "@/lib/validations/admin";

export interface SimpleFormState {
  error?: string;
  ok?: boolean;
}

function toRow(input: z.infer<typeof resultFormSchema>) {
  return {
    event_id: input.event_id,
    position: input.position,
    participant_name: input.participant_name || null,
    team_name: input.team_name || null,
    college: input.college || null,
    score: input.score || null,
    remarks: input.remarks || null,
    status: input.status,
    published_at:
      input.status === "published" ? new Date().toISOString() : null,
  };
}

export async function createResult(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  await requireRole("admin");
  const parsed = resultFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("results").insert(toRow(parsed.data));
  if (error) {
    console.error("[admin/results] create failed:", error.message);
    return { error: "We couldn't create the result. Please try again." };
  }
  revalidatePath("/admin/results");
  revalidatePath("/results");
  return { ok: true };
}

export async function updateResult(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { error: "Invalid result id." };
  const parsed = resultFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("results")
    .update(toRow(parsed.data))
    .eq("id", id.data);
  if (error) {
    console.error("[admin/results] update failed:", error.message);
    return { error: "We couldn't save the result. Please try again." };
  }
  revalidatePath("/admin/results");
  revalidatePath("/results");
  return { ok: true };
}

export async function deleteResult(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  const { error } = await supabase.from("results").delete().eq("id", id.data);
  if (error) {
    console.error("[admin/results] delete failed:", error.message);
    return;
  }
  revalidatePath("/admin/results");
  revalidatePath("/results");
}

export async function setResultStatus(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  const status = z.enum(["draft", "published"]).safeParse(formData.get("status"));
  if (!id.success || !status.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("results")
    .update({
      status: status.data,
      published_at: status.data === "published" ? new Date().toISOString() : null,
    })
    .eq("id", id.data);
  if (error) {
    console.error("[admin/results] status failed:", error.message);
    return;
  }
  revalidatePath("/admin/results");
  revalidatePath("/results");
}
