import { daysUntil, topicStats, type Content, type ProgressRow } from './tap2';

export const PARTS = ['Teil 1', 'Teil 2', 'Beides', 'SoWi'] as const;
export type CurriculumTopic = { id: string; must: string; should: string; prerequisites?: string[] };
/** Original summaries of FIAE skills, informed by the supplied guide. Not an official prediction. */
export const CURRICULUM: CurriculumTopic[] = [
  { id: 'T06', must: 'Anforderungen, Lasten-/Pflichtenheft, SMART, Scrum und Wasserfall; Kosten und Nutzwert berechnen.', should: 'Risiken, Meilensteine, Netzplan und Projektcontrolling begründen.' },
  { id: 'T07', must: 'Schutzziele, DSGVO-Grundsätze, Rechte, Authentifizierung, Berechtigungen und sichere Eingaben erklären.', should: 'Bedrohungsanalyse, Backup-Konzept, Verschlüsselung und TOM auf einen Fall anwenden.' },
  { id: 'T09', must: 'HTTP-Methoden und Statuscodes, REST, JSON, Client/Server und Schnittstellenverträge anwenden.', should: 'TLS, CORS, Sessions und Fehlerbehandlung von APIs erklären.' },
  { id: 'T18', must: 'Schichtenarchitektur, Git-Workflow, Branch/Merge und Deployment erklären.', should: 'Cloud-Dienste und CI/CD für eine Anwendung bewerten; keine Vertiefung in Netzwerkadministration.' },
  { id: 'T19', must: 'Softwarelizenzen, Barrierefreiheit, Ergonomie und rechtliche Anforderungen unterscheiden.', should: 'Standard-/Individualsoftware und Benutzeroberflächen fallbezogen bewerten.' },
  { id: 'T01', must: 'Schleifen, Bedingungen, Funktionen, Listen, Suchen/Sortieren und Schreibtischtests selbst schreiben; Python in Pseudocode übertragen.', should: 'Rekursion, Laufzeit, Stapel/Warteschlange und Randfälle vergleichen.' },
  { id: 'T02', must: 'SELECT, WHERE, JOIN, GROUP BY, HAVING, Unterabfragen, INSERT/UPDATE/DELETE und Schlüsselbedingungen selbst schreiben.', should: 'Transaktionen, Mengenoperationen, Indizes und SQL-Injection erklären.', prerequisites: ['T03'] },
  { id: 'T03', must: 'Entitäten, Kardinalitäten, Primär-/Fremdschlüssel, m:n-Auflösung und Normalisierung bis 3NF anwenden.', should: 'Anomalien und funktionale Abhängigkeiten an einem Beispiel begründen.' },
  { id: 'T04', must: 'Klassen-, Sequenz-, Aktivitäts- und Use-Case-Diagramme lesen und aus Anforderungen ableiten.', should: 'Assoziation, Aggregation, Komposition und Zustandsdiagramme begründen.' },
  { id: 'T05', must: 'Testfälle, Grenzwerte, Äquivalenzklassen, Unit-/Integrations-/System-/Abnahmetests und Soll/Ist-Vergleich entwickeln.', should: 'Testautomatisierung, Regression, Code Review und Qualitätsmerkmale beurteilen.' },
  { id: 'T08', must: 'Klassen, Objekte, Kapselung, Vererbung, Polymorphie und Interfaces auf Code anwenden.', should: 'Strategy, Observer, Factory, SOLID und Komposition statt Vererbung vergleichen.' },
  { id: 'T16', must: 'ACID, COMMIT/ROLLBACK, relationale Datenbanken und passende Datentypen erklären.', should: 'NoSQL, CAP/BASE, Trigger und Replikation vergleichen.', prerequisites: ['T03'] },
  { id: 'T17', must: 'Datentypen, Parameter, Rückgabewerte, Exceptions und imperative/objektorientierte Paradigmen unterscheiden.', should: 'Compiler/Interpreter, funktionale Konzepte und Sprachwahl begründen.' },
  { id: 'T10', must: 'Anforderungen, nachhaltige Software und verantwortlichen Einsatz von KI in der Entwicklung einordnen.', should: 'Neue Katalogbegriffe anhand deiner Ausbildungsunterlagen nachprüfen; kein garantierter Prüfungsumfang.' },
  { id: 'T11', must: 'Ausbildungsvertrag, BBiG, Rechte/Pflichten, Probezeit, Kündigung und Arbeitsvertrag anwenden.', should: 'Arbeitszeit, Urlaub und Kündigungsschutz an Fällen unterscheiden.' },
  { id: 'T12', must: 'Sozialversicherungszweige, Betriebsrat, Tarifvertrag und Mitbestimmung zuordnen.', should: 'Tarifautonomie, Arbeitskampf und Brutto/Netto-Zusammenhänge erklären.' },
  { id: 'T13', must: 'Rechtsformen, Markt/Preis, Angebot/Nachfrage und Wirtschaftlichkeitsprinzip erklären.', should: 'Konjunktur, Wettbewerb und betriebliche Kennzahlen vergleichen.' },
  { id: 'T14', must: 'Arbeitsschutz, Unfallverhütung und nachhaltigen Ressourceneinsatz erklären.', should: 'Gefährdungsbeurteilung und Umweltschutzmaßnahmen an einem Fall begründen.' },
  { id: 'T15', must: 'Prozentrechnung, Rabatt/Skonto, Umsatzsteuer, Kosten, Gewinn und Wirtschaftlichkeit berechnen.', should: 'Rechenwege mit Einheiten und Plausibilitätsprüfung unter Zeitdruck üben.' },
];

export function groupOf(part: string) { return part === 'Teil 1 + 2' ? 'Beides' : part; }

export function learningPlan(content: Content, progress: ProgressRow[], now = new Date()) {
  const remaining = Math.max(0, daysUntil(content.examDay, now));
  const topics = content.topics.map(topic => {
    const stats = topicStats(content.items.filter(i => i.topic === topic.id), progress, now);
    const detail = CURRICULUM.find(c => c.id === topic.id);
    const status = stats.seen === 0 ? 'Stand noch offen' : stats.pct >= 80 ? 'Festigen' : 'Aufbauen';
    const wrong = progress.filter(p => p.topic === topic.id).reduce((sum, p) => sum + p.wrong, 0);
    return { ...topic, ...detail, stats, status, wrong, group: groupOf(topic.part) };
  });
  const ranked = [...topics].sort((a, b) => {
    // Core weaknesses before extensions; overdue reviews before other equal-priority work.
    const tier = (t: typeof a) => t.stats.pct >= 80 ? 2 : t.prio === 'Muss' ? 0 : 1;
    return tier(a) - tier(b) || b.stats.due - a.stats.due || a.stats.pct - b.stats.pct || b.wrong - a.wrong || CURRICULUM.findIndex(c => c.id === a.id) - CURRICULUM.findIndex(c => c.id === b.id);
  });
  // Place prerequisite topics first without dropping a topic.
  const ordered: typeof ranked = [];
  const add = (t: typeof ranked[number]) => {
    if (ordered.some(o => o.id === t.id)) return;
    for (const id of t.prerequisites ?? []) { const p = ranked.find(x => x.id === id); if (p) add(p); }
    ordered.push(t);
  };
  ranked.forEach(add);
  const studyDays = Math.max(1, remaining - 1);
  const calendar = Array.from({ length: remaining }, (_, n) => {
    const date = new Date(now); date.setUTCDate(date.getUTCDate() + n);
    return { date: date.toISOString().slice(0, 10), final: n === remaining - 1, topics: n === remaining - 1 ? [] : ordered.filter((_, i) => Math.min(studyDays - 1, Math.floor(i * studyDays / ordered.length)) === n) };
  });
  return { topics, ordered, calendar, remaining };
}

export function codeLanguage(topic: string, question: string): 'python' | 'sql' | null {
  if (topic === 'T02' && /select|abfrage|sql|insert|update|delete|create|join/i.test(question)) return 'sql';
  if (['T01', 'T08', 'T17'].includes(topic) && /entwickeln|implementieren|code|methode|algorithmus|funktion/i.test(question)) return 'python';
  return null;
}