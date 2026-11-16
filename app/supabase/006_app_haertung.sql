-- Härtung vor dem Teilen mit Demo-Testern (Sicherheitsprüfung 15.11.2026). Live-Projekt, nur app_*-Objekte, idempotent.
-- Einspielen: Supabase → SQL Editor → diesen Inhalt einfügen → Run. Danach die Edge Function „tutor“ neu deployen.
-- Berührt keine tap2_*-Tabellen oder -Funktionen der Live-App.
--
-- 1. Kostenloser Tutor: fairer verteilt – höchstens 30 Anfragen pro Konto und Tag, höchstens 6 pro Minute, Gesamtgrenze
--    900 pro Tag wird atomar gezählt (vorher: 40/Tag ohne Minutengrenze, Gesamtgrenze bei gleichzeitigen Anfragen überschreitbar).
-- 2. Tutor Pro (nur Admin): höchstens 40 Anfragen pro Tag (vorher 120) – Kostenbremse, falls eine Admin-Sitzung gestohlen wird.
-- 3. Speicher: Gesamtgrenze für alle app_*-Stände (150 MB), damit die gemeinsame Datenbank nie vollläuft – sonst fiele auch
--    die Live-App (tap2_sync, Rangliste) aus. Einzelne Stände bleiben wie bisher begrenzt.
-- 4. app_sync_push: p_base = NULL umgeht die Versionsprüfung nicht mehr.
-- 5. Ranglisten-ID für Konten: app_lb_id() leitet sie mit einem Server-Geheimnis ab (HMAC) statt aus der Nutzer-ID.

-- ---------- 1. Kostenloser Tutor
alter table public.app_tutor_free_usage add column if not exists minute_at timestamptz;
alter table public.app_tutor_free_usage add column if not exists minute_n integer not null default 0;

create or replace function public.app_tutor_take_free()
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.app_tutor_free_usage%rowtype; ok_total boolean;
begin
  if uid is null then return false; end if;
  insert into public.app_tutor_free_usage(user_id, day, requests) values (uid, current_date, 0) on conflict (user_id, day) do nothing;
  select * into r from public.app_tutor_free_usage where user_id = uid and day = current_date for update;
  if r.requests >= 30 then return false; end if;                                                   -- Tageslimit je Konto
  if r.minute_at is not null and r.minute_at > now() - interval '1 minute' and r.minute_n >= 6 then return false; end if; -- Minutengrenze
  -- Gesamtgrenze atomar: zählt nur, solange sie nicht erreicht ist
  insert into public.app_tutor_free_total(day, requests) values (current_date, 1)
    on conflict (day) do update set requests = app_tutor_free_total.requests + 1 where app_tutor_free_total.requests < 900
    returning true into ok_total;
  if not coalesce(ok_total, false) then return false; end if;
  update public.app_tutor_free_usage set requests = r.requests + 1,
    minute_at = case when r.minute_at is null or r.minute_at <= now() - interval '1 minute' then now() else r.minute_at end,
    minute_n  = case when r.minute_at is null or r.minute_at <= now() - interval '1 minute' then 1 else r.minute_n + 1 end
    where user_id = uid and day = current_date;
  delete from public.app_tutor_free_usage where user_id = uid and day < current_date - 30;
  delete from public.app_tutor_free_total where day < current_date - 30;
  return true;
end $$;
revoke execute on function public.app_tutor_take_free() from public, anon;
grant execute on function public.app_tutor_take_free() to authenticated;

-- ---------- 2. Tutor Pro (nur Admin)
create or replace function public.app_tutor_take()
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n integer;
begin
  if uid is null then return false; end if;
  insert into public.app_tutor_usage(user_id, day, requests) values (uid, current_date, 1)
    on conflict (user_id, day) do update set requests = app_tutor_usage.requests + 1
    returning requests into n;
  delete from public.app_tutor_usage where user_id = uid and day < current_date - 30;
  return n <= 40;
end $$;
revoke execute on function public.app_tutor_take() from public, anon;
grant execute on function public.app_tutor_take() to authenticated;

-- ---------- 3. Speicher-Gesamtgrenze für alle app_*-Stände
create or replace function public.app_storage_ok()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce(pg_total_relation_size('public.app_sync'), 0)
       + coalesce(pg_total_relation_size('public.app_sync_history'), 0)
       + coalesce(pg_total_relation_size('public.app_tutor_state'), 0) < 150 * 1024 * 1024;
$$;
revoke execute on function public.app_storage_ok() from public, anon, authenticated;

-- ---------- 4. app_sync_push: Versionsprüfung immer, Speichergrenze
create or replace function public.app_sync_push(p_base integer, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cur public.app_sync%rowtype;
begin
  if uid is null then raise exception 'app: nicht angemeldet'; end if;
  if p_base is null or p_base < 0 then raise exception 'app: ungueltige version'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) > 600000 then raise exception 'app: ungueltige daten'; end if;
  if not public.app_storage_ok() then raise exception 'app: speicher voll'; end if;
  select * into cur from public.app_sync where user_id = uid for update;
  if not found then
    if p_base <> 0 then return jsonb_build_object('ok', false, 'rev', 0, 'gone', true); end if;
    -- Bremse: höchstens 60 neue Konten-Stände pro Stunde (für alle zusammen)
    if (select count(*) from public.app_sync where rev = 1 and updated_at > now() - interval '1 hour') >= 60 then
      raise exception 'app: gerade zu viele neue verbindungen';
    end if;
    insert into public.app_sync(user_id, rev, data) values (uid, 1, p_data);
    return jsonb_build_object('ok', true, 'rev', 1);
  end if;
  if cur.rev <> p_base then return jsonb_build_object('ok', false, 'rev', cur.rev, 'data', cur.data); end if;
  if not exists (select 1 from public.app_sync_history h where h.user_id = uid and h.saved_at::date = now()::date) then
    insert into public.app_sync_history(user_id, rev, data) values (uid, cur.rev, cur.data) on conflict do nothing;
    delete from public.app_sync_history h where h.user_id = uid and h.saved_at < now() - interval '10 days';
  end if;
  update public.app_sync set rev = cur.rev + 1, data = p_data, updated_at = now() where user_id = uid;
  return jsonb_build_object('ok', true, 'rev', cur.rev + 1);
end $$;
revoke execute on function public.app_sync_push(integer, jsonb) from public, anon;
grant execute on function public.app_sync_push(integer, jsonb) to authenticated;

create or replace function public.app_tutor_state_push(p_base integer, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cur public.app_tutor_state%rowtype;
begin
  if uid is null then raise exception 'app: nicht angemeldet'; end if;
  if p_base is null or p_base < 0 then raise exception 'app: ungueltige version'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) > 400000 then raise exception 'app: ungueltige daten'; end if;
  if not public.app_storage_ok() then raise exception 'app: speicher voll'; end if;
  select * into cur from public.app_tutor_state where user_id = uid for update;
  if not found then
    if p_base <> 0 then return jsonb_build_object('ok', false, 'rev', 0, 'gone', true); end if;
    insert into public.app_tutor_state(user_id, rev, data) values (uid, 1, p_data);
    return jsonb_build_object('ok', true, 'rev', 1);
  end if;
  if cur.rev <> p_base then return jsonb_build_object('ok', false, 'rev', cur.rev, 'data', cur.data); end if;
  update public.app_tutor_state set rev = cur.rev + 1, data = p_data, updated_at = now() where user_id = uid;
  return jsonb_build_object('ok', true, 'rev', cur.rev + 1);
end $$;
revoke execute on function public.app_tutor_state_push(integer, jsonb) from public, anon;
grant execute on function public.app_tutor_state_push(integer, jsonb) to authenticated;

-- ---------- 5. Ranglisten-ID für Konten (HMAC mit Server-Geheimnis; das Geheimnis ist für niemanden lesbar)
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.app_secret (name text primary key, value bytea not null);
alter table public.app_secret enable row level security;
revoke all on public.app_secret from anon, authenticated;
insert into public.app_secret(name, value) values ('lb', extensions.gen_random_bytes(32)) on conflict (name) do nothing;

create or replace function public.app_lb_id()
returns text language sql security definer set search_path = public, extensions stable as $$
  select encode(extensions.hmac(convert_to('tap2-lb|u|' || auth.uid()::text, 'UTF8'), s.value, 'sha256'), 'hex')
  from public.app_secret s where s.name = 'lb' and auth.uid() is not null;
$$;
revoke execute on function public.app_lb_id() from public, anon;
grant execute on function public.app_lb_id() to authenticated;
