-- BoxGuard schema for Supabase (Postgres).
-- Run once in: Supabase dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run (IF NOT EXISTS everywhere).

-- ── Users (warehouse accounts) ────────────────────────────────
create table if not exists public.users (
    id                 uuid primary key default gen_random_uuid(),
    email              text not null unique,
    password           text not null,              -- bcrypt hash, never plaintext
    warehouse_name     text not null,
    warehouse_location text not null,
    contact_name       text not null,
    contact_phone      text,
    ms_name            text,
    transporter_id     text,
    courier_partner    text,
    created_at         timestamptz not null default now(),
    last_login         timestamptz,
    is_active          boolean not null default true
);

-- ── Packing sessions ──────────────────────────────────────────
create table if not exists public.sessions (
    id           uuid primary key default gen_random_uuid(),
    user_id      text,                              -- users.id as text (JWT carries it as a string)
    batch_id     text not null,
    operator_id  text not null,
    started_at   timestamptz not null default now(),
    ended_at     timestamptz,
    final_count  integer,
    video_path   text,
    upload_path  text,
    source_type  text not null default 'live' check (source_type in ('live', 'upload')),
    status       text not null default 'active' check (status in ('active', 'completed'))
);

create index if not exists sessions_user_started_idx on public.sessions (user_id, started_at desc);
create index if not exists sessions_batch_idx        on public.sessions (batch_id);
create index if not exists sessions_status_idx       on public.sessions (status);

-- ── Detection logs (one row per logged frame batch) ───────────
create table if not exists public.detection_logs (
    id          bigint generated always as identity primary key,
    session_id  uuid not null references public.sessions (id) on delete cascade,
    timestamp   timestamptz not null default now(),
    box_count   integer not null,
    confidence  double precision
);

create index if not exists detection_logs_session_idx on public.detection_logs (session_id, timestamp);

-- ── Security ──────────────────────────────────────────────────
-- RLS on, with no public policies: anon/authenticated keys cannot read or write.
-- The backend uses the service_role key, which bypasses RLS.
alter table public.users          enable row level security;
alter table public.sessions       enable row level security;
alter table public.detection_logs enable row level security;
