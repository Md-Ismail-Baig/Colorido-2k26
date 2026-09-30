"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  bannerImageMetaSchema,
  GALLERY_MIME_TYPES,
  EVENT_IMAGE_MAX_BYTES,
} from "@/lib/validations/admin";

export interface UploadResult {
  ok?: boolean;
  url?: string;
  error?: string;
}

const extFor = (mime: string) =>
  mime === "image/jpeg"
    ? "jpg"
    : mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : "gif";

/**
 * EVENT IMAGE UPLOAD — server-validated, stored in the `gallery` bucket
 * under `images/events/<category>/<slug>-<uuid>.<ext>` (the same bucket the
 * storage RLS policy admits for staff under `images/`). Kept separate from
 * the event form so the binary never blocks form submission; the form gets
 * back a public URL and stores it in `banner_image`.
 *
 * Mirrors the gallery rules: MIME allow-list + 1 MB limit, validated here on
 * the server (the client hint is advisory only).
 */
export async function uploadEventImage(
  _prev: UploadResult,
  formData: FormData,
): Promise<UploadResult> {
  await requireRole("admin");

  const meta = bannerImageMetaSchema.safeParse({
    category: formData.get("category") ?? "",
    slug: formData.get("slug") ?? "",
  });
  if (!meta.success) {
    return { error: "Save a category and slug first, then upload the image." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (!GALLERY_MIME_TYPES.includes(file.type as (typeof GALLERY_MIME_TYPES)[number])) {
    return { error: "Only JPG, PNG, WebP or GIF images are allowed." };
  }
  if (file.size > EVENT_IMAGE_MAX_BYTES) {
    return { error: "Image is too large — it must be below 1 MB." };
  }

  const path = `images/events/${meta.data.category}/${meta.data.slug}-${crypto.randomUUID()}.${extFor(file.type)}`;

  const supabase = await createClient();
  const { error: upErr } = await supabase.storage
    .from("gallery")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (upErr) {
    console.error("[admin/events] image upload failed:", upErr.message);
    return { error: "The upload failed. Please try an image below 1 MB." };
  }

  const { data } = supabase.storage.from("gallery").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
