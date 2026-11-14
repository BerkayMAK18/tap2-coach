/**
 * Tutorial „So lernst du mit dem Coach“ – 1:1 wie rTutorial() der Live-App: Plan bis zur Prüfung, Lernpfad in 9 Schritten
 * mit Direktknöpfen, Spickzettel. Merkt sich beim Öffnen (tap2coach-tut), dass es gesehen wurde.
 */
import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EXAM_DAY, EXAM_DE } from "@/config";
import { daysBetween, today } from "@/lib/dates";
import { KEY_TUT, codeCard, tutStats } from "@/lib/tipps";
import { useProgress } from "@/store/progress";
import { Ic, pctS } from "@/ui-main";
import { useStartRound } from "@/components/lernen/ui";
import { usePlanActions } from "@/components/tipps/actions";

export const Route = createFileRoute("/tutorial")({ component: Tutorial });

function Tutorial() {
  const S = useProgress((s) => s.S), act = usePlanActions(), startRound = useStartRound();
  useEffect(() => { try { localStorage.setItem(KEY_TUT, "1"); } catch { /* privat */ } }, []);
  const left = Math.max(0, daysBetween(today(), EXAM_DAY)), { c, dueN, need, perDay } = tutStats(S, left);
  const tut = (k: string) => {
    if (k === "due") act.due();
    else if (k === "code") { const q = codeCard(S); if (q) startRound({ list: [q], title: "Code-Karte", src: { kind: "code" } }); }
    else act.go(k);
  };
  const B = ({ k, primary, children }: { k: string; primary?: boolean; children: React.ReactNode }) => <button type="button" className={`btn small${primary ? " primary" : ""}`} onClick={() => tut(k)}>{children}</button>;
  const steps: [string, string, string, React.ReactNode][] = [
    ["calendar", "Dem Lernplan folgen", "Der Lernplan verteilt alle offenen Fragen bis zum Vortag der Prüfung auf die Tage – Teil 1 zuerst. In der Übersicht steht immer, was heute dran ist.", <B k="plan" primary>Lernplan ansehen</B>],
    ["again", "Jeden Tag zuerst: fällige Wiederholungen", "10–15 Min. Fragen, die du schon kannst, kommen nach 1, 3, 7, 14 und 30 Tagen wieder. So bleibt das Wissen bis zur Prüfung frisch.", dueN ? <B k="due" primary>Fällige wiederholen ({dueN})</B> : <span className="small muted">Heute nichts fällig.</span>],
    ["book", "Thema für Thema: erst Theorie, dann Fragen", "Unter Lernen ein Thema öffnen, die Theorie lesen (Lernzeit-Timer starten) und dann Lernrunden à 20 Fragen machen, bis die Ampel grün ist. Erst selbst antworten, dann Optionen bzw. Lösung ansehen. Bist du unsicher, sag es ehrlich – die Frage kommt dann morgen wieder. In jeder Runde stecken ein paar Wiederholungen aus anderen Themen.", <B k="lernen">Zu den Themen</B>],
    ["layers", "Themen mischen", "Unter Lernen mehrere Themen anhaken und gemeinsam üben – zum Beispiel SQL und Datenmodell. Gemischt üben trainiert, Aufgaben zu erkennen, statt sie nur zu wiederholen.", <B k="lernen">Themen auswählen</B>],
    ["code", "Code schreiben, nicht nur lesen", "Bei Pseudocode- und SQL-Karten deine Lösung im Editor tippen, SQL mit Shift + Enter ausführen und mit der Musterlösung vergleichen.", <B k="code">Code-Karte üben</B>],
    ["pencil", "Große Aufgaben auf Papier, mit Timer", "Unter Aufgaben eine Aufgabe starten – der Timer läuft mit der Prüfungszeit. Auf Papier lösen, Stopp drücken, mit der Musterlösung vergleichen und Punkte eintragen.", <B k="aufgaben">Zu den Aufgaben</B>],
    ["bulb", "Operatoren beherrschen", "Der Operator bestimmt die Antworttiefe: „Nennen“ = Stichwort, „Erläutern“ = mit Begründung oder Beispiel, „Beurteilen“ = mit eigenem Urteil. Im Operator-Trainer übst du genau das.", <B k="operatoren">Operator-Trainer</B>],
    ["timer", "Einmal pro Woche: Prüfung simulieren", "Je Teil eine Real-Klausur (Teil 1, Teil 2) bzw. SoWi-Simulation unter Zeitdruck. Beim Bewerten jedem Punktverlust eine Ursache zuordnen – unter Tipps siehst du, woran es am häufigsten liegt.", <B k="pruefung">Zur Prüfung</B>],
    ["bulb", "Letzte Woche: festigen statt neu lernen", "Nur noch fällige Wiederholungen, Fehlerfragen und Simulationen. Prüfungstechnik unter Tipps lesen. Am Tag vor der Prüfung nichts Neues mehr.", <B k="tipps">Zu den Tipps</B>],
  ];
  return (
    <>
      <section className="card tut-plan">
        <div className="row" style={{ alignItems: "flex-start" }}><img src="/icons/raven.svg" alt="" className="tut-raven" /><div style={{ flex: 1, minWidth: 220 }}><h2>Dein Plan bis zum {EXAM_DE}</h2><p className="muted" style={{ marginTop: 6 }}>{left > 0 && <>Noch <b className="ink">{left} {left === 1 ? "Tag" : "Tage"}</b>. </>}{need ? <>Beantworte jeden Tag etwa <b className="ink">{perDay} Fragen</b>{dueN ? " plus die fälligen Wiederholungen" : ""}, dann ist bis zum Vortag alles grün.</> : "Alle Fragen sind grün – jetzt geht es ums Festigen."} Aktuell: {pctS(c.pct)} prüfungsreif.</p></div></div>
      </section>
      <section className="sec"><div className="sec-head"><h2>Der Lernpfad</h2></div>
        <ol className="tut-steps">{steps.map(([i, h, t, a], n) => <li key={n}><span className="ts-n">{n + 1}</span><div className="ts-b"><b><Ic name={i} cls="ic sm" /> {h}</b><p className="small muted">{t}</p><div className="row">{a}</div></div></li>)}</ol>
      </section>
      <section className="sec"><div className="sec-head"><h2>Spickzettel</h2><span className="small muted">Was kann ich wo?</span></div>
        <div className="cheat">
          <div className="card"><h4><Ic name="home" cls="ic sm" /> Übersicht</h4><p className="small muted">Prüfungsreife, Stand je Teil, Lernempfehlung, „Gezielt üben“ (fällig, Fehler, neu, markiert, Zufall).</p></div>
          <div className="card"><h4><Ic name="book" cls="ic sm" /> Lernen</h4><p className="small muted">Themen mit Theorie und Fragen. Mehrere Themen anhaken = gemeinsame Lernrunde. Eigene Fragen anlegen.</p></div>
          <div className="card"><h4><Ic name="pencil" cls="ic sm" /> Aufgaben</h4><p className="small muted">Große Aufgaben im Prüfungsstil mit Timer, Musterlösung und Punkteeintrag.</p></div>
          <div className="card"><h4><Ic name="timer" cls="ic sm" /> Prüfung</h4><p className="small muted">Simulation (30 Auswahlfragen) und Real-Klausur (4 offene Aufgaben, 90 Min.) mit Note.</p></div>
          <div className="card"><h4><Ic name="bulb" cls="ic sm" /> Tipps</h4><p className="small muted">Prüfungstechnik, Operatoren, typische Punktverluste und deine schwächsten Themen.</p></div>
          <div className="card"><h4><Ic name="gear" cls="ic sm" /> Einstellungen</h4><p className="small muted">Hell/Dunkel, App installieren, Sicherung speichern/laden, Fortschritt zurücksetzen.</p></div>
        </div>
        <div className="card cheat-keys">
          <h4>Symbole und Tastenkürzel</h4>
          <ul>
            <li><span className="amp s2" /><span className="amp s1" /><span className="amp s0" /> <b>Ampel:</b> grün = sitzt (2× richtig), gelb = 1× richtig, rot = zuletzt falsch</li>
            <li><Ic name="search" cls="ic xs" /> <b>Suche</b> oben rechts oder Taste <span className="kbd">/</span></li>
            <li><Ic name="star" cls="ic xs" /> <b>Markieren</b> und <Ic name="flag" cls="ic xs" /> <b>Fehler melden</b> in jeder Frage</li>
            <li><span className="kbd">1</span>–<span className="kbd">4</span> Antwort wählen · <span className="kbd">Leertaste</span> aufdecken · <span className="kbd">←</span>/<span className="kbd">→</span> nicht gewusst/gewusst · <span className="kbd">Esc</span> Runde beenden</li>
            <li>Im Code-Editor: <span className="kbd">Strg/Cmd + Enter</span> vergleichen · <span className="kbd">Shift + Enter</span> SQL ausführen</li>
          </ul>
        </div>
      </section>
      <div className="row" style={{ justifyContent: "center", margin: "8px 0 24px" }}><button type="button" className="btn primary big" onClick={() => tut("start")}><Ic name="play" cls="ic sm" /> Los geht's</button></div>
    </>
  );
}
