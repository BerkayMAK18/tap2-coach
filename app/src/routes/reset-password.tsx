import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button, Card, Input, InlineError, Label } from "@/ui";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Passwort ändern — TAP2 Coach" },
      { name: "description", content: "Wähle ein neues Passwort für deinen TAP2-Coach-Zugang." },
      { property: "og:title", content: "Passwort ändern — TAP2 Coach" },
      { property: "og:description", content: "Wähle ein neues Passwort für deinen TAP2-Coach-Zugang." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6 py-16">
      <Card surface="white" size="lg" className="w-full max-w-md space-y-6">
        <h1 className="font-head text-heading-100">Set a new password</h1>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <InlineError>{error}</InlineError>}
          <Button variant="solid" type="submit" loading={busy}>Save password</Button>
        </form>
      </Card>
    </div>
  );
}
