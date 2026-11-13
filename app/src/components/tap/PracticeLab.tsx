import { useState } from 'react';
import { Button, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/ui';
import { CodeEditor } from './CodeEditor';
import { PRACTICE } from '@/lib/practice';
import { useTutor } from './useTutor';
import { AiGrade } from './AiGrade';

export function PracticeLab({ language }: { language: 'python' | 'sql' }) {
  const [index, setIndex] = useState('0');
  const [shown, setShown] = useState(false);
  const task = PRACTICE[language][Number(index)] ?? PRACTICE[language][0];
  const [answer, setAnswer] = useState(task.code);
  const tutor = useTutor();
  return <section className="space-y-4">
    <h2 className="font-head text-heading-100">{language === 'python' ? 'Python-Werkstatt' : 'SQL-Werkstatt'}</h2>
    <Select value={index} onValueChange={v=>{setIndex(v);setShown(false);setAnswer(PRACTICE[language][Number(v)]?.code ?? '');}}><SelectTrigger aria-label="Übung wählen"><SelectValue/></SelectTrigger><SelectContent>{PRACTICE[language].map((p,i)=><SelectItem key={i} value={String(i)}>{p.title}</SelectItem>)}</SelectContent></Select>
    <p className="text-body-300">{task.task}</p>
    {language === 'sql' && <p className="whitespace-pre-wrap text-body-200">Kunde(KID, Name, Ort, Email) · Artikel(ArtNr, Bezeichnung, Kategorie, Preis){'\n'}Bestellung(BID, KID, Datum, Status) · Position(BID, ArtNr, Menge){'\n'}SQLite-Übungsdatenbank. Datentypen und Funktionen können vom Prüfungsdialekt abweichen.</p>}
    {language === 'python' && <p className="text-body-200">Python zum Üben. Prüfe zusätzlich, ob du die Lösung ohne Rechner als Pseudocode darstellen kannst.</p>}
    <CodeEditor key={index} language={language} initialCode={task.code} onChange={setAnswer}/>
    <AiGrade key={`grade-${index}`} practiceKey={`${language}:${index}`} question={task.task} solution={task.solution} answer={answer} points={5}/>
    <div className="flex flex-wrap gap-3"><Button onClick={()=>setShown(!shown)}>{shown ? 'Lösung ausblenden' : 'Musterlösung vergleichen'}</Button><Button loading={tutor.busy} onClick={()=>tutor.start(`FIAE ${language}: Prüfe meinen Lösungsweg. Frage erst nach meinem Verständnis und gib Hinweise statt sofort die Lösung.\nAufgabe: ${task.task}\nMein Code:\n${answer}`)}>Mit Tutor prüfen</Button></div>
    {shown && <pre className="overflow-auto whitespace-pre-wrap bg-muted p-4 text-body-300 text-foreground">{task.solution}</pre>}
  </section>;
}