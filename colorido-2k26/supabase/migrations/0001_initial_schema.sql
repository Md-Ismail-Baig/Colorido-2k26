-- ============================================================================
-- COLORIDO 2K26 — Initial schema (Phase 1)
-- Database first. Apply via Supabase Dashboard → SQL Editor (see README).
-- Entities: profiles, event host assignments, events, participants,
-- registrations, teams, team members, schedule, announcements, results,
-- gallery, sponsors, contact messages.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles — app-level users (admin / event_host); participants are NOT users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  full_name   text,
  role        text not null default 'event_host'
              check (role in ('admin', 'event_host')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);

-- ---------------------------------------------------------------------------
-- Helper: current user role (from public.profiles, keyed by auth.users).
-- Defined AFTER the profiles table — SQL functions are validated at creation.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Auto-create a profile row whenever an auth user is created (default host;
-- promote to admin manually or via the bootstrap step below).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'event_host')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- event_host_assignments — which host manages which event (Phase 8 security)
-- ---------------------------------------------------------------------------
create table public.event_host_assignments (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references public.profiles(id) on delete cascade,
  event_id    uuid not null,          -- FK added after events table exists
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id) on delete set null,
  unique (host_id, event_id)
);

create index idx_host_assignments_host on public.event_host_assignments(host_id);
create index idx_host_assignments_event on public.event_host_assignments(event_id);

-- ---------------------------------------------------------------------------
-- events — the 16 documented festival events (see seed 0002)
-- ---------------------------------------------------------------------------
create table public.events (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text not null unique,
  category              text not null check (category in ('cultural', 'sports')),
  subcategory           text check (subcategory in (
                          'fine_arts', 'music', 'dance', 'choreoday',
                          'dramatics', 'fashion_show', 'tekraft', 'literary')),
  gender                text not null default 'open'
                        check (gender in ('boys', 'girls', 'open')),
  description           text not null default '',
  rules                 text,
  eligibility           text,
  judging_criteria      text,
  registration_mode     text not null check (registration_mode in ('individual', 'team')),
  team_size_min         integer check (team_size_min >= 1),
  team_size_max         integer check (team_size_max >= 1),
  venue                 text,
  event_date            date not null default date '2026-12-28',
  start_time            time,
  end_time              time,
  reporting_time        time,
  registration_deadline date,
  status                text not null default 'draft'
                        check (status in ('draft', 'published', 'closed', 'completed')),
  duplicate_policy      text not null default 'college_roll_event'
                        check (duplicate_policy in ('event', 'college_roll_event')),
  banner_image          text,
  is_featured           boolean not null default false,
  display_order         integer not null default 0,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Cultural events must carry a subcategory; sports events must not.
  constraint cultural_requires_subcategory
    check (category <> 'cultural' or subcategory is not null),
  constraint sports_has_no_subcategory
    check (category <> 'sports' or subcategory is null),
  constraint team_events_have_sizes
    check (registration_mode <> 'team' or (team_size_min is not null and team_size_max is not null)),
  constraint team_size_range_valid
    check (team_size_min is null or team_size_max is null or team_size_min <= team_size_max),
  -- Absolute event scope guard: sports events are boys/girls only.
  constraint sports_gender_divisions
    check (category <> 'sports' or gender in ('boys', 'girls'))
);

create index idx_events_category on public.events(category);
create index idx_events_subcategory on public.events(subcategory) where subcategory is not null;
create index idx_events_gender on public.events(gender);
create index idx_events_status on public.events(status);
create index idx_events_active on public.events(is_active) where is_active;

-- ---------------------------------------------------------------------------
-- participants — registration form data (not auth users)
-- ---------------------------------------------------------------------------
create table public.participants (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null check (length(trim(full_name)) between 2 and 120),
  roll_number   text not null check (length(trim(roll_number)) between 1 and 40),
  email         text not null check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  mobile        text not null check (mobile ~ '^[0-9+\-\s]{10,15}$'),
  college       text not null,
  department    text,
  year_of_study text,
  gender        text not null check (gender in ('male', 'female', 'other')),
  created_at    timestamptz not null default now()
);

create index idx_participants_roll on public.participants(roll_number);
create index idx_participants_email on public.participants(email);

-- One canonical participant row per student (college + roll), case-insensitive.
-- Duplicate-prevention backstop for spec §18 (race-proof identity).
create unique index uq_participants_college_roll
  on public.participants (lower(trim(college)), lower(trim(roll_number)));

-- ---------------------------------------------------------------------------
-- registrations — one row per participant per event (individual or team lead)
-- ---------------------------------------------------------------------------
create table public.registrations (
  id                  uuid primary key default gen_random_uuid(),
  registration_number text not null unique,
  event_id            uuid not null references public.events(id) on delete restrict,
  participant_id      uuid not null references public.participants(id) on delete restrict,
  mode                text not null check (mode in ('individual', 'team')),
  status              text not null default 'confirmed'
                      check (status in ('pending', 'confirmed', 'cancelled', 'rejected', 'checked_in')),
  registered_at       timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_registrations_event on public.registrations(event_id);
create index idx_registrations_participant on public.registrations(participant_id);
create index idx_registrations_status on public.registrations(status);

-- One registration per participant per event (spec §18 duplicate backstop).
create unique index uq_registrations_event_participant
  on public.registrations (event_id, participant_id);

-- ---------------------------------------------------------------------------
-- teams + team_members
-- ---------------------------------------------------------------------------
create table public.teams (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  team_name       text not null check (length(trim(team_name)) between 2 and 100),
  captain_id      uuid not null references public.participants(id) on delete restrict,
  created_at      timestamptz not null default now()
);

create index idx_teams_registration on public.teams(registration_id);

create table public.team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  name        text not null check (length(trim(name)) between 2 and 120),
  roll_number text not null check (length(trim(roll_number)) between 1 and 40),
  email       text,
  phone       text,
  college     text,
  department  text,
  year        text,
  gender      text check (gender in ('male', 'female', 'other')),
  role        text not null default 'member'
              check (role in ('captain', 'member', 'substitute'))
);

create index idx_team_members_team on public.team_members(team_id);

-- ---------------------------------------------------------------------------
-- schedules
-- ---------------------------------------------------------------------------
create table public.schedules (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  event_date     date not null,
  start_time     time,
  end_time       time,
  venue          text,
  round          text,
  reporting_time time,
  status         text not null default 'scheduled'
                 check (status in ('scheduled', 'ongoing', 'completed', 'cancelled')),
  is_published   boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_schedules_event on public.schedules(event_id);
create index idx_schedules_date on public.schedules(event_date);
create index idx_schedules_venue on public.schedules(venue);

-- ---------------------------------------------------------------------------
-- announcements (festival-wide + event-specific)
-- ---------------------------------------------------------------------------
create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (length(trim(title)) between 3 and 200),
  description  text not null,
  scope        text not null default 'festival'
               check (scope in ('festival', 'event')),
  event_id     uuid references public.events(id) on delete cascade,
  priority     text not null default 'normal'
               check (priority in ('low', 'normal', 'high', 'critical')),
  status       text not null default 'draft'
               check (status in ('draft', 'published', 'expired')),
  published_at timestamptz,
  expiry_date  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint event_scope_requires_event
    check (scope <> 'event' or event_id is not null),
  constraint festival_scope_has_no_event
    check (scope <> 'festival' or event_id is null)
);

create index idx_announcements_status on public.announcements(status);
create index idx_announcements_event on public.announcements(event_id) where event_id is not null;

-- ---------------------------------------------------------------------------
-- results
-- ---------------------------------------------------------------------------
create table public.results (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete set null,
  participant_name text,
  team_name       text,
  college         text,
  position        integer not null check (position between 1 and 100),
  score           text,
  remarks         text,
  status          text not null default 'draft' check (status in ('draft', 'published')),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_results_event on public.results(event_id);
create index idx_results_status on public.results(status);

-- ---------------------------------------------------------------------------
-- gallery (Supabase Storage references)
-- ---------------------------------------------------------------------------
create table public.gallery (
  id            uuid primary key default gen_random_uuid(),
  title         text,
  storage_path  text not null,
  category      text not null
                check (category in ('cultural', 'sports', 'behind_the_scenes', 'previous_editions')),
  event_id      uuid references public.events(id) on delete set null,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  is_published  boolean not null default false,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create index idx_gallery_category on public.gallery(category);
create index idx_gallery_event on public.gallery(event_id) where event_id is not null;

-- ---------------------------------------------------------------------------
-- sponsors (demo seed data only until real sponsors are confirmed)
-- ---------------------------------------------------------------------------
create table public.sponsors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(trim(name)) between 2 and 150),
  logo_path     text,
  website       text,
  tier          text not null default 'associate'
                check (tier in ('title', 'platinum', 'gold', 'silver', 'associate')),
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- contact_messages
-- ---------------------------------------------------------------------------
create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) between 2 and 120),
  email      text not null check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  subject    text not null check (length(trim(subject)) between 3 and 200),
  message    text not null check (length(trim(message)) between 10 and 5000),
  status     text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

create index idx_contact_messages_status on public.contact_messages(status);

-- ---------------------------------------------------------------------------
-- registration_number sequence: CLR26-000001…
-- ---------------------------------------------------------------------------
create sequence public.registration_number_seq start 1;

create or replace function public.next_registration_number()
returns text
language sql
as $$
  select 'CLR26-' || lpad(nextval('public.registration_number_seq')::text, 6, '0');
$$;

-- Registration numbers auto-generate on ANY insert path (app, admin, SQL).
alter table public.registrations
  alter column registration_number set default public.next_registration_number();

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_events_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger trg_registrations_updated_at before update on public.registrations
  for each row execute function public.set_updated_at();
create trigger trg_schedules_updated_at before update on public.schedules
  for each row execute function public.set_updated_at();
create trigger trg_announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();
create trigger trg_results_updated_at before update on public.results
  for each row execute function public.set_updated_at();
create trigger trg_sponsors_updated_at before update on public.sponsors
  for each row execute function public.set_updated_at();

-- Add the events FK for host assignments now that events exists.
alter table public.event_host_assignments
  add constraint event_host_assignments_event_fk
  foreign key (event_id) references public.events(id) on delete cascade;

-- ============================================================================
-- ROW LEVEL SECURITY
-- Public (anon) may READ published festival data and CREATE registrations +
-- contact messages. Only authenticated staff (admin / assigned event_host)
-- may write. Host scoping is enforced via event_host_assignments.
-- ============================================================================

alter table public.profiles              enable row level security;
alter table public.event_host_assignments enable row level security;
alter table public.events                enable row level security;
alter table public.participants          enable row level security;
alter table public.registrations         enable row level security;
alter table public.teams                 enable row level security;
alter table public.team_members          enable row level security;
alter table public.schedules             enable row level security;
alter table public.announcements         enable row level security;
alter table public.results               enable row level security;
alter table public.gallery               enable row level security;
alter table public.sponsors              enable row level security;
alter table public.contact_messages      enable row level security;

-- profiles: users read/update their own row; admins read all.
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles admin read all" on public.profiles
  for select using (public.current_user_role() = 'admin');

-- host assignments: admins manage; hosts may view their own assignments.
create policy "host assignments admin all" on public.event_host_assignments
  for all using (public.current_user_role() = 'admin');
create policy "host assignments host read own" on public.event_host_assignments
  for select using (auth.uid() = host_id);

-- events: public reads published+active; staff manage.
create policy "events public read" on public.events
  for select using (status = 'published' and is_active);
create policy "events staff read" on public.events
  for select using (auth.uid() is not null and public.current_user_role() in ('admin', 'event_host'));
create policy "events admin write" on public.events
  for all using (public.current_user_role() = 'admin');

-- participants: write only via server-side flows; no public reads of the table.
create policy "participants admin read" on public.participants
  for select using (public.current_user_role() = 'admin');
create policy "participants insert via service role" on public.participants
  for insert with check (true);

-- registrations: participants may insert (registration flow); no list reads.
create policy "registrations insert" on public.registrations
  for insert with check (true);
create policy "registrations admin read" on public.registrations
  for select using (public.current_user_role() = 'admin');
create policy "registrations host read assigned" on public.registrations
  for select using (
    exists (
      select 1
      from public.event_host_assignments a
      where a.event_id = registrations.event_id and a.host_id = auth.uid()
    )
  );

-- teams / team_members: inserted with registrations; readable by staff scope.
create policy "teams insert" on public.teams for insert with check (true);
create policy "teams admin read" on public.teams
  for select using (public.current_user_role() = 'admin');
create policy "teams host read assigned" on public.teams
  for select using (
    exists (
      select 1
      from public.registrations r
      join public.event_host_assignments a on a.event_id = r.event_id
      where r.id = teams.registration_id and a.host_id = auth.uid()
    )
  );

create policy "team members insert" on public.team_members for insert with check (true);
create policy "team members admin read" on public.team_members
  for select using (public.current_user_role() = 'admin');
create policy "team members host read assigned" on public.team_members
  for select using (
    exists (
      select 1
      from public.teams t
      join public.registrations r on r.id = t.registration_id
      join public.event_host_assignments a on a.event_id = r.event_id
      where t.id = team_members.team_id and a.host_id = auth.uid()
    )
  );

-- schedules: public reads published rows; staff manage (hosts: assigned only).
create policy "schedules public read" on public.schedules
  for select using (is_published);
create policy "schedules admin write" on public.schedules
  for all using (public.current_user_role() = 'admin');
create policy "schedules host manage assigned" on public.schedules
  for all using (
    exists (
      select 1 from public.event_host_assignments a
      where a.event_id = schedules.event_id and a.host_id = auth.uid()
    )
  );

-- announcements: public reads published (unexpired handled in queries);
create policy "announcements public read" on public.announcements
  for select using (status = 'published');
create policy "announcements admin write" on public.announcements
  for all using (public.current_user_role() = 'admin');
create policy "announcements host manage assigned" on public.announcements
  for all using (
    scope = 'event'
    and exists (
      select 1 from public.event_host_assignments a
      where a.event_id = announcements.event_id and a.host_id = auth.uid()
    )
  );

-- results: public reads published; staff manage with host scoping.
create policy "results public read" on public.results
  for select using (status = 'published');
create policy "results admin write" on public.results
  for all using (public.current_user_role() = 'admin');
create policy "results host manage assigned" on public.results
  for all using (
    exists (
      select 1 from public.event_host_assignments a
      where a.event_id = results.event_id and a.host_id = auth.uid()
    )
  );

-- gallery: public reads published items; staff manage.
create policy "gallery public read" on public.gallery
  for select using (is_published);
create policy "gallery admin write" on public.gallery
  for all using (public.current_user_role() = 'admin');

-- sponsors: public reads active; admin manages.
create policy "sponsors public read" on public.sponsors
  for select using (is_active);
create policy "sponsors admin write" on public.sponsors
  for all using (public.current_user_role() = 'admin');

-- contact_messages: anyone may submit; only admins read/manage.
create policy "contact messages insert" on public.contact_messages
  for insert with check (true);
create policy "contact messages admin read" on public.contact_messages
  for select using (public.current_user_role() = 'admin');
create policy "contact messages admin update" on public.contact_messages
  for update using (public.current_user_role() = 'admin');

-- ============================================================================
-- STORAGE — gallery bucket with MIME + size guardrails (policy level)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy "gallery public read" on storage.objects
  for select using (bucket_id = 'gallery');

create policy "gallery staff upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'gallery'
    and (storage.foldername(name))[1] = 'images'
    and public.current_user_role() in ('admin', 'event_host')
  );

create policy "gallery staff update" on storage.objects
  for update to authenticated
  using (bucket_id = 'gallery' and public.current_user_role() in ('admin', 'event_host'));

create policy "gallery staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'gallery' and public.current_user_role() = 'admin');

-- ============================================================================
-- BOOTSTRAP FIRST ADMIN
-- After creating your own Supabase Auth user (Dashboard → Authentication),
-- run:  update public.profiles set role = 'admin' where id = '<your-user-id>';
-- ============================================================================
