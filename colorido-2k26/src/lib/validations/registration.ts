/**
 * Zod validation schemas (Phase 1).
 * Shared between client forms and server actions — one source of truth.
 */

import { z } from "zod";

/** Trims and collapses whitespace in user-typed strings. */
const cleanText = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max);

export const participantSchema = z.object({
  full_name: cleanText(2, 120),
  roll_number: cleanText(1, 40),
  email: z.string().trim().email().max(254),
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid mobile number"),
  college: cleanText(2, 200),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  year_of_study: z.string().trim().max(20).optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]),
});

export type ParticipantInput = z.infer<typeof participantSchema>;

export const teamMemberSchema = z.object({
  name: cleanText(2, 120),
  roll_number: cleanText(1, 40),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{10,15}$/, "Enter a valid phone number")
    .optional()
    .or(z.literal("")),
  college: cleanText(2, 200),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  year: z.string().trim().max(20).optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]).optional().or(z.literal("")),
  role: z.enum(["captain", "member", "substitute"]).default("member"),
});

export type TeamMemberInput = z.infer<typeof teamMemberSchema>;

export const contactMessageSchema = z.object({
  name: cleanText(2, 120),
  email: z.string().trim().email().max(254),
  subject: cleanText(3, 200),
  message: cleanText(10, 5000),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

/** Server-side registration payload (individual or team). */
export const registrationPayloadSchema = z
  .object({
    event_id: z.string().uuid(),
    participant: participantSchema,
    team: z
      .object({
        team_name: cleanText(2, 100),
        members: z.array(teamMemberSchema).min(1).max(20),
      })
      .optional(),
  })
  .refine(
    (data) => !(data.team && data.team.members.length < 1),
    { message: "Team events require at least one team member" },
  );

export type RegistrationPayload = z.infer<typeof registrationPayloadSchema>;
