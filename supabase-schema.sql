-- Run once in Supabase: SQL Editor > New query.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('student', 'institute', 'industry')),
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(), title text not null, company text not null,
  type text not null default 'internship' check (type in ('internship','job','project')),
  location text not null default 'India', work_mode text not null default 'hybrid' check (work_mode in ('hybrid','remote','onsite')),
  required_skills text[] not null check (cardinality(required_skills) > 0), description text not null default '',
  created_by uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now()
);
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(), opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'submitted' check (status in ('submitted','reviewed','accepted','rejected')),
  created_at timestamptz not null default now(), unique (opportunity_id, student_id)
);
create or replace function public.create_profile_for_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id,email,role) values (new.id,coalesce(new.email,''),coalesce(new.raw_user_meta_data ->> 'role','student')); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_profile_for_new_user();
alter table public.profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.applications enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "opportunities_select_authenticated" on public.opportunities for select to authenticated using (true);
create policy "industry_creates_opportunities" on public.opportunities for insert to authenticated with check ((select auth.uid()) = created_by and exists (select 1 from public.profiles where id = auth.uid() and role = 'industry'));
create policy "students_view_own_applications" on public.applications for select to authenticated using ((select auth.uid()) = student_id);
create policy "industry_view_their_applications" on public.applications for select to authenticated using (exists (select 1 from public.opportunities where opportunities.id = opportunity_id and opportunities.created_by = auth.uid()));
create policy "students_apply_once" on public.applications for insert to authenticated with check ((select auth.uid()) = student_id and exists (select 1 from public.profiles where id = auth.uid() and role = 'student'));
