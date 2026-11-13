/**
 * Grundgerüst: Seitenleiste (Desktop) bzw. Leiste unten (Handy), Kopfzeile mit Prüfungsreife und Countdown,
 * Hinweis auf neue Versionen (Service Worker). Noch nicht portierte Bereiche sind als „bald“ markiert –
 * Stand der Portierung: docs/ARCHITEKTUR.md → „Portierung aus der Live-App“.
 */
import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { BookOpen, CalendarDays, ClipboardList, Home, Lightbulb, PartyPopper, Settings, Timer, Trophy } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button, Logo } from "@/ui";
import { cn } from "@/lib/utils";
import { allQ } from "@/content/catalog";
import { counts } from "@/lib/srs";
import { daysBetween, today } from "@/lib/dates";
import { EXAM_DAY } from "@/config";
import { useProgress } from "@/store/progress";

export const Route = createRootRoute({ component: Shell, notFoundComponent: NotFound });

const NAV = [
  { to: "/", label: "Übersicht", icon: Home },
  { to: "/lernen", label: "Lernen", icon: BookOpen },
  { to: null, label: "Aufgaben", icon: ClipboardList },
  { to: null, label: "Prüfung", icon: Timer },
  { to: null, label: "Events", icon: PartyPopper },
  { to: "/rangliste", label: "Rangliste", icon: Trophy },
  { to: null, label: "Tipps", icon: Lightbulb },
] as const;

function Shell() {
  const S = useProgress((s) => s.S);
  const reife = counts(S, allQ(S)).pct;
  const left = daysBetween(today(), EXAM_DAY);
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="hidden md:flex md:flex-col md:gap-1 md:border-r md:bg-card md:p-4 md:sticky md:top-0 md:h-dvh">
        <Link to="/" className="mb-4 flex items-center gap-2 px-2"><Logo size={28} /></Link>
        {NAV.map((n) => <NavItem key={n.label} {...n} />)}
        <div className="mt-auto"><NavItem to="/einstellungen" label="Einstellungen" icon={Settings} /></div>
      </aside>
      <div className="flex min-w-0 flex-col pb-20 md:pb-0">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-canvas/90 px-4 py-3 backdrop-blur md:px-8">
          <Link to="/" className="md:hidden" aria-label="Übersicht"><Logo size={24} className="[&_span]:hidden" /></Link>
          <span className="ml-auto rounded-full border bg-card px-3 py-1 text-body-200" title="Prüfungsreife: grün zählt voll, gelb halb"><span className="hidden sm:inline">Prüfungsreife </span><b>{Math.round(reife * 100)} %</b></span>
          <span className="flex items-center gap-1 rounded-full border bg-card px-3 py-1 text-body-200"><CalendarDays className="h-4 w-4" aria-hidden="true" /><span className="whitespace-nowrap">{left > 0 ? `${left} ${left === 1 ? "Tag" : "Tage"}` : "Prüfung"}</span></span>
          <Link to="/einstellungen" className="md:hidden rounded-full p-2 hover:bg-muted" aria-label="Einstellungen"><Settings className="h-5 w-5" /></Link>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8"><Outlet /></main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t bg-card py-1 md:hidden" aria-label="Hauptnavigation">
        {NAV.filter((n) => n.to).map((n) => <NavItem key={n.label} {...n} compact />)}
      </nav>
      <UpdatePrompt />
    </div>
  );
}

function NavItem({ to, label, icon: Icon, compact }: { to: string | null; label: string; icon: typeof Home; compact?: boolean }) {
  const cls = cn("flex items-center gap-3 rounded-lg px-3 py-2 text-body-300", compact && "flex-col gap-0.5 px-2 py-1 text-body-100");
  if (!to) return <span className={cn(cls, "cursor-not-allowed text-slate/60")} title="Wird gerade aus der Live-App übernommen"><Icon className="h-5 w-5" aria-hidden="true" />{label}<span className="ml-auto rounded bg-muted px-1.5 text-body-100">bald</span></span>;
  return (
    <Link to={to} className={cls} activeOptions={{ exact: to === "/" }} activeProps={{ className: "bg-brand/20 font-medium text-ink" }} inactiveProps={{ className: "text-slate hover:bg-muted hover:text-ink" }}>
      <Icon className="h-5 w-5" aria-hidden="true" />{label}
    </Link>
  );
}

/** Neue Version: nie automatisch neu laden (könnte eine Lernrunde unterbrechen), sondern fragen. */
function UpdatePrompt() {
  const { needRefresh: [need, setNeed], updateServiceWorker } = useRegisterSW();
  if (!need) return null;
  return (
    <div role="status" className="fixed bottom-24 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-card px-4 py-2 shadow-overlay md:bottom-6">
      <span className="text-body-200">Neue Version verfügbar. Dein Lernstand bleibt erhalten.</span>
      <Button size="sm" variant="solid" onClick={() => updateServiceWorker(true)}>Neu laden</Button>
      <Button size="sm" variant="ghost" onClick={() => setNeed(false)}>Später</Button>
    </div>
  );
}

function NotFound() {
  return <div className="space-y-3"><h1 className="text-heading-200">Seite nicht gefunden</h1><Link to="/" className="underline">Zur Übersicht</Link></div>;
}
