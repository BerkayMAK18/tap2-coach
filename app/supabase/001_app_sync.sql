-- Neue App (Branch dev): Lernstand im Konto – „ein Konto, ein Stand“. Der GitHub-Login reicht, kein Schlüssel.
-- Läuft im LIVE-Supabase-Projekt (Entscheidung Option B, docs/ENTWICKLUNG.md). Legt NUR app_*-Objekte an,
-- berührt keine tap2_*-Tabellen oder -Funktionen der Live-App. Idempotent: darf mehrfach laufen.
--
-- Entscheidung 14.11.2026: Der Konto-Stand ist NICHT Ende-zu-Ende-verschlüsselt (sonst bräuchte jedes Gerät einen
-- Schlüssel). Geschützt durch Login + RLS: Jede Person liest und schreibt nur ihre eigene Zeile. Der Betreiber kann
-- die Lernstände technisch lesen (docs/DATENSCHUTZ.md). Wer das nicht möchte, nutzt den Geräte-Sync ohne Konto
-- (tap2_sync, Ende-zu-Ende-verschlüsselt).
--
-- Inhalt (data): { v: 1, s: Lernstand (Format v7), g: Belohnungen (Paket wie im Sync), at: Zeitpunkt }.
-- Die App prüft alles, was sie liest (normalize, gm.merge) – der Server prüft nur Form und Größe.

create table if not exists public.app_sync (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  rev        integer not null default 1,
  data       jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 600000),
  updated_at timestamptz not null default now()
);
-- Tagessicherung: der erste Stand jedes Tages, 10 Tage lang (zum Zurückholen bei Fehlern)
create table if not exists public.app_sync_history (
  user_id  uuid not null references auth.users (id) on delete cascade,
  rev      integer not null,
  data     jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, rev)
);

alter table public.app_sync enable row level security;
alter table public.app_sync_history enable row level security;
revoke all on public.app_sync, public.app_sync_history from anon, authenticated;
-- Zusätzlich zur fehlenden Berechtigung: Zeilen-Richtlinie nur für die eigene Zeile (falls je Rechte vergeben werden)
drop policy if exists app_sync_own on public.app_sync;
create policy app_sync_own on public.app_sync for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists app_sync_history_own on public.app_sync_history;
create policy app_sync_history_own on public.app_sync_history for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Lesen: nur der eigene Stand
create or replace function public.app_sync_pull()
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object('rev', s.rev, 'data', s.data) from public.app_sync s where s.user_id = auth.uid();
$$;

-- Schreiben mit Versionsprüfung: passt p_base nicht, kommt der aktuelle Stand zurück (App führt zusammen, versucht erneut)
create or replace function public.app_sync_push(p_base integer, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cur public.app_sync%rowtype;
begin
  if uid is null then raise exception 'app: nicht angemeldet'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) > 600000 then raise exception 'app: ungueltige daten'; end if;
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

-- Cloud-Kopie löschen (Knopf in der App). Konto selbst bleibt.
create or replace function public.app_sync_delete()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.app_sync_history where user_id = auth.uid();
  delete from public.app_sync where user_id = auth.uid();
  return found;
end $$;

revoke execute on function public.app_sync_pull(), public.app_sync_push(integer, jsonb), public.app_sync_delete() from public, anon;
grant execute on function public.app_sync_pull(), public.app_sync_push(integer, jsonb), public.app_sync_delete() to authenticated;
