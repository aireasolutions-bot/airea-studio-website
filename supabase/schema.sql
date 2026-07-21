-- ============================================================
-- AIREA Studio — Admin portal schema
-- Tables: admin_users, content_blocks, comments, assets, publish_log
-- Security: RLS — only allow-listed admins (is_admin) can access.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- allow-list ----------
create table if not exists public.admin_users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  role       text not null default 'editor',   -- owner | editor | viewer
  full_name  text,
  created_at timestamptz not null default now()
);

-- ---------- editable content blocks (draft + published) ----------
create table if not exists public.content_blocks (
  key             text primary key,            -- e.g. home.hero.headline
  page            text not null default 'home',
  section         text,
  label           text,
  type            text not null default 'text',-- text | richtext | url | image | list
  draft_value     jsonb,
  published_value jsonb,
  sort            int  not null default 0,
  updated_at      timestamptz not null default now(),
  updated_by      text
);

-- ---------- review comments (click-to-comment on preview) ----------
create table if not exists public.comments (
  id           uuid primary key default gen_random_uuid(),
  page         text not null default '/',
  target_label text,
  anchor       text,
  pos_x        real,
  pos_y        real,
  body         text not null,
  status       text not null default 'open'
               check (status in ('open','in_progress','confirmed','rejected','resolved')),
  author_email text,
  author_name  text,
  mentions     text[] not null default '{}',
  parent_id    uuid references public.comments(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  resolved_by  text
);

-- ---------- asset registry (mirrors Cloudflare R2) ----------
create table if not exists public.assets (
  id           uuid primary key default gen_random_uuid(),
  key          text unique not null,           -- R2 object key, e.g. assets/robot/head.png
  filename     text not null,
  url          text not null,                  -- public URL
  type         text,                           -- image | video
  content_type text,
  folder       text,
  size_bytes   bigint,
  width        int,
  height       int,
  alt          text,
  uploaded_by  text,
  created_at   timestamptz not null default now()
);

-- ---------- publish audit log ----------
create table if not exists public.publish_log (
  id           uuid primary key default gen_random_uuid(),
  summary      text,
  changed_keys text[],
  commit_sha   text,
  commit_url   text,
  status       text not null default 'success',
  published_by text,
  created_at   timestamptz not null default now()
);

-- ---------- helper: is the current user an allow-listed admin? ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- updated_at triggers ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists t_cb_updated on public.content_blocks;
create trigger t_cb_updated before update on public.content_blocks
  for each row execute function public.touch_updated_at();

drop trigger if exists t_cm_updated on public.comments;
create trigger t_cm_updated before update on public.comments
  for each row execute function public.touch_updated_at();

-- ---------- Row Level Security ----------
alter table public.admin_users    enable row level security;
alter table public.content_blocks enable row level security;
alter table public.comments       enable row level security;
alter table public.assets         enable row level security;
alter table public.publish_log    enable row level security;

drop policy if exists p_admin_users on public.admin_users;
create policy p_admin_users on public.admin_users
  for select using (public.is_admin());

drop policy if exists p_content on public.content_blocks;
create policy p_content on public.content_blocks
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_comments on public.comments;
create policy p_comments on public.comments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_assets on public.assets;
create policy p_assets on public.assets
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_publish on public.publish_log;
create policy p_publish on public.publish_log
  for select using (public.is_admin());

-- ---------- AIREA Agent conversations (per-admin chat history) ----------
create table if not exists public.agent_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_email text not null,
  title      text not null default 'New chat',
  messages   jsonb not null default '[]'::jsonb,   -- chat transcript (+ attachments, edits)
  staged     jsonb not null default '[]'::jsonb,    -- unpublished file edits for this chat
  mode       text not null default 'build',         -- build (gpt-5.5) | reason (o3-mini)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.agent_conversations enable row level security;
-- Each admin sees/edits only their OWN conversations (browser CRUD via supabase-js).
drop policy if exists p_agent_convos on public.agent_conversations;
create policy p_agent_convos on public.agent_conversations
  for all
  using (public.is_admin() and lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (public.is_admin() and lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', '')));
create index if not exists idx_agent_convos_user_updated
  on public.agent_conversations (user_email, updated_at desc);
-- ---------- tracking tags (pixels & analytics) ----------
create table if not exists public.tracking_tags (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null,                    -- ga4|gtm|google-ads|meta|tiktok|linkedin|pinterest|snap|clarity|hotjar|x|custom
  label       text not null,
  config      jsonb not null default '{}'::jsonb, -- e.g. {"id":"G-XXXX"}
  custom_head text,
  custom_body text,
  enabled     boolean not null default false,
  notes       text,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists t_tt_updated on public.tracking_tags;
create trigger t_tt_updated before update on public.tracking_tags
  for each row execute function public.touch_updated_at();

-- Owners/admins only for raw custom HTML tags; members manage typed providers.
create or replace function public.is_admin_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and a.role in ('owner','admin')
  );
$$;
grant execute on function public.is_admin_manager() to anon, authenticated;

alter table public.tracking_tags enable row level security;
drop policy if exists p_tracking_read on public.tracking_tags;
create policy p_tracking_read on public.tracking_tags
  for select using (public.is_admin());
drop policy if exists p_tracking_write on public.tracking_tags;
create policy p_tracking_write on public.tracking_tags
  for insert with check (public.is_admin() and (provider <> 'custom' or public.is_admin_manager()));
drop policy if exists p_tracking_update on public.tracking_tags;
create policy p_tracking_update on public.tracking_tags
  for update using (public.is_admin() and (provider <> 'custom' or public.is_admin_manager()))
  with check (public.is_admin() and (provider <> 'custom' or public.is_admin_manager()));
drop policy if exists p_tracking_delete on public.tracking_tags;
create policy p_tracking_delete on public.tracking_tags
  for delete using (public.is_admin() and (provider <> 'custom' or public.is_admin_manager()));

-- Public read of ENABLED tags only (view runs with owner rights, bypassing RLS by design).
create or replace view public.active_tracking_tags as
  select id, provider, config, custom_head, custom_body
  from public.tracking_tags where enabled;
grant select on public.active_tracking_tags to anon, authenticated;
