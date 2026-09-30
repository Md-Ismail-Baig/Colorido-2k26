"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  galleryMetaSchema,
  GALLERY_MIME_TYPES,
  GALLERY_MAX_BYTES,
  GALLERY_TOTAL_QUOTA_BYTES,
  sponsorFormSchema,
  contactStatusSchema,
} from "@/lib/validations/admin";

export interface SimpleFormState {
  error?: string;
  ok?: boolean;
}

/**
 * Sum every object currently stored in the gallery bucket (recursive walk),
 * for the admin's 100 MB whole-gallery quota. Uses the service-role client:
 * storage RLS for staff may be folder-scoped and must not break the count.
 */
async function galleryBucketUsedBytes(): Promise<number> {
  const admin = createAdminClient();
  let total = 0;
  const walk = async (prefix: string): Promise<void> => {
    const { data, error } = await admin.storage
      .from("gallery")
      .list(prefix, { limit: 1000 });
    if (error) throw error;
    for (const entry of data ?? []) {
      if (entry.id === null) {
        // Folder entry — recurse.
        await walk(`${prefix}${entry.name}/`);
      } else {
        total += entry.metadata?.size ?? 0;
      }
    }
  };
  await walk("");
  return total;
}

/** Shared quota gate: reject the upload before it hits Storage. */
async function galleryQuotaError(incomingBytes: number): Promise<string | null> {
  const used = await galleryBucketUsedBytes();
  if (used + incomingBytes > GALLERY_TOTAL_QUOTA_BYTES) {
    return `Gallery storage is full — the ${GALLERY_TOTAL_QUOTA_BYTES / (1024 * 1024)} MB total image limit has been reached. Delete some photos before uploading new ones.`;
  }
  return null;
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
    return { error: "Photo is too large — maximum 1 MB." };
  }
  const quotaError = await galleryQuotaError(file.size);
  if (quotaError) return { error: quotaError };

  const ext =
    file.type === "image/jpeg"
      ? "jpg"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "gif";
  // Storage RLS admits staff uploads only under the images/ folder — every
  // path MUST start with images/ or the upload is silently rejected.
  const path = `images/${meta.data.category}/${crypto.randomUUID()}.${ext}`;

  // Storage + table writes run on the service-role client: the admin role
  // gate above (requireRole) is the authorization; the storage-api RLS
  // evaluation of staff JWTs has proven environment-dependent (403
  // "row-level security" even for valid admins), so uploads must not depend
  // on it. The bucket stays public-read for the site.
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from("gallery")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (upErr) {
    console.error("[admin/gallery] upload failed:", upErr.message);
    return { error: "The upload failed. Please try a smaller image." };
  }

  const { error: dbErr } = await admin.from("gallery").insert({
    title: meta.data.title || null,
    storage_path: path,
    category: meta.data.category,
    event_id: meta.data.event_id || null,
    uploaded_by: profile.id,
    is_published: true,
  });

  if (dbErr) {
    // Roll back the orphaned storage object.
    await admin.storage.from("gallery").remove([path]);
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

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("gallery")
    .select("storage_path")
    .eq("id", id.data)
    .single();

  const { error } = await admin.from("gallery").delete().eq("id", id.data);
  if (error) {
    console.error("[admin/gallery] delete failed:", error.message);
    return;
  }
  if (item?.storage_path) {
    await admin.storage.from("gallery").remove([item.storage_path]);
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
  // Service-role client — same authorization model as the gallery upload:
  // requireRole above is the gate, the client just writes (see note above).
  const supabase = createAdminClient();

  // Optional logo upload — validated + stored in the gallery bucket under
  // sponsor-logos/, mirroring the gallery upload rules (spec §24).
  let logoPath: string | null = null;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!GALLERY_MIME_TYPES.includes(logo.type as (typeof GALLERY_MIME_TYPES)[number])) {
      return { error: "Logo must be a JPG, PNG, WebP or GIF image." };
    }
    if (logo.size > GALLERY_MAX_BYTES) {
      return { error: "Logo is too large — maximum 1 MB." };
    }
    const quotaError = await galleryQuotaError(logo.size);
    if (quotaError) return { error: quotaError };
    const ext =
      logo.type === "image/jpeg"
        ? "jpg"
        : logo.type === "image/png"
          ? "png"
          : logo.type === "image/webp"
            ? "webp"
            : "gif";
    logoPath = `images/sponsor-logos/${crypto.randomUUID()}.${ext}`; // images/ prefix required by storage RLS
    const { error: upErr } = await supabase.storage
      .from("gallery")
      .upload(logoPath, logo, { contentType: logo.type, upsert: false });
    if (upErr) {
      console.error("[admin/sponsors] logo upload failed:", upErr.message);
      return { error: "The logo upload failed. Please try again." };
    }
  }

  const { error } = await supabase.from("sponsors").insert({
    name: parsed.data.name,
    website: parsed.data.website || null,
    tier: parsed.data.tier,
    display_order: parsed.data.display_order ?? 0,
    is_active: parsed.data.is_active ?? true,
    logo_path: logoPath,
  });
  if (error) {
    if (logoPath) {
      await supabase.storage.from("gallery").remove([logoPath]);
    }
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
  const { data: sponsor } = await supabase
    .from("sponsors")
    .select("logo_path")
    .eq("id", id.data)
    .single();

  const { error } = await supabase.from("sponsors").delete().eq("id", id.data);
  if (error) {
    console.error("[admin/sponsors] delete failed:", error.message);
    return;
  }
  if (sponsor?.logo_path) {
    await supabase.storage.from("gallery").remove([sponsor.logo_path]);
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
