-- Neue App (Branch dev): Ende-zu-Ende-verschlüsselter Sync im Konto.
-- Läuft im LIVE-Supabase-Projekt (Entscheidung Option B, docs/ENTWICKLUNG.md). Legt NUR app_*-Objekte an,
-- berührt keine tap2_*-Tabellen oder -Funktionen der Live-App. Idempotent: darf mehrfach laufen.
--
-- Der Server speichert nur verschlüsselte Daten (blob). Der Schlüssel bleibt im Browser.

create table if not exists public.app_sync (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  rev        integer not null default 1,
  blob       text not null check (length(blob) <= 300000 and blob ~ '^1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  updated_at timestamptz not null default now()
);
-- Tagessicherung: der erste Stand jedes Tages, 10 Tage lang (zum Zurückholen bei Fehlern)
create table if not exists public.app_sync_history (
  user_id  uuid not null references auth.users (id) on delete cascade,
  rev      integer not null,
  blob     text not null,
  saved_at timestamptz not null default now(),
  primary key (user_id, rev)
);

alter table public.app_sync enable row level security;
alter table public.app_sync_history enable row level security;
revoke all on public.app_sync, public.app_sync_history from anon, authenticated;

-- Lesen: nur der eigene Stand
create or replace function public.app_sync_pull()
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object('rev', s.rev, 'blob', s.blob) from public.app_sync s where s.user_id = auth.uid();
$$;

-- Schreiben mit Versionsprüfung: passt p_base nicht, kommt der aktuelle Stand zurück (App führt zusammen, versucht erneut)
create or replace function public.app_sync_push(p_base integer, p_blob text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cur public.app_sync%rowtype;
begin
  if uid is null then raise exception 'app: nicht angemeldet'; end if;
  if length(p_blob) > 300000 or p_blob !~ '^1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' then raise exception 'app: ungueltige daten'; end if;
  select * into cur from public.app_sync where user_id = uid for update;
  if not found then
    if p_base <> 0 then return jsonb_build_object('ok', false, 'rev', 0, 'gone', true); end if;
    -- Bremse: höchstens 60 neue Konten-Stände pro Stunde (für alle zusammen)
    if (select count(*) from public.app_sync where rev = 1 and updated_at > now() - interval '1 hour') >= 60 then
      raise exception 'app: gerade zu viele neue verbindungen';
    end if;
    insert into public.app_sync(user_id, rev, blob) values (uid, 1, p_blob);
    return jsonb_build_object('ok', true, 'rev', 1);
  end if;
  if cur.rev <> p_base then return jsonb_build_object('ok', false, 'rev', cur.rev, 'blob', cur.blob); end if;
  -- Zusammenführen lässt den Stand nie schrumpfen; ein viel kleinerer Upload ist ein Fehler
  if length(cur.blob) > 4000 and length(p_blob) < length(cur.blob) / 2 then raise exception 'app: deutlich kleiner als vorher'; end if;
  if not exists (select 1 from public.app_sync_history h where h.user_id = uid and h.saved_at::date = now()::date) then
    insert into public.app_sync_history(user_id, rev, blob) values (uid, cur.rev, cur.blob) on conflict do nothing;
    delete from public.app_sync_history h where h.user_id = uid and h.saved_at < now() - interval '10 days';
  end if;
  update public.app_sync set rev = cur.rev + 1, blob = p_blob, updated_at = now() where user_id = uid;
  return jsonb_build_object('ok', true, 'rev', cur.rev + 1);
end $$;

-- Cloud-Kopie löschen (Knopf in der App). Konto selbst bleibt (Konto löschen: eigene Funktion, folgt).
create or replace function public.app_sync_delete()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.app_sync_history where user_id = auth.uid();
  delete from public.app_sync where user_id = auth.uid();
  return found;
end $$;

revoke execute on function public.app_sync_pull(), public.app_sync_push(integer, text), public.app_sync_delete() from public, anon;
grant execute on function public.app_sync_pull(), public.app_sync_push(integer, text), public.app_sync_delete() to authenticated;
