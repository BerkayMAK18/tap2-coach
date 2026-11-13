/**
 * Rangliste – dieselbe wie in der Live-App (tap2_lb_top). Dein Eintrag wird über dieselbe ID gefunden
 * (Prüfsumme deines Sync-Schlüssels, lbIdFor). Stufe 1: nur anzeigen. XP sammeln und übertragen kommt mit dem
 * Belohnungs-Modul (gleiche Regeln und Tageslimits wie für alle).
 * Ausgabe ausschließlich als Text (React escaped); Zahlen werden erzwungen.
 */
import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Card, CardEyebrow, InlineError } from "@/ui";
import { supabase } from "@/lib/supabase";
import { lbIdFor, useLiveSync } from "@/store/livesync";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rangliste")({ component: Rangliste });

type Row = { r: number; name: string; xp: number; level: number; me?: boolean };
type Top = { top: Row[]; me: Row | null; total: number };
const num = (v: unknown) => (Number.isFinite(+(v as number)) ? +(v as number) : 0);

function Rangliste() {
  const cfg = useLiveSync((s) => s.cfg);
  const [d, setD] = useState<Top | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const id = cfg ? await lbIdFor(cfg.key) : "0".repeat(64);
      const { data, error } = await supabase!.rpc("tap2_lb_top", { p_limit: 100, p_id: id });
      if (error) setErr("Die Rangliste ist gerade nicht erreichbar."); else setD(data as Top);
    })();
  }, [cfg]);
  if (!supabase) return <Card><p>Die Rangliste ist in dieser Version nicht verfügbar.</p></Card>;
  const row = (e: Row) => (
    <li key={`${e.r}-${e.name}`} className={cn("flex items-center gap-3 rounded-lg px-3 py-2", e.me && "bg-brand/20 font-medium")}>
      <span className="w-8 text-right tabular-nums">{num(e.r)}</span>
      <span className="flex-1">{String(e.name)}{e.me ? " (du)" : ""}</span>
      <span className="text-body-200 text-slate">Level {num(e.level)}</span>
      <span className="w-24 text-right tabular-nums">{num(e.xp).toLocaleString("de-DE")} XP</span>
    </li>
  );
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-heading-300">Rangliste</h1>
      {!cfg && <p className="text-body-300 text-slate">Verbinde die App in den <Link to="/einstellungen" className="underline">Einstellungen</Link> mit der Live-App, dann siehst du hier deinen Platz.</p>}
      {err && <InlineError>{err}</InlineError>}
      {d && (
        <Card className="space-y-2">
          <CardEyebrow>{num(d.total)} dabei · sortiert nach XP</CardEyebrow>
          <ol className="space-y-1">{d.top.map(row)}</ol>
          {d.me && d.me.r > d.top.length && <><p className="text-center text-slate">…</p><ol>{row({ ...d.me, me: true })}</ol></>}
        </Card>
      )}
    </div>
  );
}
