-- Account schema: prepared for local testing; not deployed.
-- Do not push to a hosted project without separate approval.
begin;

create table public.accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text collate "C" not null,
  role text collate "C" not null check (role in ('admin', 'staff')),
  status text collate "C" not null default 'deactivated'
    check (status in ('active', 'locked', 'deactivated')),
  display_name text not null check (
    char_length(display_name) between 1 and 100
    and display_name ~ '[^[:space:]]'
  ),
  -- Canonical storage: lowercase ASCII, 3-32 chars; no surrounding spaces.
  -- Trusted provisioning normalizes with lower(btrim(input) collate "C").
  constraint accounts_username_canonical check (
    username = lower(btrim(username) collate "C")
    and char_length(username) between 3 and 32
    and username collate "C" ~ '^[a-z0-9][a-z0-9._-]*$'
  )
);

create unique index accounts_username_ci_unique
  on public.accounts (lower(username collate "C"));

alter table public.accounts enable row level security;

-- No anonymous lookup, including username/email existence checks.
revoke all privileges on table public.accounts
  from public, anon, authenticated, service_role;
grant select (user_id, username, role, status, display_name)
  on table public.accounts to authenticated;

create policy accounts_read_own on public.accounts
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- No INSERT/UPDATE/DELETE policies or grants for ordinary signed-in users,
-- including application admins. Privileged changes require a trusted backend.
-- Supabase service_role bypasses RLS; grants still restrict its table operations.
grant select, insert, update, delete on table public.accounts to service_role;

-- Intentionally no FORCE ROW LEVEL SECURITY: owner/service access is trusted.
-- This own-row policy also permits disabled users to read their own status.
-- It DOES NOT deny direct Auth sign-in or protect other tables/APIs.

comment on table public.accounts is
  'Server-managed application identity; never store passwords or email mappings here.';

commit;

