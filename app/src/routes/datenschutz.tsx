/**
 * Datenschutzhinweis nach Art. 13 DSGVO.
 *
 * Abschnitte für optionale Funktionen erscheinen nur, wenn der Schalter in src/config.ts (FEATURES) aktiv ist –
 * der Hinweis beschreibt damit immer genau die tatsächliche Verarbeitung. Hintergrund, Verarbeitungsübersicht
 * und technische Maßnahmen: docs/DATENSCHUTZ.md. Kein Ersatz für eine Rechtsberatung.
 */
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Card } from "@/ui";
import { CONTROLLER, FEATURES, PRIVACY_VERSION } from "@/config";

export const Route = createFileRoute("/datenschutz")({ component: Datenschutz });

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-heading-100">{title}</h2>
      <div className="space-y-2 leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{children}</div>
    </section>
  );
}

function Datenschutz() {
  const f = FEATURES;
  return (
    <Card size="lg" className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-heading-300">Datenschutzhinweis</h1>
        <p className="text-body-200 text-slate">Stand: {PRIVACY_VERSION.split("-").reverse().join(".")}</p>
      </header>

      <Section title="Kurz gesagt">
        <ul>
          <li>Du kannst ohne Konto lernen. Dein Lernstand bleibt dann ausschließlich in deinem Browser.</li>
          <li>Kein Tracking, keine Werbung, keine Analyse-Werkzeuge, keine Cookies zu Werbezwecken.</li>
          <li>Schriften und Programmbibliotheken liegen auf unserem eigenen Server. Es gibt keine Verbindung zu Google oder anderen Drittanbietern.</li>
          {f.sync && <li>Wenn du deinen Lernstand in deinem Konto sicherst, wird er vorher in deinem Browser verschlüsselt. Nur du hast den Schlüssel – auch der Betreiber kann ihn nicht lesen.</li>}
          {f.leaderboard && <li>In der Rangliste erscheinst du nur, wenn du das möchtest, und nur mit einem selbst gewählten Benutzernamen.</li>}
        </ul>
      </Section>

      <Section title="Verantwortlich">
        <p>{CONTROLLER.name}<br />Kontakt: {CONTROLLER.contact}</p>
        <p>Die App ist ein privates, nicht-kommerzielles Lernprojekt. Eine Datenschutzbeauftragte bzw. ein Datenschutzbeauftragter ist nicht bestellt, weil keine Pflicht dazu besteht.</p>
      </Section>

      <Section title="Aufruf der App (Hosting)">
        <p>Die App wird über Cloudflare Pages (Cloudflare, Inc.) ausgeliefert. Beim Aufruf verarbeitet Cloudflare technisch notwendige Daten: IP-Adresse, Zeitpunkt, aufgerufene Datei, Browser-Kennung. Das dient der Auslieferung und dem Schutz vor Angriffen.</p>
        <ul>
          <li>Rechtsgrundlage: berechtigtes Interesse an einem sicheren, funktionierenden Angebot (Art. 6 Abs. 1 lit. f DSGVO).</li>
          <li>Cloudflare handelt als Auftragsverarbeiter. Eine Übermittlung in die USA ist möglich; Cloudflare ist nach dem EU-US Data Privacy Framework zertifiziert (Art. 45 DSGVO).</li>
          <li>Wir selbst werten diese Daten nicht aus und führen keine eigenen Zugriffsprotokolle.</li>
        </ul>
      </Section>

      <Section title="Lernstand in deinem Browser">
        <p>Antworten, Markierungen, eigene Karten, Prüfungsergebnisse und Belohnungen speichert die App im lokalen Speicher deines Browsers (localStorage). Diese Daten verlassen dein Gerät nur, wenn du selbst eine der unten beschriebenen Funktionen nutzt oder eine Sicherungsdatei herunterlädst.</p>
        <ul>
          <li>Das Speichern ist für die Funktion der App unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG); eine Einwilligung ist dafür nicht nötig.</li>
          <li>Löschen: Einstellungen → Lernstand zurücksetzen, oder die Website-Daten in deinem Browser löschen.</li>
          <li>Sicherungsdateien („Sicherung herunterladen“) entstehen nur auf deinem Gerät. Die App überträgt sie nirgendwohin.</li>
        </ul>
      </Section>

      {f.account && (
        <Section title="Anmeldung mit GitHub (freiwillig)">
          <p>Für Sicherung, Geräte-Sync und Rangliste kannst du dich mit deinem GitHub-Konto anmelden. Dabei übermittelt GitHub an uns: deine GitHub-Nutzer-ID, deinen GitHub-Benutzernamen, deine E-Mail-Adresse und den Link zu deinem Profilbild. Wir verwenden davon nur die Nutzer-ID zur Zuordnung deines Kontos.</p>
          <ul>
            <li>Gespeichert werden die Kontodaten bei Supabase (Supabase Inc., Rechenzentrum in Frankfurt am Main, EU) als Auftragsverarbeiter.</li>
            <li>Rechtsgrundlage: Bereitstellung der von dir gewünschten Funktion (Art. 6 Abs. 1 lit. b DSGVO).</li>
            <li>Für die Anmeldung selbst ist GitHub, Inc. (USA) eigenständig verantwortlich; es gilt die Datenschutzerklärung von GitHub.</li>
            <li>Dein Anmelde-Token liegt im lokalen Speicher deines Browsers (technisch notwendig).</li>
            <li>Die verschlüsselte Sicherung löschst du jederzeit selbst in den Einstellungen („Cloud-Kopie löschen“). Die Löschung des Kontos selbst kannst du über die oben genannte Kontaktmöglichkeit verlangen; ein Knopf dafür folgt.</li>
          </ul>
        </Section>
      )}

      {f.sync && (
        <Section title="Verschlüsselte Sicherung und Geräte-Sync (freiwillig)">
          <p>Dein Lernstand wird in deinem Browser mit einem nur dir bekannten Schlüssel verschlüsselt (AES-GCM, 256 Bit) und erst dann in deinem Konto gespeichert. Gespeichert werden: der verschlüsselte Inhalt, eine Versionsnummer und der Zeitpunkt der letzten Änderung. Der Betreiber kann den Inhalt nicht lesen.</p>
          <ul>
            <li>Den Schlüssel überträgst du per Kurzcode oder QR-Code auf deine weiteren Geräte. Bewahre ihn auf – ohne ihn ist die Sicherung in der Cloud nicht lesbar. Der Stand auf deinen Geräten bleibt davon unberührt.</li>
            <li>Zur Wiederherstellung bei Fehlern bleibt je Tag ein älterer verschlüsselter Stand 10 Tage erhalten.</li>
            <li>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Löschen: jederzeit in den Einstellungen.</li>
          </ul>
        </Section>
      )}

      {f.leaderboard && (
        <Section title="Rangliste (freiwillig, mit Einwilligung)">
          <p>Wenn du an der Rangliste teilnimmst, sehen alle Nutzerinnen und Nutzer deinen selbst gewählten Benutzernamen, dein Level, deine XP und deine Figur. Dein GitHub-Name und deine E-Mail-Adresse erscheinen dort nie.</p>
          <ul>
            <li>Rechtsgrundlage: deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Du kannst sie jederzeit widerrufen („Austragen“); der Eintrag wird sofort gelöscht.</li>
            <li>Wähle bitte nicht deinen echten Namen.</li>
          </ul>
        </Section>
      )}

      {f.patchNotes && (
        <Section title="Patch Notes">
          <p>Beim Öffnen der Seite „Patch Notes“ lädt dein Browser die öffentliche Release-Liste direkt von GitHub (GitHub, Inc., USA). Dabei erhält GitHub deine IP-Adresse. Rechtsgrundlage: berechtigtes Interesse an aktuellen Versionshinweisen (Art. 6 Abs. 1 lit. f DSGVO). GitHub ist nach dem EU-US Data Privacy Framework zertifiziert.</p>
        </Section>
      )}

      {f.tutor && (
        <Section title="KI-Tutor">
          <p>Der KI-Tutor ist derzeit nur für den Betreiber freigeschaltet und für andere Konten nicht verfügbar. Eingaben im Tutor werden zur Beantwortung an Anthropic, PBC (USA) übermittelt.</p>
        </Section>
      )}

      <Section title="Speicherdauer">
        <ul>
          <li>Lernstand im Browser: bis du ihn löschst.</li>
          {f.account && <li>Konto, verschlüsselte Sicherung, Ranglisten-Eintrag: bis du sie löschst; Tagessicherungen höchstens 10 Tage.</li>}
          <li>Technische Zugriffsdaten beim Hosting: nach den Fristen des Anbieters, nur für Betrieb und Sicherheit.</li>
        </ul>
      </Section>

      <Section title="Deine Rechte">
        <p>Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20; „Sicherung herunterladen“ liefert deine Daten als JSON) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Eine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3).</p>
        <p>Wende dich dafür an die oben genannte Kontaktadresse. Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der Behörde deines Wohnorts (Art. 77 DSGVO).</p>
        <p>Es findet keine automatisierte Entscheidungsfindung oder Profilbildung statt.</p>
      </Section>
    </Card>
  );
}
