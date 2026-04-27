grant usage on schema public to anon;

grant select on table public.content_ideas to anon;
grant select on table public.tiktok_accounts to anon;

alter table public.content_ideas enable row level security;
alter table public.tiktok_accounts enable row level security;

drop policy if exists "anon can read content_ideas" on public.content_ideas;
create policy "anon can read content_ideas"
on public.content_ideas
for select
to anon
using (true);

drop policy if exists "anon can read tiktok_accounts" on public.tiktok_accounts;
create policy "anon can read tiktok_accounts"
on public.tiktok_accounts
for select
to anon
using (true);
