-- Kostenloser Tutor (alle angemeldeten Konten): Tageslimit je Konto und eine Gesamtgrenze pro Tag, damit das
-- gemeinsame Freikontingent des KI-Anbieters (Gratis-Stufe) nicht von Einzelnen aufgebraucht wird.
-- Live-Projekt, nur app_*-Objekte, idempotent. Die Edge Function „tutor“ ruft app_tutor_take_free() mit dem Login auf.
-- Gespeichert werden nur Zähler (Konto, Tag, Anzahl) – keine Inhalte.

create table if not exists public.app_tutor_free_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  day      date not null default current_date,
  requests integer not null default 0,
  primary key (user_id, day)
);
create table if not exists public.app_tutor_free_total (
  day      date primary key default current_date,
  requests integer not null default 0
);
alter table public.app_tutor_free_usage enable row level security;
alter table public.app_tutor_free_total enable row level security;
revoke all on public.app_tutor_free_usage, public.app_tutor_free_total from anon, authenticated;

-- Zählt eine Anfrage; true = erlaubt. Je Konto höchstens 40 Anfragen am Tag (etwa 2 Sitzungen),
-- alle Konten zusammen höchstens 900 (Gratis-Stufen erlauben rund 1.000 Anfragen pro Tag).
create or replace function public.app_tutor_take_free()
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n integer; total integer;
begin
  if uid is null then return false; end if;
  select requests into total from public.app_tutor_free_total where day = current_date;
  if coalesce(total, 0) >= 900 then return false; end if;
  insert into public.app_tutor_free_usage(user_id, day, requests) values (uid, current_date, 1)
    on conflict (user_id, day) do update set requests = app_tutor_free_usage.requests + 1
    returning requests into n;
  if n > 40 then return false; end if;
  insert into public.app_tutor_free_total(day, requests) values (current_date, 1)
    on conflict (day) do update set requests = app_tutor_free_total.requests + 1;
  delete from public.app_tutor_free_usage where user_id = uid and day < current_date - 30;
  delete from public.app_tutor_free_total where day < current_date - 30;
  return true;
end $$;
revoke execute on function public.app_tutor_take_free() from public, anon;
grant execute on function public.app_tutor_take_free() to authenticated;
