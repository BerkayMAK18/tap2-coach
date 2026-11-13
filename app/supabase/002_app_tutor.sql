-- KI-Tutor (Premium, nur Admin): Tageslimit pro Konto. Live-Projekt, nur app_*-Objekte, idempotent.
-- Die Edge Function „tutor“ ruft app_tutor_take() mit dem Login des Nutzers auf – kein Service-Key nötig.

create table if not exists public.app_tutor_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null default current_date,
  requests integer not null default 0,
  primary key (user_id, day)
);
alter table public.app_tutor_usage enable row level security;
revoke all on public.app_tutor_usage from anon, authenticated;

-- Zählt eine Anfrage für den angemeldeten Nutzer; true = erlaubt (höchstens 120 Nachrichten pro Tag).
create or replace function public.app_tutor_take()
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n integer;
begin
  if uid is null then return false; end if;
  insert into public.app_tutor_usage(user_id, day, requests) values (uid, current_date, 1)
    on conflict (user_id, day) do update set requests = app_tutor_usage.requests + 1
    returning requests into n;
  delete from public.app_tutor_usage where user_id = uid and day < current_date - 30;
  return n <= 120;
end $$;
revoke execute on function public.app_tutor_take() from public, anon;
grant execute on function public.app_tutor_take() to authenticated;

-- Admin-Rolle für dein Konto setzen (EINMAL, nach dem ersten GitHub-Login auf der Dev-App).
-- Deine Nutzer-ID findest du unter Authentication → Users. Nutzer können app_metadata nicht selbst ändern.
-- update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}' where id = '<deine-user-id>';
