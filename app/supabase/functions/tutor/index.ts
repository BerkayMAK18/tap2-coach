/**
 * Supabase Edge Function „tutor“ – KI-Tutor (Premium, vorerst nur Admin).
 *
 * Sicherheit:
 * - Nur mit gültigem Login (JWT) UND app_metadata.role = "admin". app_metadata können Nutzer nicht selbst ändern.
 * - Der Claude-API-Schlüssel kommt aus dem Secret ANTHROPIC_API_KEY (Supabase → Edge Functions → Secrets),
 *   nie aus dem Code oder vom Browser.
 * - Tageslimit pro Konto über app_tutor_take() (supabase/002_app_tutor.sql), zusätzlich Größenlimits je Anfrage.
 *   Kostenobergrenze: Prepaid-Guthaben ohne automatische Aufladung + Ausgabenlimit in der Anthropic Console.
 * - CORS nur für die Dev-App und localhost.
 *
 * Werkzeuge: Der Tutor arbeitet mit Werkzeugen der App (Stand festhalten, Lehrplan setzen, Frage stellen, Antwort
 * bewerten, Schritt abschließen). Die Funktion lässt nur diese Namen zu und reicht die Antwort-Blöcke unverändert
 * zurück; ausgeführt werden die Werkzeuge im Browser (lib/tutor-protocol.ts). Denk-Blöcke (thinking) schickt die App
 * unverändert zurück, wie die API es verlangt.
 *
 * Kosten: Haiku 5.5 als Standard (sehr günstig), Sonnet 5.5 auf Wunsch. Der System-Teil (Anweisungen + Wissen)
 * wird per Prompt-Caching zwischengespeichert. Verbrauch kommt in der Antwort zurück (usage) und wird gezählt.
 *
 * Deploy: Supabase-Dashboard → Edge Functions → „Deploy a new function“ → Name „tutor“ → diesen Inhalt einfügen.
 */
import Anthropic from "npm:@anthropic-ai/sdk@1.3.0";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const ORIGINS = ["https://tap2-coach-dev.akdemir-berkay.workers.dev", "http://localhost:8080"];
const MODELS: Record<string, string> = { haiku: "claude-haiku-5-5", sonnet: "claude-sonnet-5-5" };
const LIMITS = { system: 120_000, messages: 120, message: 8_000, total: 400_000, tools: 20_000 };
const TOOL_NAMES = ["stand_festhalten", "lehrplan_setzen", "frage_stellen", "antwort_bewerten", "schritt_abschliessen"];

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
});
const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json" } });

type Block = Record<string, unknown> & { type: string };
type Msg = { role: "user" | "assistant"; content: string | Block[] };
type Tool = { name: string; description: string; input_schema: Record<string, unknown> };

const str = (v: unknown, max = LIMITS.message) => typeof v === "string" && v.length <= max;
/** Erlaubte Blöcke je Rolle: Nutzer schreibt Text und Werkzeug-Ergebnisse, der Tutor Text, Werkzeugaufrufe und Denk-Blöcke */
function okBlock(role: Msg["role"], b: Block): boolean {
  if (!b || typeof b !== "object") return false;
  if (b.type === "text") return str(b.text) && (b.text as string).length > 0;
  if (role === "user") return b.type === "tool_result" && str(b.tool_use_id, 100) && (b.content === undefined || str(b.content)) && (b.is_error === undefined || typeof b.is_error === "boolean");
  if (b.type === "tool_use") return str(b.id, 100) && TOOL_NAMES.includes(b.name as string) && typeof b.input === "object";
  return b.type === "thinking" || b.type === "redacted_thinking"; // unverändert aus der vorigen Antwort
}
const okMsg = (m: Msg) => (m.role === "user" || m.role === "assistant")
  && (typeof m.content === "string" ? m.content.length > 0 && m.content.length <= LIMITS.message
    : Array.isArray(m.content) && m.content.length > 0 && m.content.length <= 20 && m.content.every((b) => okBlock(m.role, b)));
const okTools = (t: unknown): t is Tool[] => Array.isArray(t) && t.length <= TOOL_NAMES.length
  && t.every((x) => x && TOOL_NAMES.includes(x.name) && typeof x.description === "string" && x.input_schema?.type === "object")
  && JSON.stringify(t).length <= LIMITS.tools;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Nur POST." }, 405, origin);

  // 1) Anmeldung und Admin-Rolle prüfen
  const auth = req.headers.get("authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return json({ error: "Nicht angemeldet." }, 401, origin);
  if (u.user.app_metadata?.role !== "admin") return json({ error: "Der Tutor ist für dein Konto nicht freigeschaltet." }, 403, origin);

  // 2) Eingaben prüfen
  let body: { model?: string; system?: string; messages?: Msg[]; tools?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Ungültige Anfrage." }, 400, origin); }
  const model = MODELS[body.model ?? "haiku"];
  const system = typeof body.system === "string" ? body.system : "";
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const tools = body.tools === undefined ? [] : body.tools;
  if (!model || !system || system.length > LIMITS.system || !messages.length || messages.length > LIMITS.messages
    || !messages.every(okMsg) || messages[messages.length - 1].role !== "user"
    || JSON.stringify(messages).length > LIMITS.total || !okTools(tools)) {
    return json({ error: "Ungültige Anfrage." }, 400, origin);
  }

  // 3) Tageslimit (zählt pro Anfrage, eigener Nutzer)
  const { data: allowed, error: limErr } = await sb.rpc("app_tutor_take");
  if (limErr) return json({ error: "Limit-Prüfung fehlgeschlagen." }, 500, origin);
  if (!allowed) return json({ error: "Tageslimit erreicht. Morgen geht es weiter." }, 429, origin);

  // 4) Claude aufrufen
  const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
  try {
    const params = {
      model,
      max_tokens: 6000,
      output_config: { effort: "low" }, // Tutor-Chat: niedrige Effort-Stufe reicht und spart Kosten
      // Werkzeuge stehen vor dem System-Teil: der Cache-Punkt am System-Teil speichert beide (feste Reihenfolge)
      ...(tools.length ? { tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema })) } : {}),
      system: [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }],
      messages,
    };
    // Sonnet 5.5: serverseitige Ausweichlösung bei Ablehnungen (Standard-Empfehlung); Haiku 5.5 hat keine.
    const res = model === MODELS.sonnet
      ? await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } as never)
      : await client.messages.create(params as never);
    const r = res as unknown as Anthropic.Message;
    if (r.stop_reason === "refusal") return json({ text: "Dazu kann ich hier nicht antworten. Formuliere die Frage bitte anders.", usage: r.usage, stop: "refusal" }, 200, origin);
    const text = r.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.TextBlock).text).join("\n");
    // content: alle Blöcke (Text, Werkzeugaufrufe, Denk-Blöcke) – die App hängt sie unverändert an den Verlauf
    return json({ text, content: r.content, usage: r.usage, stop: r.stop_reason, model }, 200, origin);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Gerade zu viele Anfragen. Kurz warten." }, 429, origin);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "API-Schlüssel ungültig (Secret ANTHROPIC_API_KEY prüfen)." }, 500, origin);
    if (e instanceof Anthropic.BadRequestError) return json({ error: "Anfrage abgelehnt – evtl. Guthaben aufgebraucht." }, 400, origin);
    if (e instanceof Anthropic.APIError) return json({ error: `KI-Dienst nicht erreichbar (${e.status}).` }, 502, origin);
    return json({ error: "Unbekannter Fehler." }, 500, origin);
  }
});
