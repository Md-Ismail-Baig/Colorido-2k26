/**
 * COLORIDO 2K26 — Admin console validation schemas.
 * Shared between admin forms and server actions — one source of truth.
 */
import { z } from "zod";
import type {
  AnnouncementPriority,
  AnnouncementScope,
  AnnouncementStatus,
  ContactMessageStatus,
  CulturalSubcategory,
  DuplicatePolicy,
  EventCategory,
  EventGender,
  EventStatus,
  GalleryCategory,
  RegistrationMode,
  RegistrationStatus,
  ResultStatus,
  ScheduleStatus,
  SponsorTier,
} from "@/types/database";

const cleanText = (min: number, max: number) =>
  z.string().trim().min(min).max(max);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker (YYYY-MM-DD)");
const timeField = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Use the time picker (HH:MM)")
  .optional()
  .or(z.literal(""));

// ---------------------------------------------------------------- events ---
export const eventFormSchema = z
  .object({
    name: cleanText(3, 200),
    slug: z
      .string()
      .trim()
      .min(3)
      .max(80)
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "Slug must be lowercase letters/numbers separated by hyphens",
      ),
    category: z.enum(["cultural", "sports"]) satisfies z.ZodType<EventCategory>,
    subcategory: optionalText(40),
    gender: z.enum(["boys", "girls", "open"]) satisfies z.ZodType<EventGender>,
    description: cleanText(10, 4000),
    rules: optionalText(8000),
    eligibility: optionalText(2000),
    judging_criteria: optionalText(2000),
    registration_mode: z.enum(["individual", "team"]) satisfies z.ZodType<RegistrationMode>,
    team_size_min: z.coerce.number().int().min(1).max(50).optional(),
    team_size_max: z.coerce.number().int().min(1).max(50).optional(),
    duplicate_policy: z.enum(["event", "college_roll_event"]) satisfies z.ZodType<DuplicatePolicy>,
    venue: optionalText(200),
    event_date: dateField,
    start_time: timeField,
    end_time: timeField,
    reporting_time: timeField,
    registration_deadline: dateField.optional().or(z.literal("")),
    status: z.enum(["draft", "published", "closed", "completed"]) satisfies z.ZodType<EventStatus>,
    is_featured: z.coerce.boolean().optional(),
    display_order: z.coerce.number().int().min(0).max(999).optional(),
  })
  .refine(
    (v) => v.category !== "cultural" || (v.subcategory && v.subcategory.length > 0),
    { message: "Cultural events require a subcategory", path: ["subcategory"] },
  )
  .refine(
    (v) => v.registration_mode !== "team" || (v.team_size_min ?? 0) <= (v.team_size_max ?? 99),
    { message: "Team size min must be ≤ max", path: ["team_size_max"] },
  );

export type EventFormInput = z.infer<typeof eventFormSchema>;

// -------------------------------------------------------------- schedule ---
export const scheduleFormSchema = z.object({
  event_id: z.string().uuid(),
  event_date: dateField,
  start_time: timeField,
  end_time: timeField,
  venue: optionalText(200),
  round: optionalText(120),
  reporting_time: timeField,
  status: z.enum(["scheduled", "ongoing", "completed", "cancelled"]) satisfies z.ZodType<ScheduleStatus>,
  is_published: z.coerce.boolean().optional(),
});
export type ScheduleFormInput = z.infer<typeof scheduleFormSchema>;

// ---------------------------------------------------------- announcements ---
export const announcementFormSchema = z
  .object({
    title: cleanText(3, 200),
    description: cleanText(3, 4000),
    scope: z.enum(["festival", "event"]) satisfies z.ZodType<AnnouncementScope>,
    event_id: z.string().uuid().optional().or(z.literal("")),
    priority: z.enum(["low", "normal", "high", "critical"]) satisfies z.ZodType<AnnouncementPriority>,
    status: z.enum(["draft", "published", "expired"]) satisfies z.ZodType<AnnouncementStatus>,
    published_at: z.string().optional().or(z.literal("")),
    expiry_date: dateField.optional().or(z.literal("")),
  })
  .refine((v) => v.scope !== "event" || (v.event_id && v.event_id.length > 0), {
    message: "Event announcements require an event",
    path: ["event_id"],
  });
export type AnnouncementFormInput = z.infer<typeof announcementFormSchema>;

// ---------------------------------------------------------------- results ---
export const resultFormSchema = z.object({
  event_id: z.string().uuid(),
  position: z.coerce.number().int().min(1).max(999),
  participant_name: optionalText(120),
  team_name: optionalText(120),
  college: optionalText(200),
  score: optionalText(60),
  remarks: optionalText(500),
  status: z.enum(["draft", "published"]) satisfies z.ZodType<ResultStatus>,
});
export type ResultFormInput = z.infer<typeof resultFormSchema>;

// --------------------------------------------------------------- sponsors ---
export const sponsorFormSchema = z.object({
  name: cleanText(2, 200),
  website: z.string().trim().url().max(300).optional().or(z.literal("")),
  tier: z.enum(["title", "platinum", "gold", "silver", "associate"]) satisfies z.ZodType<SponsorTier>,
  display_order: z.coerce.number().int().min(0).max(999).optional(),
  is_active: z.coerce.boolean().optional(),
});
export type SponsorFormInput = z.infer<typeof sponsorFormSchema>;

// ---------------------------------------------------------------- gallery ---
export const GALLERY_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export const GALLERY_MAX_BYTES = 1024 * 1024; // 1 MB per image (server limit)
/** Whole-bucket quota: every stored image (gallery photos + sponsor logos) combined. */
export const GALLERY_TOTAL_QUOTA_BYTES = 100 * 1024 * 1024; // 100 MB total
/** Event card/banner images — same 1 MB server limit as gallery photos. */
export const EVENT_IMAGE_MAX_BYTES = GALLERY_MAX_BYTES;

/**
 * Metadata for an optional event image upload. The file itself arrives in a
 * second request (uploadEventImage) so the big binary never blocks form
 * submission; this schema validates the resulting public URL.
 */
export const bannerImageMetaSchema = z.object({
  category: z.enum(["cultural", "sports"]),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
});

export const galleryMetaSchema = z.object({
  title: optionalText(200),
  category: z.enum([
    "cultural",
    "sports",
    "behind_the_scenes",
    "previous_editions",
  ]) satisfies z.ZodType<GalleryCategory>,
  event_id: z.string().uuid().optional().or(z.literal("")),
});

// ------------------------------------------------------------ registrations --
export const registrationStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "pending",
    "confirmed",
    "cancelled",
    "rejected",
    "checked_in",
  ]) satisfies z.ZodType<RegistrationStatus>,
});

// ---------------------------------------------------------------- contacts --
export const contactStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "in_progress", "resolved"]) satisfies z.ZodType<ContactMessageStatus>,
});
