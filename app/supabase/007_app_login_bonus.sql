-- Login-Bonus (Tagesbonus) serverseitig: einmal pro Konto und Tag – der Server entscheidet mit seiner eigenen Uhr.
-- Live-Projekt, nur app_*-Objekte, idempotent. Einspielen: Supabase-Dashboard → SQL Editor → Inhalt ausführen.
--
-- Wie bei Duolingo & Co. ist nicht das Gerät die Quelle der Wahrheit, sondern der Server:
-- - „heute“ ist der Tag in Europe/Berlin auf dem Server, nicht die Uhr des Geräts;
-- - pro Konto und Tag gibt es genau eine Zeile (Primärschlüssel) – ein zweiter Versuch, egal von welchem Gerät,
--   aus welchem Tab oder nach einem Zurücksetzen des Browsers, bekommt nur „schon abgeholt“;
-- - Kalendertag (0–6), Runde und Serie rechnet der Server aus der letzten Zeile; die App zeigt nur an, was er sagt.

create table if not exists public.app_login_bonus (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  idx        smallint not null check (idx between 0 and 6), -- abgeholter Kalendertag (0 = Tag 1)
  round      integer not null check (round >= 1),
  streak     integer not null check (streak >= 1),
  claimed_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.app_login_bonus enable row level security;
revoke all on public.app_login_bonus from anon, authenticated; -- nur über die Funktionen unten

create or replace function public.app_login_today() returns date
language sql stable as $$ select (now() at time zone 'Europe/Berlin')::date $$;

-- Stand für die Anzeige: heute schon abgeholt? Welcher Kalendertag ist als Nächstes dran?
create or replace function public.app_login_state()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := public.app_login_today(); l public.app_login_bonus;
begin
  if uid is null then return null; end if;
  select * into l from public.app_login_bonus where user_id = uid order by day desc limit 1;
  if not found then return jsonb_build_object('day', d, 'claimed', false); end if;
  return jsonb_build_object('day', d, 'claimed', l.day = d, 'last', l.day, 'idx', l.idx, 'round', l.round, 'streak', l.streak);
end $$;

-- Abholen: genau einmal pro Tag. ok = true → Belohnung für Kalendertag idx gutschreiben; sonst schon abgeholt.
create or replace function public.app_login_claim()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); d date := public.app_login_today(); l public.app_login_bonus;
        n_idx smallint; n_round integer; n_streak integer; ins integer;
begin
  if uid is null then return jsonb_build_object('ok', false, 'err', 'login'); end if;
  select * into l from public.app_login_bonus where user_id = uid order by day desc limit 1;
  if found and l.day = d then
    return jsonb_build_object('ok', false, 'already', true, 'day', d, 'idx', l.idx, 'round', l.round, 'streak', l.streak);
  end if;
  if not found then n_idx := 0; n_round := 1; n_streak := 1;
  else
    n_idx := case when l.idx >= 6 then 0 else l.idx + 1 end;
    n_round := case when l.idx >= 6 then l.round + 1 else l.round end;
    n_streak := case when l.day = d - 1 then l.streak + 1 else 1 end;
  end if;
  insert into public.app_login_bonus(user_id, day, idx, round, streak) values (uid, d, n_idx, n_round, n_streak)
    on conflict (user_id, day) do nothing;
  get diagnostics ins = row_count;
  if ins = 0 then -- gleichzeitiger zweiter Versuch (zwei Tabs): nur einer gewinnt
    select * into l from public.app_login_bonus where user_id = uid and day = d;
    return jsonb_build_object('ok', false, 'already', true, 'day', d, 'idx', l.idx, 'round', l.round, 'streak', l.streak);
  end if;
  delete from public.app_login_bonus where user_id = uid and day < d - 60; -- nur die letzten Wochen behalten
  return jsonb_build_object('ok', true, 'day', d, 'idx', n_idx, 'round', n_round, 'streak', n_streak);
end $$;

revoke execute on function public.app_login_state() from public, anon;
revoke execute on function public.app_login_claim() from public, anon;
grant execute on function public.app_login_state() to authenticated;
grant execute on function public.app_login_claim() to authenticated;
