"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  registrationStatusSchema,
  contactStatusSchema,
} from "@/lib/validations/admin";

export async function setRegistrationStatus(formData: FormData): Promise<void> {
  await requireRole("admin");
  const parsed = registrationStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  // RLS currently has no registrations UPDATE policy (see migration 0005),
  // so the status workflow writes via the service-role client after the
  // requireRole() gate — same trusted-server pattern as console reads.
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("registrations")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);
  if (error) {
    console.error("[admin/registrations] status failed:", error.message);
    return;
  }
  revalidatePath("/admin/registrations");
  revalidatePath("/host/registrations");
}

export async function setContactStatus(formData: FormData): Promise<void> {
  await requireRole("admin");
  const parsed = contactStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("contact_messages")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);
  if (error) {
    console.error("[admin/contacts] status failed:", error.message);
    return;
  }
  revalidatePath("/admin/contacts");
}
