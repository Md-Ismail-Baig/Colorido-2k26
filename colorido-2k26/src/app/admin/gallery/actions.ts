"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  galleryMetaSchema,
  GALLERY_MIME_TYPES,
  GALLERY_MAX_BYTES,
  sponsorFormSchema,
  contactStatusSchema,
} from "@/lib/validations/admin";

export interface SimpleFormState {
  error?: string;
  ok?: boolean;
}

/**
 * Gallery photo upload (spec §24). Validates MIME type and size server-side
 * BEFORE hitting Storage, stores under category-scoped paths, and only then
 * inserts the gallery row.
 */
export async function uploadGalleryPhoto(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const { profile } = await requireRole("admin");

  const meta = galleryMetaSchema.safeParse(Object.fromEntries(formData));
  if (!meta.success) {
    return { error: meta.error.issues[0]?.message ?? "Invalid details." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (!GALLERY_MIME_TYPES.includes(file.type as (typeof GALLERY_MIME_TYPES)[number])) {
    return { error: "Only JPG, PNG, WebP or GIF images are allowed." };
  }
  if (file.size > GALLERY_MAX_BYTES) {
    return { error: "Photo is too large — maximum 8 MB." };
  }

  const ext =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "gif";
  const path = `${meta.data.category}/${crypto.randomUUID()}.${ext}`;

  const supabase = await createClient();
  const { error: upErr } = await supabase.storage
    .from("gallery")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (upErr) {
    console.error("[admin/gallery] upload failed:", upErr.message);
    return { error: "The upload failed. Please try a smaller image." };
  }

  const { error: dbErr } = await supabase.from("gallery").insert({
    title: meta.data.title || null,
    storage_path: path,
    category: meta.data.category,
    event_id: meta.data.event_id || null,
    uploaded_by: profile.id,
    is_published: true,
  });

  if (dbErr) {
    // Roll back the orphaned storage object.
    await supabase.storage.from("gallery").remove([path]);
    console.error("[admin/gallery] row insert failed:", dbErr.message);
    return { error: "The upload failed. Please try again." };
  }

  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
  return { ok: true };
}

export async function setGalleryPublish(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  const publish = formData.get("publish") === "1";
  if (!id.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("gallery")
    .update({ is_published: publish })
    .eq("id", id.data);
  if (error) {
    console.error("[admin/gallery] publish failed:", error.message);
    return;
  }
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
}

export async function deleteGalleryPhoto(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("gallery")
    .select("storage_path")
    .eq("id", id.data)
    .single();

  const { error } = await supabase.from("gallery").delete().eq("id", id.data);
  if (error) {
    console.error("[admin/gallery] delete failed:", error.message);
    return;
  }
  if (item?.storage_path) {
    await supabase.storage.from("gallery").remove([item.storage_path]);
  }
  revalidatePath("/admin/gallery");
  revalidatePath("/gallery");
  revalidatePath("/");
}

// ------------------------------------------------------------ sponsors ----

export async function createSponsor(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  await requireRole("admin");
  const parsed = sponsorFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("sponsors").insert({
    name: parsed.data.name,
    website: parsed.data.website || null,
    tier: parsed.data.tier,
    display_order: parsed.data.display_order ?? 0,
    is_active: parsed.data.is_active ?? true,
  });
  if (error) {
    console.error("[admin/sponsors] create failed:", error.message);
    return { error: "We couldn't add the sponsor. Please try again." };
  }
  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
  revalidatePath("/");
  return { ok: true };
}

export async function toggleSponsorActive(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  const active = formData.get("active") === "1";
  if (!id.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("sponsors")
    .update({ is_active: active })
    .eq("id", id.data);
  if (error) {
    console.error("[admin/sponsors] toggle failed:", error.message);
    return;
  }
  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
}

export async function deleteSponsor(formData: FormData): Promise<void> {
  await requireRole("admin");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  const { error } = await supabase.from("sponsors").delete().eq("id", id.data);
  if (error) {
    console.error("[admin/sponsors] delete failed:", error.message);
    return;
  }
  revalidatePath("/admin/sponsors");
  revalidatePath("/sponsors");
}

// ------------------------------------------------------ contact messages ---

export async function setContactMessageStatus(formData: FormData): Promise<void> {
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
