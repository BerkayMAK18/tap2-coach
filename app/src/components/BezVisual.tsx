/**
 * Beziehungen visuell (nur neue App) – nach dem Vorbild von NormVisual:
 * - BezVorher:  neutrales Beziehungsbild zur Frage (zwei Entitäten, Kardinalitäten bzw. Krähenfuß), noch ohne Fremdschlüssel;
 *               mit offen = nach der Antwort werden verdeckte Kardinalitäten und die Krähenfuß-Lesart gezeigt
 * - BezLoesung: Relationenmodell als Mini-Tabellen mit PK/FK und Pfeil FK → PK, dazu Beispieldaten und abgelehnte Änderungen
 * Ohne Beispiel zur ID wird nichts gezeigt. Alles als React/SVG aus Daten, kein HTML.
 * Breite: Ist der Platz zu schmal für die Anordnung nebeneinander, stehen die Kästen untereinander (z. B. bei 375 px).
 */
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { BezAbgelehnt, BezBeispiel, BezEnde, BezVorher as BezVorherT } from "@/content/schema";
import { CH, HEAD, ROW, artVon, badges, bezFor, erLayout, erQuerMin, kanten, relLayout, type Lbl, type Modus } from "@/lib/beziehungen";

/** Verfügbare Breite des Containers (null bis zur ersten Messung, z. B. beim Rendern im Test) */
function useBreite<T extends HTMLElement>(): [RefObject<T | null>, number | null] {
  const ref = useRef<T>(null), [w, setW] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}
/** quer, solange es passt; sonst hoch */
const modusFuer = (breite: number | null, quer: number): Modus => (breite !== null && quer > breite ? "hoch" : "quer");

const Label = ({ l, cls = "bz-kard" }: { l: Lbl; cls?: string }) => (l.text ? <text className={cls} x={l.x} y={l.y} textAnchor={l.anchor}>{l.text}</text> : null);

// ---------- Vor der Antwort
export function BezVorher({ id, offen = false }: { id?: string | null; offen?: boolean }) {
  const b = bezFor(id).find((x) => x.vorher);
  if (!b?.vorher) return null;
  return <ErBild v={b.vorher} offen={offen} />;
}

function ErBild({ v, offen }: { v: BezVorherT; offen: boolean }) {
  const [ref, breite] = useBreite<HTMLDivElement>();
  const L = erLayout(v, modusFuer(breite, erQuerMin(v) + 4), offen, breite);
  const kf = v.notation === "kraehenfuss";
  const aria = `Beziehung zwischen ${v.a.t} und ${v.b.t}` + (kf ? (offen ? `: ${v.a.t} ${L.enden[0].lbl.text}, ${v.b.t} ${L.enden[1].lbl.text} (Krähenfuß-Notation)` : " in Krähenfuß-Notation")
    : v.verdeckt && !offen ? ", Kardinalität gesucht" : `: ${v.a.t} ${v.a.k} zu ${v.b.k} ${v.b.t}`);
  return (
    <div className="bz-er" ref={ref}>
      <svg className="bz-svg" viewBox={`-2 -2 ${L.w + 4} ${L.h + 4}`} width={L.w + 4} height={L.h + 4} role="img" aria-label={aria}>
        <line className="bz-line" x1={L.linie[0]} y1={L.linie[1]} x2={L.linie[2]} y2={L.linie[3]} />
        {kf && L.enden.map((e, i) => <g key={i} transform={`translate(${e.x} ${e.y}) rotate(${e.winkel})`}><Kraehenfuss e={e.e} /></g>)}
        {[L.a, L.b].map((x) => (
          <g key={x.name} className="bz-ent">
            <rect x={x.x} y={x.y} width={x.w} height={x.h} rx={6} />
            <text x={x.x + x.w / 2} y={x.y + x.h / 2 + 4.5} textAnchor="middle">{x.name}</text>
          </g>
        ))}
        {L.enden.map((e, i) => <Label key={i} l={e.lbl} cls={`bz-kard ${v.verdeckt && !offen ? "bz-q" : ""} ${kf ? "bz-lese" : ""}`} />)}
      </svg>
    </div>
  );
}

/** Krähenfuß-Symbole in lokalen Koordinaten: Entität bei x = 0, Linie läuft nach +x. Am Rand die Höchstzahl, weiter außen die Mindestzahl. */
function Kraehenfuss({ e }: { e: BezEnde }) {
  return (
    <g className="bz-kf">
      {e.k === "1" ? <line x1={10} y1={-8} x2={10} y2={8} /> : <path d="M0,-9 L15,0 L0,9 M0,0 H15" />}
      {e.min === 0 ? <circle cx={26} cy={0} r={5} /> : <line x1={22} y1={-8} x2={22} y2={8} />}
    </g>
  );
}

// ---------- Nach der Antwort
/**
 * Relationenmodell zu einer ID. theorie = in den Lernpaketen: je Beispiel Überschrift und zuerst das aufgedeckte
 * Beziehungsbild (dort gibt es nichts zu raten, und es können mehrere Beispiele an einem Abschnitt hängen).
 */
export function BezLoesung({ id, theorie = false }: { id?: string | null; theorie?: boolean }) {
  const bs = bezFor(id);
  if (!bs.length) return null;
  return <div className="bz">{bs.map((b) => <RelBild key={b.titel} b={b} theorie={theorie} />)}</div>;
}

function RelBild({ b, theorie }: { b: BezBeispiel; theorie: boolean }) {
  const [ref, breite] = useBreite<HTMLDivElement>();
  const L = relLayout(b.tabellen, modusFuer(breite, relLayout(b.tabellen, "quer").w + 4));
  const ks = kanten(b.tabellen);
  const aria = "Relationenmodell: " + b.tabellen.map((t) => `${t.name}(${t.spalten.map((c) => c.n + (badges(c).length ? ` ${badges(c).join(" ")}` : "")).join(", ")})`).join("; ")
    + ". " + ks.map((k) => `${k.von}.${k.spalte} verweist auf ${k.nach}.${k.ziel}, ${k.nach} ${k.kNach} zu ${k.kVon} ${k.von}`).join("; ");
  return (
    <figure className="bz-rel">
      {theorie && <figcaption><b className="small">{b.titel}</b>{b.vorher && <span className="chip">{artVon(b.vorher)}</span>}</figcaption>}
      {theorie && b.vorher && <ErBild v={b.vorher} offen />}
      <div className="bz-scroll" ref={ref}>
        <svg className="bz-svg" viewBox={`-2 -2 ${L.w + 4} ${L.h + 4}`} width={L.w + 4} height={L.h + 4} role="img" aria-label={aria}>
          {L.boxes.map(({ t, x, y, w, h }) => (
            <g key={t.name} className="bz-box">
              <rect x={x} y={y} width={w} height={h} rx={6} />
              <path className="bz-head" d={`M${x},${y + HEAD} V${y + 6} Q${x},${y} ${x + 6},${y} H${x + w - 6} Q${x + w},${y} ${x + w},${y + 6} V${y + HEAD} Z`} />
              <text className="bz-tn" x={x + w / 2} y={y + 19} textAnchor="middle">{t.name}</text>
              {t.spalten.map((c, i) => {
                const cy = y + HEAD + i * ROW, ty = cy + 15, tw = c.n.length * CH;
                const ziel = ks.some((k) => k.nach === t.name && k.ziel === c.n);
                return (
                  <g key={c.n}>
                    {(c.fk || ziel) && <rect className={c.fk ? "bz-fkrow" : "bz-pkrow"} x={x + 2} y={cy + 1} width={w - 4} height={ROW - 2} rx={3} />}
                    <text className={`bz-cn ${c.fk ? "bz-fk" : ""}`} x={x + 10} y={ty}>{c.n}</text>
                    {c.pk && <line className="bz-ul" x1={x + 10} y1={ty + 3} x2={x + 10 + tw} y2={ty + 3} />}
                    {badges(c).map((bd, k) => {
                      const bx = x + 10 + tw + 8 + k * 23;
                      return <g key={bd} className={`bz-badge ${bd.toLowerCase()}`}><rect x={bx} y={cy + 5} width={20} height={13} rx={6.5} /><text x={bx + 10} y={cy + 14.5} textAnchor="middle">{bd}</text></g>;
                    })}
                  </g>
                );
              })}
            </g>
          ))}
          {L.pfeile.map((p, i) => (
            <g key={i} className="bz-pfeil">
              <path d={p.d} />
              <polygon points={p.spitze} />
              <Label l={p.lVon} />
              <Label l={p.lNach} />
            </g>
          ))}
        </svg>
      </div>
      {b.tabellen.some((t) => t.zeilen.length) && <Daten b={b} />}
      <p className="bz-leg tiny muted">
        <span><span className="nf-k pk">PK</span> Primärschlüssel</span>
        <span><span className="nf-k fk">FK</span> Fremdschlüssel</span>
        {b.tabellen.some((t) => t.spalten.some((c) => c.unique)) && <span><span className="nf-k uq">UQ</span> UNIQUE</span>}
        <span><i className="bz-legpfeil" /> verweist auf (FK → PK)</span>
      </p>
    </figure>
  );
}

// ---------- Beispieldaten und referentielle Integrität
const ART: Record<BezAbgelehnt["art"], [string, string]> = { einfuegen: ["INSERT", "Einfügen abgelehnt"], loeschen: ["DELETE", "Löschen abgelehnt"] };

function Daten({ b }: { b: BezBeispiel }) {
  const weg = (t: string, z: string[]) => b.abgelehnt.find((x) => x.tabelle === t && x.zeile.join("|") === z.join("|"));
  return (
    <div className="bz-daten">
      <div className="bz-dtabs">
        {b.tabellen.filter((t) => t.zeilen.length).map((t) => {
          const neu = b.abgelehnt.filter((x) => x.tabelle === t.name && x.art === "einfuegen").map((x) => x.zeile);
          const row = (z: string[], key: string) => {
            const x = weg(t.name, z);
            return <tr key={key} className={x ? `bz-weg ${x.art}` : ""}>{z.map((v, k) => <td key={k} className={t.spalten[k].fk ? "bz-fk" : ""}>{v}</td>)}</tr>;
          };
          return (
            <figure key={t.name} className="nf-tab">
              <figcaption><b>{t.name}</b></figcaption>
              <div className="tblwrap"><table>
                <thead><tr>{t.spalten.map((c) => <th key={c.n} scope="col"><span className={c.pk ? "nf-pk" : ""}>{c.n}</span>{(c.pk || c.fk) && <span className="nf-keys">{c.pk && <span className="nf-k pk">PK</span>}{c.fk && <span className="nf-k fk">FK</span>}</span>}</th>)}</tr></thead>
                <tbody>{t.zeilen.map((z, r) => row(z, String(r)))}{neu.map((z, r) => row(z, "n" + r))}</tbody>
              </table></div>
            </figure>
          );
        })}
      </div>
      {b.abgelehnt.length > 0 && (
        <ul className="bz-ab">
          {b.abgelehnt.map((x, i) => (
            <li key={i} className={x.art}>
              <span className="chip red">{ART[x.art][0]} ✗</span>
              <span><b>{ART[x.art][1]}:</b> {x.tabelle} ({x.zeile.join(", ")}). {x.grund}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
