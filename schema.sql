-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.Willwi (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT Willwi_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admin_users (
  user_id uuid NOT NULL,
  email text,
  CONSTRAINT admin_users_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  extension text NOT NULL,
  payload jsonb,
  event text,
  private boolean DEFAULT false,
  inserted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.songs (
  id text NOT NULL,
  title text NOT NULL,
  version_label text,
  cover_url text,
  language text NOT NULL,
  project_type text NOT NULL,
  release_category text NOT NULL,
  release_company text,
  release_date text NOT NULL,
  is_editor_pick boolean DEFAULT false,
  is_interactive_active boolean DEFAULT false,
  is_official_exclusive boolean DEFAULT false,
  isrc text,
  upc text,
  spotify_id text,
  spotify_link text,
  youtube_url text,
  description text,
  lyrics text,
  credits text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  cover_overlay_text text,
  publisher text,
  musicbrainz_id text,
  cloud_video_url text,
  custom_audio_link text,
  musixmatch_url text,
  youtube_music_url text,
  apple_music_link text,
  smart_link text,
  distrokid_manage_url text,
  audio_url text,
  internal_code text UNIQUE,
  CONSTRAINT songs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.spotify_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  client_secret text NOT NULL,
  refresh_token text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT spotify_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sync_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  sync_type text NOT NULL,
  last_sync_at timestamp with time zone DEFAULT now(),
  next_sync_scheduled_at timestamp with time zone,
  status text DEFAULT 'pending'::text,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sync_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tmp_vault_json (
  data jsonb
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  type text NOT NULL,
  amount numeric NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text,
  email text UNIQUE,
  credits integer DEFAULT 0,
  is_admin boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
