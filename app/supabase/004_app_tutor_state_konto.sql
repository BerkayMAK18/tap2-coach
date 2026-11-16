-- KI-Tutor: Tutor-Stand im Konto (ersetzt 003_app_tutor_state.sql). Live-Projekt, nur app_*-Objekte. Idempotent.
--
-- Entscheidung 14.11.2026 („ein Konto, ein Stand“): Wie der Lernstand im Konto liegt auch der Tutor-Stand (Belege,
-- Fehlvorstellungen, Sitzungen, Tutor-XP je Tag) ohne Schlüssel im Konto – der Login reicht auf jedem Gerät.
-- Geschützt durch Login + RLS (nur die eigene Zeile). Der Betreiber kann den Inhalt technisch lesen (docs/DATENSCHUTZ.md).
--
-- Umstellung: Die alte, verschlüsselte Tabelle aus 003 (Spalten kid/blob) wird einmalig gelöscht. Das ist unkritisch:
-- Das Tutor-Wissen wurde am 14.11.2026 ohnehin neu gestartet, und jedes Gerät schreibt seinen lokalen Stand beim
-- nächsten Abgleich wieder hoch (Zusammenführen verliert nichts).

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'app_tutor_state' and column_name = 'blob') then
    drop table public.app_tutor_state cascade;
  end if;
end $$;
drop function if exists public.app_tutor_state_push(integer, text, text, boolean);

create table if not exists public.app_tutor_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  rev        integer not null default 1,
  data       jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 400000),
  updated_at timestamptz not null default now()
);

alter table public.app_tutor_state enable row level security;
revoke all on public.app_tutor_state from anon, authenticated;
drop policy if exists app_tutor_state_own on public.app_tutor_state;
create policy app_tutor_state_own on public.app_tutor_state for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Lesen: nur der eigene Stand
create or replace function public.app_tutor_state_pull()
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object('rev', s.rev, 'data', s.data) from public.app_tutor_state s where s.user_id = auth.uid();
$$;

-- Schreiben mit Versionsprüfung: passt p_base nicht, kommt der aktuelle Stand zurück (App führt zusammen, versucht erneut)
create or replace function public.app_tutor_state_push(p_base integer, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cur public.app_tutor_state%rowtype;
begin
  if uid is null then raise exception 'app: nicht angemeldet'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) > 400000 then raise exception 'app: ungueltige daten'; end if;
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

-- Tutor-Stand in der Cloud löschen (lokal bleibt er)
create or replace function public.app_tutor_state_delete()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.app_tutor_state where user_id = auth.uid();
  return found;
end $$;

revoke execute on function public.app_tutor_state_pull(), public.app_tutor_state_push(integer, jsonb), public.app_tutor_state_delete() from public, anon;
grant execute on function public.app_tutor_state_pull(), public.app_tutor_state_push(integer, jsonb), public.app_tutor_state_delete() to authenticated;
