-- ============================================================================
-- COLORIDO 2K26 — Seed data (Phase 1)
--
-- Seeds EXACTLY the 16 documented events (Master Spec §2 — ABSOLUTE EVENT
-- SCOPE). No technical/departmental events. No undocumented events.
--
-- Data policy (Master Spec §47 / §63):
--   * venue, times, deadlines, rules, eligibility, judging criteria that are
--     NOT officially provided are seeded as NULL and must be displayed as
--     "To be announced" by the UI. Admins fill them via the dashboard.
--   * Announcements below are DEMO content for development only.
--   * sponsors are intentionally left EMPTY (no invented brands).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- CULTURAL EVENTS (10)
-- ---------------------------------------------------------------------------
insert into public.events
  (name, slug, category, subcategory, gender, description, registration_mode, team_size_min, team_size_max, event_date, status, display_order, is_featured)
values
  ('Fine Arts', 'fine-arts', 'cultural', 'fine_arts', 'open',
   'Spot painting, sketching, face art and traditional canvas design celebrating visual creativity.',
   'individual', null, null, date '2026-12-28', 'published', 1, false),

  ('Music & Band — Solo', 'music-band-solo', 'cultural', 'music', 'open',
   'Solo singing and instrumental performance across classical, western and fusion styles.',
   'individual', null, null, date '2026-12-28', 'published', 2, false),

  ('Music & Band — Group', 'music-band-group', 'cultural', 'music', 'open',
   'Battle of the bands and group ensemble performances with full stage energy.',
   'team', 4, 8, date '2026-12-28', 'published', 3, false),

  ('Dance — Solo', 'dance-solo', 'cultural', 'dance', 'open',
   'Classical, semi-classical, contemporary and hip-hop solo dance performances.',
   'individual', null, null, date '2026-12-28', 'published', 4, true),

  ('Dance — Group', 'dance-group', 'cultural', 'dance', 'open',
   'Synchronized folk, western and fusion group choreography with formation transitions.',
   'team', 6, 12, date '2026-12-28', 'published', 5, true),

  ('Choreoday — Theme Based', 'choreoday-theme-based', 'cultural', 'choreoday', 'open',
   'Narrative, theme-based dance productions telling compelling stories through movement.',
   'team', 8, 15, date '2026-12-28', 'published', 6, false),

  ('Dramatics', 'dramatics', 'cultural', 'dramatics', 'open',
   'Stage plays, street plays and mime acts showcasing powerful dialogue and expression.',
   'team', 6, 10, date '2026-12-28', 'published', 7, false),

  ('Fashion Show', 'fashion-show', 'cultural', 'fashion_show', 'open',
   'Runway showcases of student-designed ethnic and contemporary collections.',
   'team', 8, 14, date '2026-12-28', 'published', 8, true),

  ('Tekraft Events', 'tekraft-events', 'cultural', 'tekraft', 'open',
   'Creative craft and design challenges blending technical finesse with artistry.',
   'individual', null, null, date '2026-12-28', 'published', 9, false),

  ('Literary', 'literary', 'cultural', 'literary', 'open',
   'Debate, elocution, poetry and storytelling competitions testing wit and articulation.',
   'individual', null, null, date '2026-12-28', 'published', 10, false);

-- ---------------------------------------------------------------------------
-- SPORTS EVENTS (6) — boys: 3, girls: 3 (Master Spec §2)
-- ---------------------------------------------------------------------------
insert into public.events
  (name, slug, category, subcategory, gender, description, registration_mode, team_size_min, team_size_max, event_date, status, display_order, is_featured)
values
  ('Basketball', 'basketball-boys', 'sports', null, 'boys',
   'Full-court collegiate basketball championship for the Boys division.',
   'team', 5, 10, date '2026-12-28', 'published', 11, true),

  ('Volleyball', 'volleyball-boys', 'sports', null, 'boys',
   'Collegiate volleyball tournament for the Boys division in rally-point format.',
   'team', 6, 10, date '2026-12-28', 'published', 12, false),

  ('Table Tennis (Boys)', 'table-tennis-boys', 'sports', null, 'boys',
   'Boys division table tennis — singles knockout brackets.',
   'individual', null, null, date '2026-12-28', 'published', 13, false),

  ('Throwball', 'throwball-girls', 'sports', null, 'girls',
   'Collegiate throwball championship for the Girls division.',
   'team', 7, 12, date '2026-12-28', 'published', 14, false),

  ('TenniKoit', 'tennikoit-girls', 'sports', null, 'girls',
   'Girls division ring tennis (TenniKoit) — singles format.',
   'individual', null, null, date '2026-12-28', 'published', 15, false),

  ('Table Tennis (Girls)', 'table-tennis-girls', 'sports', null, 'girls',
   'Girls division table tennis — singles knockout brackets.',
   'individual', null, null, date '2026-12-28', 'published', 16, false);

-- ---------------------------------------------------------------------------
-- DEMO announcements (development only — delete before production, or edit
-- via the admin dashboard once live)
-- ---------------------------------------------------------------------------
insert into public.announcements (title, description, scope, priority, status, published_at)
values
  ('COLORIDO 2K26 Registration Opens Soon',
   'Online registration for all cultural and sports events opens shortly. Watch this space — dates will be announced soon.',
   'festival', 'high', 'published', now()),
  ('Festival Date Confirmed — 28 December 2026',
   'COLORIDO 2K26 will be held on 28 December 2026. Event-wise schedules will be published closer to the festival.',
   'festival', 'normal', 'published', now()),
  ('Demo Announcement — Draft Preview',
   'This is a draft announcement used to verify admin publishing states in development. It is not shown publicly.',
   'festival', 'low', 'draft', null);
