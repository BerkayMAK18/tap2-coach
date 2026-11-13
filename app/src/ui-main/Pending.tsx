/** Platzhalter im Design der Live-App für noch nicht portierte Bereiche. */
export function Pending({ title }: { title: string }) {
  return (
    <section className="card">
      <h3>{title}</h3>
      <p className="small muted">Dieser Bereich wird gerade aus der Live-App übernommen. Bis dahin findest du ihn in der Live-App – dein Lernstand ist über den Sync derselbe.</p>
    </section>
  );
}
