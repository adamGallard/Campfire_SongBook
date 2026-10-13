-- Admins per book.
--
-- Until now every admin managed all four books. An admin can now be limited to
-- some of them: `admins.books` lists the books they look after, and null means
-- every book. Every existing admin is left as null, so nobody loses access.
--
-- Only an every-book admin can add, change or remove admins, switch books'
-- details, or use the All books page. A book admin can edit content, sections
-- and submissions in their own books only, and the database enforces that.
--
-- Apply this BEFORE deploying the code that reads `admins.books`: until it is
-- applied, nobody can sign in to the admin pages.

alter table public.admins add column if not exists books text[];

alter table public.admins drop constraint if exists admins_books_not_empty;
alter table public.admins add constraint admins_books_not_empty
  check (books is null or cardinality(books) > 0);

-- Can the signed-in user manage this book?
create or replace function private.can_manage(p_book text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      and (a.books is null or p_book = any (a.books))
  );
$$;

-- Is the signed-in user an every-book admin?
create or replace function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      and a.books is null
  );
$$;

-- The book a section belongs to, for the policies on items, tags and submissions.
create or replace function private.kind_book(p_kind text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select k.book from public.kinds k where k.slug = p_kind;
$$;

-- The first-time sign-in checks the address is on the list before creating an
-- account. Any book will do.
create or replace function public.admin_email_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a
    where lower(a.email) = lower(btrim(coalesce(p_email, '')))
  );
$$;

revoke all on function public.admin_email_exists(text) from public;
grant execute on function public.admin_email_exists(text) to anon, authenticated;

drop policy if exists books_admin_write on public.books;
create policy books_admin_write on public.books
  for all to authenticated using (private.is_owner()) with check (private.is_owner());

drop policy if exists kinds_admin_write on public.kinds;
create policy kinds_admin_write on public.kinds
  for all to authenticated
  using (private.can_manage(book)) with check (private.can_manage(book));

drop policy if exists tags_admin_write on public.tags;
create policy tags_admin_write on public.tags
  for all to authenticated
  using (private.can_manage(private.kind_book(kind)))
  with check (private.can_manage(private.kind_book(kind)));

drop policy if exists items_admin_all on public.items;
create policy items_admin_all on public.items
  for all to authenticated
  using (private.can_manage(private.kind_book(kind)))
  with check (private.can_manage(private.kind_book(kind)));

drop policy if exists submissions_admin_all on public.submissions;
create policy submissions_admin_all on public.submissions
  for all to authenticated
  using (private.can_manage(private.kind_book(kind)))
  with check (private.can_manage(private.kind_book(kind)));

-- Any admin can see who the admins are; only an every-book admin changes the list.
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins
  for select to authenticated using (private.is_admin());
drop policy if exists admins_write on public.admins;
create policy admins_write on public.admins
  for all to authenticated using (private.is_owner()) with check (private.is_owner());
