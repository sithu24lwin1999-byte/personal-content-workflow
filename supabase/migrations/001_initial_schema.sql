create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('owner', 'user');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'feature_permission') then
    create type public.feature_permission as enum (
      'content_generate',
      'qc_check',
      'brand_database_view',
      'history_view',
      'export_output',
      'gemini_settings'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ai_output_type') then
    create type public.ai_output_type as enum ('content_generation', 'qc_check');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'user',
  is_active boolean not null default true,
  daily_usage_limit integer not null default 25,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission public.feature_permission not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, permission)
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  brand_voice text,
  target_audience text,
  products_services text,
  do_words text,
  dont_words text,
  writing_style text,
  offers_promotions text,
  contact_info text,
  reference_document_link text,
  sample_content text,
  qc_rules text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gemini_settings (
  id boolean primary key default true,
  api_key_encrypted text,
  model_name text not null default 'gemini-2.5-flash',
  temperature numeric(3,2) not null default 0.40 check (temperature >= 0 and temperature <= 2),
  max_output_tokens integer not null default 2048 check (max_output_tokens > 0),
  content_system_prompt text not null default 'You are a careful content strategist. Follow the selected brand data and user brief.',
  qc_system_prompt text not null default 'You are a meticulous brand QA editor. Return valid JSON only.',
  daily_usage_limit_default integer not null default 25,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint singleton_gemini_settings check (id)
);

insert into public.gemini_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature public.feature_permission not null,
  brand_id uuid references public.brands(id) on delete set null,
  input_chars integer not null default 0,
  output_chars integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  output_type public.ai_output_type not null,
  prompt text not null,
  output text not null,
  qc_score integer,
  issues jsonb,
  suggestions jsonb,
  model_name text,
  created_at timestamptz not null default now()
);

create index if not exists usage_logs_user_created_idx on public.usage_logs (user_id, created_at desc);
create index if not exists ai_outputs_user_created_idx on public.ai_outputs (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists user_permissions_updated_at on public.user_permissions;
create trigger user_permissions_updated_at before update on public.user_permissions
for each row execute function public.set_updated_at();

drop trigger if exists brands_updated_at on public.brands;
create trigger brands_updated_at before update on public.brands
for each row execute function public.set_updated_at();

drop trigger if exists gemini_settings_updated_at on public.gemini_settings;
create trigger gemini_settings_updated_at before update on public.gemini_settings
for each row execute function public.set_updated_at();

create or replace function public.is_owner(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'owner'
      and is_active = true
  );
$$;

create or replace function public.has_permission(
  permission_name public.feature_permission,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_owner(check_user_id)
    or exists (
      select 1
      from public.user_permissions
      join public.profiles on profiles.id = user_permissions.user_id
      where user_permissions.user_id = check_user_id
        and user_permissions.permission = permission_name
        and user_permissions.enabled = true
        and profiles.is_active = true
    );
$$;

alter table public.profiles enable row level security;
alter table public.user_permissions enable row level security;
alter table public.brands enable row level security;
alter table public.gemini_settings enable row level security;
alter table public.usage_logs enable row level security;
alter table public.ai_outputs enable row level security;

drop policy if exists "owners can manage profiles" on public.profiles;
create policy "owners can manage profiles"
on public.profiles for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "users can view own profile" on public.profiles;
create policy "users can view own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "owners can manage permissions" on public.user_permissions;
create policy "owners can manage permissions"
on public.user_permissions for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "users can view own permissions" on public.user_permissions;
create policy "users can view own permissions"
on public.user_permissions for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "owners can manage brands" on public.brands;
create policy "owners can manage brands"
on public.brands for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "permitted users can view brands" on public.brands;
create policy "permitted users can view brands"
on public.brands for select
to authenticated
using (public.has_permission('brand_database_view'));

drop policy if exists "owners can manage gemini settings" on public.gemini_settings;
create policy "owners can manage gemini settings"
on public.gemini_settings for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "owners can view usage logs" on public.usage_logs;
create policy "owners can view usage logs"
on public.usage_logs for select
to authenticated
using (public.is_owner());

drop policy if exists "users can view own usage logs with history permission" on public.usage_logs;
create policy "users can view own usage logs with history permission"
on public.usage_logs for select
to authenticated
using (user_id = auth.uid() and public.has_permission('history_view'));

drop policy if exists "users can insert own usage logs for permitted features" on public.usage_logs;
create policy "users can insert own usage logs for permitted features"
on public.usage_logs for insert
to authenticated
with check (user_id = auth.uid() and public.has_permission(feature));

drop policy if exists "owners can view ai outputs" on public.ai_outputs;
create policy "owners can view ai outputs"
on public.ai_outputs for select
to authenticated
using (public.is_owner());

drop policy if exists "users can view own ai outputs with history permission" on public.ai_outputs;
create policy "users can view own ai outputs with history permission"
on public.ai_outputs for select
to authenticated
using (user_id = auth.uid() and public.has_permission('history_view'));

drop policy if exists "users can insert own permitted ai outputs" on public.ai_outputs;
create policy "users can insert own permitted ai outputs"
on public.ai_outputs for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    (output_type = 'content_generation' and public.has_permission('content_generate'))
    or (output_type = 'qc_check' and public.has_permission('qc_check'))
  )
);
