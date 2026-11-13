import { Github } from "lucide-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, Input, InlineError, Label, Logo } from "@/ui";
import { supabase } from "@/integrations/supabase/client";

type Search = { redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    redirect: typeof s.redirect === "string" && s.redirect.startsWith("/") && !s.redirect.startsWith("//") ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Anmelden — TAP2 Coach" },
      { name: "description", content: "Melde dich für deinen persönlichen FIAE-Lernplan an." },
      { property: "og:title", content: "Anmelden — TAP2 Coach" },
      { property: "og:description", content: "Melde dich für deinen persönlichen FIAE-Lernplan an." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});


function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const target = redirect ?? "/dashboard";
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: target, replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: target, replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, target]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + target } });
        if (error) throw error;
        setInfo("Bitte bestätige deine E-Mail-Adresse über den Link im Postfach. Danach bist du drin.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setInfo("Wir haben dir einen Link zum Zurücksetzen des Passworts geschickt.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Etwas ist schiefgelaufen. Versuche es erneut.");
    } finally {
      setBusy(false);
    }
  }

  // Anmeldung über GitHub (Supabase Auth). Einrichtung: docs/ENTWICKLUNG.md → „GitHub-Anmeldung“.
  async function oauth() {
    setError(null);
    if (redirect) sessionStorage.setItem("post_auth_redirect", redirect);
    const { error } = await supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: window.location.origin + "/auth" } });
    if (error) setError(error.message || "Anmeldung fehlgeschlagen. Versuche es erneut.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6 py-16">
      <Card surface="white" size="lg" className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Logo size={28} className="text-ink" />
        </div>
        <h1 className="font-head text-heading-100">
          {mode === "signin" ? "Willkommen zurück" : mode === "signup" ? "Konto erstellen" : "Passwort zurücksetzen"}
        </h1>

        {mode !== "forgot" && (
          <div className="space-y-3">
            <Button variant="ink" className="w-full" type="button" onClick={() => oauth()}>
              <Github className="h-4 w-4" aria-hidden="true" /> Mit GitHub anmelden
            </Button>
            <p className="text-center font-text text-body-200 text-slate">oder mit E-Mail</p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}
          {error && <InlineError>{error}</InlineError>}
          {info && <p className="font-text text-body-300" role="status">{info}</p>}
          <Button variant="solid" type="submit" className="w-full" loading={busy}>
            {mode === "signin" ? "Anmelden" : mode === "signup" ? "Konto erstellen" : "Link senden"}
          </Button>
        </form>

        <div className="flex flex-wrap justify-between gap-2">
          {mode === "signin" ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setMode("signup")}>Konto erstellen</Button>
              <Button variant="ghost" size="sm" onClick={() => setMode("forgot")}>Passwort vergessen?</Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setMode("signin")}>Zurück zur Anmeldung</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
