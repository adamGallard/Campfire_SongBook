-- Admin accounts by setup code.
--
-- "First time here?" checked the allowlist only in the browser, and with
-- Confirm email off the database trusted whatever address an account was made
-- with. So anyone could create the account for an address an admin had just
-- added, before its owner did, and become that admin.
--
-- Now adding an admin issues a one-time setup code, shown once to the admin
-- who added them, and only its hash is kept. "First time here?" asks for it,
-- and the database refuses to create any account unless that address has just
-- presented its code. Addresses already on the list that have no account yet
-- need a code: remove and re-add them, or set one by hand (see schema.sql).
--
-- Apply this BEFORE deploying the code that asks for the setup code.

alter table public.admins add column if not exists setup_hash text;
alter table public.admins add column if not exists setup_open_until timestamptz;

-- The browser-side allowlist check it replaces also told anyone which
-- addresses were admins.
drop function if exists public.admin_email_exists(text);

-- Lets an address create its account for the next ten minutes, given the
-- setup code it was issued. True when the code matched.
create or replace function public.open_admin_setup(p_email text, p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.admins
     set setup_open_until = now() + interval '10 minutes'
   where lower(email) = lower(btrim(coalesce(p_email, '')))
     and setup_hash is not null
     and setup_hash = encode(sha256(convert_to(btrim(coalesce(p_code, '')), 'UTF8')), 'hex');
  return found;
end;
$$;

revoke all on function public.open_admin_setup(text, text) from public;
grant execute on function public.open_admin_setup(text, text) to anon, authenticated;

-- Every new account must be an admin address whose code was just presented.
-- The code is used up as the account is made.
create or replace function private.guard_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.admins
     set setup_hash = null, setup_open_until = null
   where lower(email) = lower(coalesce(new.email, ''))
     and setup_open_until > now();
  if not found then
    raise exception 'Accounts are by setup code only.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_new_user on auth.users;
create trigger guard_new_user
  before insert on auth.users
  for each row execute function private.guard_new_user();
