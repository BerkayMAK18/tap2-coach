/**
 * Datenschutzhinweis nach Art. 13 DSGVO – Markup wie rDatenschutz() der Live-App (section.card, ul.ev-tips).
 *
 * Inhalt beschreibt die neue App (Hosting, Konto, Funktionsschalter): Abschnitte für optionale Funktionen erscheinen nur,
 * wenn der Schalter in src/config.ts (FEATURES) aktiv ist – der Hinweis beschreibt damit immer genau die tatsächliche
 * Verarbeitung. Hintergrund, Verarbeitungsübersicht und technische Maßnahmen: docs/DATENSCHUTZ.md. Kein Ersatz für eine Rechtsberatung.
 */
import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CONTROLLER, FEATURES, PRIVACY_VERSION } from "@/config";

export const Route = createFileRoute("/datenschutz")({ component: Datenschutz });

const Sec = ({ t, children }: { t: string; children: ReactNode }) => <section className="card"><h3>{t}</h3>{children}</section>;
const Ul = ({ children }: { children: ReactNode }) => <ul className="ev-tips">{children}</ul>;

function Datenschutz() {
  const f = FEATURES;
  return (
    <>
      <section className="card"><h2>Datenschutzhinweis</h2><p className="small muted">Stand: {PRIVACY_VERSION.split("-").reverse().join(".")}</p>
        <Ul>
          <li>Du kannst ohne Konto lernen. Dein Lernstand bleibt dann ausschließlich in deinem Browser.</li>
          <li>Kein Tracking, keine Werbung, keine Analyse-Werkzeuge, keine Cookies zu Werbezwecken.</li>
          <li>Schriften und Programmbibliotheken liegen auf unserem eigenen Server. Es gibt keine Verbindung zu Google oder anderen Drittanbietern.</li>
          {f.sync && <li>Mit Konto liegt dein Lernstand in deinem Konto – geschützt durch die Anmeldung, aber nicht Ende-zu-Ende-verschlüsselt. Ohne Konto kannst du deine Geräte per Code koppeln; dann wird er vorher in deinem Browser verschlüsselt und niemand außer dir kann ihn lesen.</li>}
          {f.leaderboard && <li>In der Rangliste erscheinst du nur, wenn du das möchtest, und nur mit einem selbst gewählten Benutzernamen.</li>}
        </Ul>
      </section>

      <Sec t="Verantwortlich">
        <p>{CONTROLLER.name}<br />Kontakt: {CONTROLLER.contact}</p>
        <p className="small muted">Die App ist ein privates, nicht-kommerzielles Lernprojekt. Eine Datenschutzbeauftragte bzw. ein Datenschutzbeauftragter ist nicht bestellt, weil keine Pflicht dazu besteht.</p>
      </Sec>

      <Sec t="Aufruf der App (Hosting)">
        <p>Die App wird über Cloudflare Pages (Cloudflare, Inc.) ausgeliefert. Beim Aufruf verarbeitet Cloudflare technisch notwendige Daten: IP-Adresse, Zeitpunkt, aufgerufene Datei, Browser-Kennung. Das dient der Auslieferung und dem Schutz vor Angriffen.</p>
        <Ul>
          <li>Rechtsgrundlage: berechtigtes Interesse an einem sicheren, funktionierenden Angebot (Art. 6 Abs. 1 lit. f DSGVO).</li>
          <li>Cloudflare handelt als Auftragsverarbeiter. Eine Übermittlung in die USA ist möglich; Cloudflare ist nach dem EU-US Data Privacy Framework zertifiziert (Art. 45 DSGVO).</li>
          <li>Wir selbst werten diese Daten nicht aus und führen keine eigenen Zugriffsprotokolle.</li>
        </Ul>
      </Sec>

      <Sec t="Lernstand in deinem Browser">
        <p>Antworten, Markierungen, eigene Karten, Prüfungsergebnisse und Belohnungen speichert die App im lokalen Speicher deines Browsers (localStorage). Diese Daten verlassen dein Gerät nur, wenn du selbst eine der unten beschriebenen Funktionen nutzt oder eine Sicherungsdatei herunterlädst.</p>
        <Ul>
          <li>Das Speichern ist für die Funktion der App unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG); eine Einwilligung ist dafür nicht nötig.</li>
          <li>Löschen: Einstellungen → „Fortschritt zurücksetzen“, oder die Website-Daten in deinem Browser löschen.</li>
          <li>Sicherungsdateien („Sicherung herunterladen“) entstehen nur auf deinem Gerät. Die App überträgt sie nirgendwohin.</li>
          <li>Übertragungs-Links aus der Live-App enthalten den Lernstand im Teil hinter dem #. Dieser Teil wird beim Öffnen nicht an einen Server gesendet. Teile solche Links nur mit dir selbst.</li>
        </Ul>
      </Sec>

      {f.account && (
        <Sec t="Anmeldung mit GitHub (freiwillig)">
          <p>Für den Abgleich mit deinem Konto und die Rangliste kannst du dich mit deinem GitHub-Konto anmelden. Dabei übermittelt GitHub an uns: deine GitHub-Nutzer-ID, deinen GitHub-Benutzernamen, deine E-Mail-Adresse und den Link zu deinem Profilbild. Wir verwenden davon nur die Nutzer-ID zur Zuordnung deines Kontos.</p>
          <Ul>
            <li>Gespeichert werden die Kontodaten bei Supabase (Supabase Inc., Rechenzentrum in Frankfurt am Main, EU) als Auftragsverarbeiter.</li>
            <li>Rechtsgrundlage: Bereitstellung der von dir gewünschten Funktion (Art. 6 Abs. 1 lit. b DSGVO).</li>
            <li>Für die Anmeldung selbst ist GitHub, Inc. (USA) eigenständig verantwortlich; es gilt die Datenschutzerklärung von GitHub.</li>
            <li>Dein Anmelde-Token liegt im lokalen Speicher deines Browsers (technisch notwendig).</li>
            <li>Den Stand in deinem Konto löschst du jederzeit selbst in den Einstellungen („Kopie im Konto löschen“). Die Löschung des Kontos selbst kannst du über die oben genannte Kontaktmöglichkeit verlangen; ein Knopf dafür folgt.</li>
          </Ul>
        </Sec>
      )}

      {f.sync && (
        <Sec t="Synchronisieren (freiwillig)">
          <p><b>Mit Konto:</b> Lernstand und Belohnungen (beim KI-Tutor auch dessen Stand) werden in deinem Konto bei Supabase (Rechenzentrum Frankfurt am Main) gespeichert – Inhalt, Versionsnummer und Zeitpunkt der letzten Änderung. So hast du auf jedem angemeldeten Gerät denselben Stand. Zugriff über die App hast nur du (Anmeldung und Zugriffsregeln in der Datenbank). Der Stand ist nicht Ende-zu-Ende-verschlüsselt: Der Betreiber kann technisch auf ihn zugreifen und tut das nur, wenn es für Betrieb oder Fehlerbehebung nötig ist.</p>
          <p><b>Ohne Konto (Geräte-Sync):</b> Dein Lernstand wird in deinem Browser mit einem nur dir bekannten Schlüssel verschlüsselt (AES-GCM, 256 Bit) und erst dann gespeichert, unter einer Prüfsumme statt eines Namens. Den Schlüssel überträgst du per Kurzcode oder QR-Code auf deine weiteren Geräte. Der Betreiber kann den Inhalt nicht lesen.</p>
          <Ul>
            <li>Zur Wiederherstellung bei Fehlern bleibt beim Konto je Tag ein älterer Stand 10 Tage erhalten.</li>
            <li>Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO. Löschen: jederzeit in den Einstellungen.</li>
          </Ul>
        </Sec>
      )}

      {f.leaderboard && (
        <Sec t="Rangliste (freiwillig, mit Einwilligung)">
          <p>Wenn du an der Rangliste teilnimmst, sehen alle Nutzerinnen und Nutzer deinen selbst gewählten Benutzernamen, dein Level, deine XP und deine Figur. Dein GitHub-Name und deine E-Mail-Adresse erscheinen dort nie.</p>
          <Ul>
            <li>Rechtsgrundlage: deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Du kannst sie jederzeit widerrufen („Austragen“); der Eintrag wird sofort gelöscht.</li>
            <li>Wähle bitte nicht deinen echten Namen.</li>
          </Ul>
        </Sec>
      )}

      <Sec t="Patch Notes und Fehlermeldungen">
        <Ul>
          {f.patchNotes && <li>Beim Öffnen der Seite „Patch Notes“ lädt dein Browser die öffentliche Release-Liste direkt von GitHub (GitHub, Inc., USA). Dabei erhält GitHub deine IP-Adresse. Rechtsgrundlage: berechtigtes Interesse an aktuellen Versionshinweisen (Art. 6 Abs. 1 lit. f DSGVO). GitHub ist nach dem EU-US Data Privacy Framework zertifiziert.</li>}
          <li>„Fehler melden“ öffnet ein vorausgefülltes Formular auf GitHub. Gesendet wird erst, wenn du es dort selbst abschickst. Gemeldete Fehler sind öffentlich sichtbar; es gilt die Datenschutzerklärung von GitHub.</li>
        </Ul>
      </Sec>

      {f.tutor && (
        <Sec t="KI-Tutor">
          <p>Der KI-Tutor ist derzeit nur für den Betreiber freigeschaltet und für andere Konten nicht verfügbar. Eingaben im Tutor werden zur Beantwortung an Anthropic, PBC (USA) übermittelt.</p>
        </Sec>
      )}

      <Sec t="Speicherdauer">
        <Ul>
          <li>Lernstand im Browser: bis du ihn löschst.</li>
          {f.account && <li>Konto, Stand im Konto, Ranglisten-Eintrag: bis du sie löschst; Tagessicherungen höchstens 10 Tage.</li>}
          <li>Technische Zugriffsdaten beim Hosting: nach den Fristen des Anbieters, nur für Betrieb und Sicherheit.</li>
        </Ul>
      </Sec>

      <Sec t="Deine Rechte">
        <p>Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20; „Sicherung herunterladen“ liefert deine Daten als JSON) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Eine Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3).</p>
        <p>Wende dich dafür an die oben genannte Kontaktadresse. Gib in öffentlichen GitHub-Beiträgen bitte keine persönlichen Daten an. Du kannst dich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, zum Beispiel bei der Behörde deines Wohnorts (Art. 77 DSGVO).</p>
        <p className="small muted">Es findet keine automatisierte Entscheidungsfindung oder Profilbildung statt.</p>
      </Sec>
    </>
  );
}
