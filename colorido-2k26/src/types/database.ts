/**
 * COLORIDO 2K26 — Central data model (Phase 1).
 *
 * Mirrors supabase/migrations/0001_initial_schema.sql.
 * Event/registration/announcement types are string-unions generated from
 * the database CHECK constraints.
 */

export type UserRole = "admin" | "event_host";
export type EventCategory = "cultural" | "sports";
export type CulturalSubcategory =
  | "fine_arts"
  | "music"
  | "dance"
  | "choreoday"
  | "dramatics"
  | "fashion_show"
  | "tekraft"
  | "literary";
export type EventGender = "boys" | "girls" | "open";
export type EventStatus = "draft" | "published" | "closed" | "completed";
export type RegistrationMode = "individual" | "team";
export type RegistrationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "rejected"
  | "checked_in";
export type DuplicatePolicy = "event" | "college_roll_event";
export type TeamMemberRole = "captain" | "member" | "substitute";
export type AnnouncementScope = "festival" | "event";
export type AnnouncementPriority = "low" | "normal" | "high" | "critical";
export type AnnouncementStatus = "draft" | "published" | "expired";
export type ResultStatus = "draft" | "published";
export type ScheduleStatus = "scheduled" | "ongoing" | "completed" | "cancelled";
export type ContactMessageStatus = "new" | "in_progress" | "resolved";
export type GalleryCategory =
  | "cultural"
  | "sports"
  | "behind_the_scenes"
  | "previous_editions";
export type SponsorTier = "title" | "platinum" | "gold" | "silver" | "associate";

export interface Profile {
  id: string; // references auth.users(id)
  username: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface EventHostAssignment {
  id: string;
  host_id: string; // profiles.id
  event_id: string; // events.id
  assigned_at: string;
  assigned_by: string | null; // profiles.id
}

export interface Event {
  id: string;
  name: string;
  slug: string;
  category: EventCategory;
  subcategory: CulturalSubcategory | null; // cultural events only
  gender: EventGender;
  description: string;
  rules: string | null;
  eligibility: string | null;
  judging_criteria: string | null;
  registration_mode: RegistrationMode;
  team_size_min: number | null;
  team_size_max: number | null;
  venue: string | null; // "To be announced" when unknown
  event_date: string; // ISO date
  start_time: string | null;
  end_time: string | null;
  reporting_time: string | null;
  registration_deadline: string | null; // "To be announced" when unknown
  status: EventStatus;
  duplicate_policy: DuplicatePolicy;
  banner_image: string | null;
  is_featured: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  full_name: string;
  roll_number: string; // mandatory
  email: string;
  mobile: string;
  college: string;
  department: string;
  year_of_study: string;
  gender: "male" | "female" | "other";
  created_at: string;
}

export interface Registration {
  id: string;
  registration_number: string; // e.g. CLR26-000127
  event_id: string;
  participant_id: string;
  mode: RegistrationMode;
  status: RegistrationStatus;
  registered_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  registration_id: string;
  team_name: string;
  captain_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  name: string;
  roll_number: string;
  email: string | null;
  phone: string | null;
  college: string;
  department: string | null;
  year: string | null;
  gender: "male" | "female" | "other" | null;
  role: TeamMemberRole;
}

export interface ScheduleSlot {
  id: string;
  event_id: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  venue: string | null;
  round: string | null;
  reporting_time: string | null;
  status: ScheduleStatus;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  scope: AnnouncementScope;
  event_id: string | null; // required for event scope
  priority: "low" | "normal" | "high" | "critical";
  status: AnnouncementStatus;
  published_at: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResultEntry {
  id: string;
  event_id: string;
  registration_id: string | null;
  participant_name: string | null;
  team_name: string | null;
  college: string | null;
  position: number;
  score: string | null;
  remarks: string | null;
  status: ResultStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryItem {
  id: string;
  title: string | null;
  storage_path: string;
  category: GalleryCategory;
  event_id: string | null;
  uploaded_by: string | null;
  is_published: boolean;
  display_order: number;
  created_at: string;
}

export interface Sponsor {
  id: string;
  name: string;
  logo_path: string | null;
  website: string | null;
  tier: SponsorTier;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  created_at: string;
}

/** Helper: does this event accept team registrations? */
export function isTeamEvent(event: Pick<Event, "registration_mode">): boolean {
  return event.registration_mode === "team";
}
