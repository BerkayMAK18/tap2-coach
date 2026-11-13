/**
 * Anmeldeseite. Nur GitHub (Supabase Auth, OAuth mit PKCE).
 *
 * Sicherheit:
 * - E-Mail/Passwort ist bewusst entfernt (weniger Angriffsfläche: kein Passwort-Raten, kein Mail-Spam
 *   über Registrierungen). Zusätzlich im Supabase-Dashboard den Provider „Email“ deaktivieren, sonst
 *   wäre die Registrierung über die API weiterhin möglich (docs/ENTWICKLUNG.md → Sicherheit).
 * - `redirect` darf nur ein interner Pfad sein (siehe src/lib/safe-redirect.ts), sonst Open-Redirect-Gefahr.
 */
import { Github } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Card, InlineError, Logo } from "@/ui";
import { supabase } from "@/integrations/supabase/client";
import { safeRedirect } from "@/lib/safe-redirect";

type Search = { redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({ redirect: safeRedirect(s.redirect) }),
  head: () => ({
    meta: [
      { title: "Anmelden — TAP2 Coach" },
      { name: "description", content: "Melde dich für deinen persönlichen FIAE-Lernplan an." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const target = redirect ?? "/dashboard";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: target, replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: target, replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, target]);

  // Einrichtung der GitHub-App: docs/ENTWICKLUNG.md → „GitHub-Anmeldung“.
  async function signInWithGithub() {
    setError(null);
    setBusy(true);
    const back = window.location.origin + "/auth" + (redirect ? `?redirect=${encodeURIComponent(redirect)}` : "");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: back } });
    if (error) {
      setError("Anmeldung fehlgeschlagen. Versuche es erneut.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6 py-16">
      <Card surface="white" size="lg" className="w-full max-w-md space-y-6">
        <Logo size={28} className="text-ink" />
        <h1 className="font-head text-heading-100">Anmelden</h1>
        <p className="font-text text-body-300 text-slate">
          Mit deinem GitHub-Konto. Wir lesen nur deinen Namen, dein Profilbild und deine E-Mail-Adresse.
        </p>
        <Button variant="ink" className="w-full" type="button" onClick={signInWithGithub} loading={busy}>
          <Github className="h-4 w-4" aria-hidden="true" /> Mit GitHub anmelden
        </Button>
        {error && <InlineError>{error}</InlineError>}
      </Card>
    </div>
  );
}
