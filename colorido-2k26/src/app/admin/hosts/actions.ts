"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface HostFormState {
  error?: string;
  ok?: string;
}

const createHostSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().trim().min(2, "Enter the host's full name").max(120),
});

const idSchema = z.string().uuid();
const assignmentSchema = z.object({
  host_id: z.string().uuid(),
  event_id: z.string().uuid(),
});

/**
 * Create an Event Host account (spec: Admin creates/removes/replaces hosts).
 * Uses the service-role client for auth.admin — the admin role check above
 * is the authorization gate. The password is shown once to the admin to
 * share with the host.
 */
export async function createEventHost(
  _prev: HostFormState,
  formData: FormData,
): Promise<HostFormState> {
  await requireRole("admin");

  const parsed = createHostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });

  if (error || !data.user) {
    if (/already/i.test(error?.message ?? "")) {
      return { error: "An account with this email already exists." };
    }
    console.error("[admin/hosts] create failed:", error?.message);
    return { error: "We couldn't create the host account. Please try again." };
  }

  const { error: roleErr } = await admin
    .from("profiles")
    .update({ role: "event_host", full_name: parsed.data.full_name })
    .eq("id", data.user.id);

  if (roleErr) {
    console.error("[admin/hosts] role update failed:", roleErr.message);
    return {
      error:
        "Account created but role setup failed — remove this host and try again.",
    };
  }

  revalidatePath("/admin/hosts");
  return { ok: `Host account created for ${parsed.data.email}.` };
}

export async function removeEventHost(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;

  const admin = createAdminClient();
  // Remove assignments first, then the auth user (cascades the profile).
  await admin
    .from("event_host_assignments")
    .delete()
    .eq("host_id", id.data);
  const { error } = await admin.auth.admin.deleteUser(id.data);
  if (error) {
    console.error("[admin/hosts] remove failed:", error.message);
    return;
  }
  revalidatePath("/admin/hosts");
}

export async function assignEventToHost(formData: FormData): Promise<void> {
  await requireRole("admin");
  const parsed = assignmentSchema.safeParse({
    host_id: formData.get("host_id"),
    event_id: formData.get("event_id"),
  });
  if (!parsed.success) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("event_host_assignments")
    .insert(parsed.data);
  if (error && !/duplicate/i.test(error.message)) {
    console.error("[admin/hosts] assign failed:", error.message);
    return;
  }
  revalidatePath("/admin/hosts");
  revalidatePath("/host");
}

export async function unassignEventFromHost(formData: FormData): Promise<void> {
  await requireRole("admin");
  const parsed = assignmentSchema.safeParse({
    host_id: formData.get("host_id"),
    event_id: formData.get("event_id"),
  });
  if (!parsed.success) return;

  const admin = createAdminClient();
  const { error } = await admin
    .from("event_host_assignments")
    .delete()
    .eq("host_id", parsed.data.host_id)
    .eq("event_id", parsed.data.event_id);
  if (error) {
    console.error("[admin/hosts] unassign failed:", error.message);
    return;
  }
  revalidatePath("/admin/hosts");
  revalidatePath("/host");
}
