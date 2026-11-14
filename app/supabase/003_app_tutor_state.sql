-- KI-Tutor (Premium): Tutor-Stand (Belege, Fehlvorstellungen, Sitzungen, Tutor-XP je Tag) auf allen Geräten.
-- Live-Projekt, nur app_*-Objekte, berührt keine tap2_*-Tabellen. Idempotent: darf mehrfach laufen.
--
-- Ende-zu-Ende-verschlüsselt: Der Server speichert nur „1.<iv>.<ciphertext>“ (AES-GCM, Schlüssel = Sync-Schlüssel des
-- Geräts, crypto.ts). kid ist eine Prüfsumme des Schlüssels (nicht der Schlüssel), damit ein Gerät mit anderem Schlüssel
-- einen fremden Stand erkennt statt ihn zu überschreiben. Der Betreiber kann den Inhalt nicht lesen.
-- Zugriff nur über die Funktionen unten, immer nur auf die eigene Zeile (auth.uid()).

create table if not exists public.app_tutor_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  rev        integer not null default 1,
  kid        text not null check (kid ~ '^[0-9a-f]{16}$'),
  blob       text not null check (length(blob) <= 400000 and blob ~ '^1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'),
  updated_at timestamptz not null default now()
);

alter table public.app_tutor_state enable row level security;
revoke all on public.app_tutor_state from anon, authenticated;
-- Zusätzlich zur fehlenden Berechtigung: Zeilen-Richtlinie nur für die eigene Zeile (falls je Rechte vergeben werden)
drop policy if exists app_tutor_state_own on public.app_tutor_state;
create policy app_tutor_state_own on public.app_tutor_state for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Lesen: nur der eigene Stand
create or replace function public.app_tutor_state_pull()
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object('rev', s.rev, 'kid', s.kid, 'blob', s.blob) from public.app_tutor_state s where s.user_id = auth.uid();
$$;

-- Schreiben mit Versionsprüfung: passt p_base nicht, kommt der aktuelle Stand zurück (App führt zusammen, versucht erneut).
-- Anderer Schlüssel (kid) → nichts überschreiben, außer p_force (ausdrücklich „Cloud-Stand ersetzen“ in der App).
create or replace function public.app_tutor_state_push(p_base integer, p_kid text, p_blob text, p_force boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); cur public.app_tutor_state%rowtype;
begin
  if uid is null then raise exception 'app: nicht angemeldet'; end if;
  if p_kid !~ '^[0-9a-f]{16}$' or length(p_blob) > 400000 or p_blob !~ '^1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$' then raise exception 'app: ungueltige daten'; end if;
  select * into cur from public.app_tutor_state where user_id = uid for update;
  if not found then
    if p_base <> 0 then return jsonb_build_object('ok', false, 'rev', 0, 'gone', true); end if;
    insert into public.app_tutor_state(user_id, rev, kid, blob) values (uid, 1, p_kid, p_blob);
    return jsonb_build_object('ok', true, 'rev', 1);
  end if;
  if cur.kid <> p_kid and not coalesce(p_force, false) then return jsonb_build_object('ok', false, 'rev', cur.rev, 'kid', cur.kid); end if;
  if cur.rev <> p_base and cur.kid = p_kid then return jsonb_build_object('ok', false, 'rev', cur.rev, 'kid', cur.kid, 'blob', cur.blob); end if;
  update public.app_tutor_state set rev = cur.rev + 1, kid = p_kid, blob = p_blob, updated_at = now() where user_id = uid;
  return jsonb_build_object('ok', true, 'rev', cur.rev + 1);
end $$;

-- Tutor-Stand in der Cloud löschen (Knopf in der App; lokal bleibt er)
create or replace function public.app_tutor_state_delete()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  delete from public.app_tutor_state where user_id = auth.uid();
  return found;
end $$;

revoke execute on function public.app_tutor_state_pull(), public.app_tutor_state_push(integer, text, text, boolean), public.app_tutor_state_delete() from public, anon;
grant execute on function public.app_tutor_state_pull(), public.app_tutor_state_push(integer, text, text, boolean), public.app_tutor_state_delete() to authenticated;
