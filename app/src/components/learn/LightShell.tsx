import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Icon, Logo, Sheet, SheetContent, SheetTitle, SheetTrigger, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Tutor", icon: "speech-bubble-lines" },
  { to: "/graph", label: "Wissensgraph", icon: "chain-linked" },
  { to: "/verlauf", label: "Gespräche", icon: "clock" },
  { to: "/lernplan", label: "Lernquellen", icon: "book-open" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('tap-theme');
  }, []);

  function navigation(compact = false) {
    return <nav aria-label="Hauptnavigation" className="flex flex-col gap-3">{NAV.map((n) => {
      const active = location.pathname.startsWith(n.to) || (n.to === '/dashboard' && location.pathname.startsWith('/session/'));
      const item = <Button asChild variant={active ? 'solid' : 'ghost'} size={compact ? 'icon' : 'md'}><Link to={n.to} aria-label={n.label} aria-current={active ? 'page' : undefined} onClick={() => setMobileOpen(false)}><Icon name={n.icon} size={20} />{!compact && n.label}</Link></Button>;
      return compact ? <Tooltip key={n.to}><TooltipTrigger asChild>{item}</TooltipTrigger><TooltipContent side="right">{n.label}</TooltipContent></Tooltip> : <div key={n.to}>{item}</div>;
    })}</nav>;
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-2 focus-visible:top-2 focus-visible:z-50 focus-visible:rounded-sm focus-visible:bg-ink focus-visible:px-4 focus-visible:py-2 focus-visible:text-brand"
      >
        Zum Inhalt springen
      </a>
      <TooltipProvider><aside className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col items-center gap-6 overflow-y-auto border-r border-border bg-white py-6 md:flex" aria-label="Seitennavigation">
        <Logo size={24} />
        {navigation(true)}
        <div className="mt-auto"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label="Abmelden" onClick={signOut}><Icon name="door-open-wave" size={20} /></Button></TooltipTrigger><TooltipContent side="right">Abmelden</TooltipContent></Tooltip></div>
      </aside></TooltipProvider>
      <div className="sticky top-0 z-40 flex items-center gap-4 border-b border-border bg-white px-4 py-2 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger asChild><Button variant="ghost" size="sm">Menü öffnen</Button></SheetTrigger><SheetContent side="left"><SheetTitle>Navigation</SheetTitle>{navigation()}<div className="mt-auto"><Button variant="ghost" onClick={signOut}>Abmelden</Button></div></SheetContent></Sheet>
        <span className="font-head text-body-400">TAP2 Coach</span>
      </div>
      <main id="main" className="flex min-h-0 flex-1 flex-col scroll-mt-20 md:ml-20">
        {children}
      </main>
    </div>
  );
}
