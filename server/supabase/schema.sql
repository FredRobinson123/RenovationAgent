-- Enable UUID generation (already enabled on most Supabase projects)
create extension if not exists "pgcrypto";

create table if not exists public.chat_image_uploads (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id text not null,
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_image_uploads_session_idx on public.chat_image_uploads (session_id, created_at);
create index if not exists chat_image_uploads_created_idx on public.chat_image_uploads (created_at);

create type if not exists plan_asset_type as enum (
  'budget',
  'contractor',
  'materials',
  'timeline',
  'design-guide',
  'image-gallery'
);

create table if not exists public.plan_assets (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id text not null,
  asset_type plan_asset_type not null,
  title text not null,
  summary text,
  data jsonb not null,
  source_agent text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists plan_assets_user_session_idx on public.plan_assets (user_id, session_id, created_at desc);
create index if not exists plan_assets_created_idx on public.plan_assets (created_at desc);

-- Run once to provision the storage bucket that will hold the uploads.
-- Adjust the name if SUPABASE_BUCKET is changed in the server config.
select storage.create_bucket(
  bucket_id := 'chat-image-uploads',
  public := false
);

