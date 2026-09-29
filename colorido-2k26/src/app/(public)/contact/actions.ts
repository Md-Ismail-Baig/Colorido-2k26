"use server";

import { contactMessageSchema } from "@/lib/validations/registration";
import { createClient } from "@/lib/supabase/server";
import { allow } from "@/lib/rate-limit";

export interface ContactFormState {
  success?: boolean;
  error?: string;
}

/**
 * Contact form submission — Server Action → Supabase (spec §26).
 * Server-side Zod validation; safe error messages; no stack traces exposed.
 */
export async function submitContactMessage(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  // Phase 13: rate-limit public submissions per IP.
  if (!(await allow("contact"))) {
    return {
      error: "Too many messages sent recently. Please try again later.",
    };
  }

  const parsed = contactMessageSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Please check your details and try again.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
  });

  if (error) {
    console.error("[contact] insert failed:", error.message);
    return {
      error: "We couldn't complete this request right now. Please try again.",
    };
  }

  return { success: true };
}
