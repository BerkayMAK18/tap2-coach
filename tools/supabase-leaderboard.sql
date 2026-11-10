-- TAP2 Prüfungscoach – Bestenliste
-- Einrichten: Supabase → SQL Editor → New query → alles einfügen → Run. Kann gefahrlos mehrfach ausgeführt werden.
--
-- Freiwillig: Nur wer in der App einen Namen wählt, erscheint. Öffentlich sichtbar sind Name, Level, XP und Figur –
-- sonst nichts. Die ID ist eine Prüfsumme eines geheimen Werts vom Gerät (bzw. vom Sync-Schlüssel), kein Name, keine E-Mail.
-- Austragen löscht den Eintrag sofort. Unpassende Namen kann der Betreiber im Table Editor (tap2_lb) löschen.
-- Schutz vor Missbrauch des öffentlichen Schlüssels: Zugriff nur über die Funktionen unten; XP können nur steigen,
-- höchstens 30.000 pro Tag; höchstens eine Aktualisierung alle 15 Sekunden; höchstens 5.000 Einträge.

create table if not exists public.tap2_lb (
  id         text primary key check (id ~ '^[0-9a-f]{64}$'),
  name       text not null check (char_length(name) between 3 and 16),
  name_key   text not null unique,
  xp         bigint not null default 0 check (xp >= 0),
  level      integer not null default 1 check (level between 1 and 10000),
  look       text not null default '' check (length(look) <= 200),
  day        date not null default current_date,
  day_gain   bigint not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.tap2_lb enable row level security;
revoke all on public.tap2_lb from anon, authenticated;
create index if not exists tap2_lb_rank on public.tap2_lb (xp desc, created_at asc);

create or replace function public.tap2_lb_name_ok(p_name text)
returns boolean language sql immutable as $$
  select p_name ~ '^[A-Za-z0-9ÄÖÜäöüß_.-]{3,16}$' and lower(p_name) not in ('admin', 'administrator', 'moderator', 'mod', 'system', 'support', 'tap2coach', 'anonymous', 'null', 'undefined');
$$;

-- Mitmachen bzw. Namen ändern
create or replace function public.tap2_lb_join(p_id text, p_name text, p_xp bigint, p_level integer, p_look text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare k text := lower(btrim(p_name)); other text;
begin
  if p_id !~ '^[0-9a-f]{64}$' then raise exception 'tap2: ungueltige id'; end if;
  if not public.tap2_lb_name_ok(btrim(p_name)) then return jsonb_build_object('ok', false, 'err', 'name'); end if;
  if length(coalesce(p_look, '')) > 200 or p_look !~ '^[a-z0-9:._-]*$' then raise exception 'tap2: ungueltige figur'; end if;
  select id into other from public.tap2_lb where name_key = k;
  if other is not null and other <> p_id then return jsonb_build_object('ok', false, 'err', 'vergeben'); end if;
  if exists (select 1 from public.tap2_lb where id = p_id) then
    update public.tap2_lb set name = btrim(p_name), name_key = k, look = coalesce(p_look, look), updated_at = now() where id = p_id;
  else
    if (select count(*) from public.tap2_lb) >= 5000 then raise exception 'tap2: bestenliste voll'; end if;
    -- Startwert: bisher gesammelte XP, aber plausibel begrenzt
    insert into public.tap2_lb(id, name, name_key, xp, level, look) values (p_id, btrim(p_name), k, least(greatest(coalesce(p_xp, 0), 0), 100000), least(greatest(coalesce(p_level, 1), 1), 10000), coalesce(p_look, ''));
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- Stand aktualisieren (XP steigen nur, gedeckelt pro Tag)
create or replace function public.tap2_lb_push(p_id text, p_xp bigint, p_level integer, p_look text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cur public.tap2_lb%rowtype; gain bigint; dg bigint;
begin
  select * into cur from public.tap2_lb where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'gone', true); end if;
  if cur.updated_at > now() - interval '15 seconds' then return jsonb_build_object('ok', true, 'later', true); end if;
  if length(coalesce(p_look, '')) > 200 or p_look !~ '^[a-z0-9:._-]*$' then raise exception 'tap2: ungueltige figur'; end if;
  dg := case when cur.day = current_date then cur.day_gain else 0 end;
  gain := least(greatest(coalesce(p_xp, 0) - cur.xp, 0), greatest(30000 - dg, 0));
  update public.tap2_lb set xp = cur.xp + gain, level = greatest(cur.level, least(greatest(coalesce(p_level, 1), 1), 10000)),
    look = coalesce(p_look, cur.look), day = current_date, day_gain = dg + gain, updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'xp', cur.xp + gain);
end $$;

-- Rangliste: die besten p_limit (max. 200) und der eigene Platz. Gibt nie IDs heraus.
create or replace function public.tap2_lb_top(p_limit integer, p_id text)
returns jsonb language sql security definer set search_path = public stable as $$
  with r as (select id, name, xp, level, look, row_number() over (order by xp desc, created_at asc) as rk from public.tap2_lb)
  select jsonb_build_object(
    'top', coalesce((select jsonb_agg(jsonb_build_object('r', rk, 'name', name, 'xp', xp, 'level', level, 'look', look, 'me', id = p_id) order by rk)
                     from r where rk <= least(greatest(coalesce(p_limit, 50), 1), 200)), '[]'::jsonb),
    'me', (select jsonb_build_object('r', rk, 'name', name, 'xp', xp, 'level', level, 'look', look) from r where id = p_id),
    'total', (select count(*) from public.tap2_lb));
$$;

-- Austragen: Eintrag sofort löschen
create or replace function public.tap2_lb_leave(p_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin delete from public.tap2_lb where id = p_id; return found; end $$;

revoke execute on function public.tap2_lb_join(text, text, bigint, integer, text), public.tap2_lb_push(text, bigint, integer, text),
  public.tap2_lb_top(integer, text), public.tap2_lb_leave(text) from public;
grant execute on function public.tap2_lb_join(text, text, bigint, integer, text), public.tap2_lb_push(text, bigint, integer, text),
  public.tap2_lb_top(integer, text), public.tap2_lb_leave(text) to anon, authenticated;
