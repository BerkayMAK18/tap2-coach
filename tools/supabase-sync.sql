-- TAP2 Prüfungscoach – Geräte-Sync
-- Einrichten: Supabase → SQL Editor → New query → alles einfügen → Run.
-- Kann gefahrlos mehrfach ausgeführt werden.
--
-- Was hier gespeichert wird:
--   * tap2_sync       – pro Sync-Schlüssel EIN verschlüsselter Lernstand (blob).
--                       Die App verschlüsselt im Browser (AES-GCM). Der Server sieht nur Zeichensalat,
--                       keinen Namen, keine E-Mail, nicht einmal den Schlüssel (nur eine Prüfsumme davon).
--   * tap2_sync_hist  – eine Sicherung pro Tag, die letzten 10 Tage (zum Zurückholen, falls etwas schiefgeht).
--   * tap2_pair       – Kurzcodes zum Verbinden eines Geräts, 10 Minuten gültig.
-- Die Tabellen sind für die App nicht direkt lesbar/schreibbar (RLS ohne Regeln).
-- Zugriff nur über die Funktionen unten, die Größe, Format und Menge begrenzen.

create table if not exists public.tap2_sync (
  id         text primary key check (id ~ '^[0-9a-f]{64}$'),
  rev        integer not null default 1,
  blob       text not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.tap2_sync_hist (
  id       text not null,
  rev      integer not null,
  blob     text not null,
  saved_at timestamptz not null default now(),
  primary key (id, rev)
);
create table if not exists public.tap2_pair (
  code_hash  text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  payload    text not null check (length(payload) < 400),
  uses       integer not null default 0,
  expires_at timestamptz not null
);

-- Fehlversuche beim Einlösen von Kurzcodes (Bremse gegen Durchprobieren). Nur Zeitpunkte, keine Daten.
create table if not exists public.tap2_pair_fail (at timestamptz not null default now());
create index if not exists tap2_pair_fail_at on public.tap2_pair_fail (at);

alter table public.tap2_sync      enable row level security;
alter table public.tap2_pair_fail enable row level security;
alter table public.tap2_sync_hist enable row level security;
alter table public.tap2_pair      enable row level security;
revoke all on public.tap2_sync, public.tap2_sync_hist, public.tap2_pair, public.tap2_pair_fail from anon, authenticated;

-- Lernstand holen
create or replace function public.tap2_pull(p_id text)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object('rev', s.rev, 'blob', s.blob) from public.tap2_sync s where s.id = p_id;
$$;

-- Lernstand speichern. p_base = Version, auf der das Gerät aufbaut.
-- Passt sie nicht (anderes Gerät war schneller), kommt der aktuelle Stand zurück; die App führt zusammen und versucht es erneut.
create or replace function public.tap2_push(p_id text, p_base integer, p_blob text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cur public.tap2_sync%rowtype;
begin
  if p_id !~ '^[0-9a-f]{64}$' then raise exception 'tap2: ungueltige id'; end if;
  if length(p_blob) > 150000 or p_blob !~ '^1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' then raise exception 'tap2: ungueltige daten'; end if;
  select * into cur from public.tap2_sync where id = p_id for update;
  if not found then
    if p_base <> 0 then return jsonb_build_object('ok', false, 'rev', 0, 'gone', true); end if;
    -- Schutz gegen Missbrauch des öffentlichen Schlüssels: Gesamtgröße begrenzen (Free Tier: 500 MB)
    if (select coalesce(sum(length(blob)), 0) from public.tap2_sync) + (select coalesce(sum(length(blob)), 0) from public.tap2_sync_hist) > 300000000 then
      raise exception 'tap2: speicher voll';
    end if;
    -- Bremse: höchstens 60 neue Sync-Stände pro Stunde (für alle zusammen). Ein Angreifer kann den Speicher
    -- so nicht in kurzer Zeit füllen; echte Nutzer merken davon nichts.
    if (select count(*) from public.tap2_sync where rev = 1 and updated_at > now() - interval '1 hour') >= 60 then
      raise exception 'tap2: gerade zu viele neue verbindungen, bitte spaeter erneut';
    end if;
    insert into public.tap2_sync(id, rev, blob) values (p_id, 1, p_blob);
    return jsonb_build_object('ok', true, 'rev', 1);
  end if;
  if cur.rev <> p_base then return jsonb_build_object('ok', false, 'rev', cur.rev, 'blob', cur.blob); end if;
  -- Zusammenführen lässt einen Lernstand nie schrumpfen. Ein viel kleinerer Upload ist ein Fehler -> ablehnen.
  if length(cur.blob) > 4000 and length(p_blob) < length(cur.blob) / 2 then raise exception 'tap2: deutlich kleiner als vorher'; end if;
  -- Tagessicherung: der erste Stand jedes Tages bleibt 10 Tage erhalten
  if not exists (select 1 from public.tap2_sync_hist h where h.id = p_id and h.saved_at::date = now()::date) then
    insert into public.tap2_sync_hist(id, rev, blob, saved_at) values (cur.id, cur.rev, cur.blob, now()) on conflict do nothing;
    delete from public.tap2_sync_hist h where h.id = p_id and h.saved_at < now() - interval '10 days';
  end if;
  update public.tap2_sync set rev = cur.rev + 1, blob = p_blob, updated_at = now() where id = p_id;
  return jsonb_build_object('ok', true, 'rev', cur.rev + 1);
end $$;

-- Kopie in der Cloud löschen (Knopf in der App). Die Geräte behalten ihren Stand.
create or replace function public.tap2_delete(p_id text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.tap2_sync_hist where id = p_id;
  delete from public.tap2_sync where id = p_id;
  return found;
end $$;

-- Kurzcode ablegen (Inhalt ist mit dem Code verschlüsselt)
create or replace function public.tap2_pair_put(p_hash text, p_payload text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.tap2_pair where expires_at < now();
  if (select count(*) from public.tap2_pair) >= 500 then raise exception 'tap2: zu viele codes'; end if;
  insert into public.tap2_pair(code_hash, payload, expires_at) values (p_hash, p_payload, now() + interval '10 minutes')
    on conflict (code_hash) do nothing;
  return found;
end $$;

-- Kurzcode einlösen (höchstens 5-mal, z. B. Safari + installierte App)
create or replace function public.tap2_pair_get(p_hash text)
returns text language plpgsql security definer set search_path = public as $$
declare v text;
begin
  -- Bremse gegen Durchprobieren: Nach 300 Fehlversuchen in 10 Minuten (alle zusammen) wird gar nicht mehr gesucht.
  -- Bei 32^6 ≈ 1 Mrd. möglichen Codes ist ein Treffer dann praktisch ausgeschlossen.
  if (select count(*) from public.tap2_pair_fail where at > now() - interval '10 minutes') >= 300 then
    raise exception 'tap2: zu viele versuche, bitte in ein paar minuten erneut';
  end if;
  update public.tap2_pair set uses = uses + 1
    where code_hash = p_hash and expires_at > now() and uses < 5
    returning payload into v;
  if v is null then
    insert into public.tap2_pair_fail default values;
    delete from public.tap2_pair_fail where at < now() - interval '1 hour';
  end if;
  return v;
end $$;

revoke execute on function public.tap2_pull(text), public.tap2_push(text, integer, text), public.tap2_delete(text),
  public.tap2_pair_put(text, text), public.tap2_pair_get(text) from public;
grant execute on function public.tap2_pull(text), public.tap2_push(text, integer, text), public.tap2_delete(text),
  public.tap2_pair_put(text, text), public.tap2_pair_get(text) to anon, authenticated;
