/**
 * Normalisierung visuell (nur neue App) – nach dem Vorbild der Pseudocode-Darstellung (CodeVariants):
 * - „Schritt für Schritt“: Ausgang → 1. NF → 2. NF → 3. NF, Schlüssel markiert, verschobene/neue Spalten hervorgehoben
 * - „Abhängigkeiten“: funktionale Abhängigkeiten als Pfeil-Diagramm über den Spalten
 * - „Ergebnis“: die Tabellen der letzten Stufe nebeneinander mit Beziehungen
 * - „Musterlösung“: die bisherige Text-Darstellung (children)
 * Ohne Beispiel zur ID bleibt es bei children. Alles als React aus Daten, kein HTML.
 * Außerdem TextMitTabellen: Aufgabentexte mit „a | b“-Zeilen zeigen die Tabelle als echte Tabelle.
 */
import { Fragment, useState, type ReactNode } from "react";
import type { NormAbh, NormBeispiel } from "@/content/schema";
import { ABH_ART, abhRaster, beziehungen, normFor, stufeName, stufenDiff, textBloecke, type SpaltenInfo, type TabellenInfo } from "@/lib/normalisierung";
import { Ic } from "@/ui-main";

type Tab = "schritte" | "abh" | "ergebnis" | "text";

/** id: Katalog-ID (Aufgabe, Karte, Frage, „P04:Normalformen“); children: bisherige Darstellung der Musterlösung */
export function NormVisual({ id, children }: { id?: string | null; children?: ReactNode }) {
  const b = normFor(id), [tab, setTab] = useState<Tab>("schritte");
  if (!b) return <>{children}</>;
  const tabs: [Tab, string][] = [
    ["schritte", b.stufen.length > 1 ? "Schritt für Schritt" : "Tabelle"],
    ...(b.abh.length ? [["abh", "Abhängigkeiten"] as [Tab, string]] : []),
    ...(b.stufen.length > 1 ? [["ergebnis", "Ergebnis"] as [Tab, string]] : []),
    ...(children ? [["text", "Musterlösung"] as [Tab, string]] : []),
  ];
  return (
    <div className="cv nf">
      <div className="segs cv-tabs" role="tablist" aria-label="Darstellung der Normalisierung">
        {tabs.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} className={`seg ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === "text" ? children
        : tab === "abh" ? <Abhaengigkeiten b={b} />
        : tab === "ergebnis" ? <Ergebnis b={b} />
        : <Schritte b={b} />}
    </div>
  );
}

// ---------- Schritt für Schritt
function Schritte({ b }: { b: NormBeispiel }) {
  const [i, setI] = useState(0), s = b.stufen[i], last = b.stufen.length - 1;
  const info = stufenDiff(b.stufen[i - 1], s);
  return (
    <div className="nf-box">
      <div className="row nf-head"><b className="small">{b.titel}</b></div>
      {last > 0 && (
        <ol className="nf-steps" aria-label="Stufen">
          {b.stufen.map((x, k) => (
            <li key={k}><button type="button" className={`nf-step ${k === i ? "on" : k < i ? "done" : ""}`} aria-current={k === i ? "step" : undefined} onClick={() => setI(k)}>{stufeName(x, k)}</button></li>
          ))}
        </ol>
      )}
      <p className="small nf-text" aria-live="polite">{s.text}</p>
      <div className="nf-tabs">{info.map((t) => <TabelleView key={t.t.name} info={t} />)}</div>
      {last > 0 && (
        <div className="row cv-ctl">
          <button type="button" className="btn small" disabled={i === 0} onClick={() => setI(i - 1)}><Ic name="left" cls="ic xs" /> Zurück</button>
          <button type="button" className="btn small primary" disabled={i >= last} onClick={() => setI(i + 1)}>Nächste Stufe <Ic name="right" cls="ic xs" /></button>
          <span className="tiny muted">Stufe {i + 1} von {last + 1}</span>
        </div>
      )}
      <Legende erste={i === 0} />
    </div>
  );
}

const STATUS_CLS: Record<SpaltenInfo["status"], string> = { bleibt: "", umbenannt: "nf-ren", verschoben: "nf-moved", neu: "nf-neu" };
function herkunft(c: SpaltenInfo): string | null {
  if (c.status === "neu") return "neu";
  if (c.status === "umbenannt") return "aus " + (c.alt ?? []).join(", ");
  if (c.status === "verschoben") return "aus " + c.von + (c.alt ? "." + c.alt.join(", ") : "");
  return null;
}

function TabelleView({ info, plain }: { info: TabellenInfo; plain?: boolean }) {
  const { t } = info;
  const cls = (c: SpaltenInfo) => [plain ? "" : STATUS_CLS[c.status], c.mehrwertig ? "nf-multi" : ""].filter(Boolean).join(" ");
  return (
    <figure className={`nf-tab ${info.neu && !plain ? "nf-tnew" : ""}`}>
      <figcaption><b>{t.name}</b>{info.neu && !plain && <span className="chip blue">neue Tabelle</span>}</figcaption>
      <div className="tblwrap">
        <table>
          <thead>
            <tr>{info.spalten.map((c) => {
              const h = plain ? null : herkunft(c);
              return (
                <th key={c.n} scope="col" className={cls(c)}>
                  <span className={`nf-cn ${c.pk ? "nf-pk" : ""}`}>{c.n}</span>
                  {(c.pk || c.fk) && <span className="nf-keys">{c.pk && <span className="nf-k pk">PK</span>}{c.fk && <span className="nf-k fk">FK → {c.fk}</span>}</span>}
                  {h && <span className="nf-from">{h}</span>}
                  {c.mehrwertig && <span className="nf-from">nicht atomar</span>}
                </th>
              );
            })}</tr>
          </thead>
          {t.zeilen.length > 0 && <tbody>{t.zeilen.map((z, r) => <tr key={r}>{info.spalten.map((c, k) => <td key={k} className={cls(c)}>{z[k]}</td>)}</tr>)}</tbody>}
        </table>
      </div>
      {!plain && info.weg.length > 0 && (
        <p className="nf-weg">{info.weg.map((w) => <span key={w.n} className="chip"><s>{w.n}</s>{w.nach.length > 0 && <> → {w.nach.join(", ")}</>}</span>)}</p>
      )}
    </figure>
  );
}

function Legende({ erste }: { erste: boolean }) {
  return (
    <p className="nf-leg tiny muted">
      <span><span className="nf-k pk">PK</span> Primärschlüssel</span>
      <span><span className="nf-k fk">FK</span> Fremdschlüssel</span>
      {!erste && <><span><i className="nf-sw nf-moved" /> verschoben</span><span><i className="nf-sw nf-ren" /> umbenannt/aufgeteilt</span><span><i className="nf-sw nf-neu" /> neu</span></>}
      <span><i className="nf-sw nf-multi" /> nicht atomar</span>
    </p>
  );
}

// ---------- Abhängigkeiten
function Abhaengigkeiten({ b }: { b: NormBeispiel }) {
  const t = b.stufen[b.abhIn].tabellen[0], namen = t.spalten.map((c) => c.n), raster = abhRaster(namen, b.abh);
  const pk = t.spalten.filter((c) => c.pk).map((c) => c.n);
  const cols = { gridTemplateColumns: `repeat(${namen.length}, minmax(min-content, 1fr))` };
  return (
    <div className="nf-box">
      <div className="row nf-head"><b className="small">{t.name}</b><span className="chip">Primärschlüssel: {pk.length > 1 ? `(${pk.join(", ")})` : pk[0]}</span></div>
      <div className="nf-scroll">
        <div className="nf-fd" style={cols} role="img" aria-label={b.abh.map(fdText).join("; ")}>
          <div className="nf-fd-row">{t.spalten.map((c) => <span key={c.n} className={`nf-fd-h ${c.pk ? "nf-pk" : ""}`}>{umbruch(c.n)}</span>)}</div>
          {raster.map((r, k) => (
            <div key={k} className={`nf-fd-row nf-a-${b.abh[k].art}`}>
              {r.map((z, j) => <span key={j} className={`nf-c ${z.l ? "l" : ""} ${z.r ? "r" : ""}`}>{z.mark === "von" ? <i className="nf-dot" /> : z.mark === "nach" ? <i className="nf-arr" /> : null}</span>)}
            </div>
          ))}
        </div>
      </div>
      <p className="nf-swipe tiny muted">Diagramm seitlich wischen, um alle Spalten zu sehen.</p>
      <ul className="nf-fd-list">
        {b.abh.map((a, k) => (
          <li key={k} className={`nf-a-${a.art}`}>
            <span className="nf-art"><i className="nf-dot" />{ABH_ART[a.art][0]}</span>
            <code>{fdText(a)}</code>
            <span className="small muted">{ABH_ART[a.art][1]}</span>
          </li>
        ))}
      </ul>
      <p className="nf-leg tiny muted"><span><i className="nf-dot" /> bestimmt (Determinante)</span><span><i className="nf-arr" /> hängt davon ab</span></p>
    </div>
  );
}
/** Umbruchstellen vor Wortteilen („Kunden·Name“), damit das Diagramm auch schmal passt */
const umbruch = (n: string) => n.split(/(?=[A-ZÄÖÜ][a-zäöüß])/).flatMap((x, i) => (i ? [<wbr key={i} />, x] : [x]));
const fdText = (a: NormAbh) => `${a.von.length > 1 ? `(${a.von.join(", ")})` : a.von[0]} → ${a.nach.join(", ")}`;

// ---------- Ergebnis
function Ergebnis({ b }: { b: NormBeispiel }) {
  const s = b.stufen[b.stufen.length - 1], rel = beziehungen(s);
  return (
    <div className="nf-box">
      <div className="row nf-head"><b className="small">Ergebnis in der {s.nf}. NF</b><span className="chip">{s.tabellen.length} Tabellen</span></div>
      <div className="nf-tabs">{stufenDiff(undefined, s).map((t) => <TabelleView key={t.t.name} info={t} plain />)}</div>
      {rel.length > 0 && (
        <div className="nf-rel">
          <span className="cv-lbl">Beziehungen</span>
          <ul>{rel.map((r, k) => <li key={k}><b>{r.eins}</b> <span className="chip blue">{r.art}</span> <b>{r.viele}</b> <span className="tiny muted">über {r.ueber}</span></li>)}</ul>
          <p className="tiny muted">Der Fremdschlüssel steht immer auf der n-Seite.</p>
        </div>
      )}
      <Legende erste />
    </div>
  );
}

// ---------- Tabellen in Aufgabentexten
/** Text wie bisher; Blöcke aus „a | b | c“-Zeilen werden als echte Tabelle gezeigt (erste Zeile = Kopf) */
export function TextMitTabellen({ text, className }: { text: string; className?: string }) {
  const bl = textBloecke(text);
  if (!bl.some((x) => "kopf" in x)) return <div className={className}>{text}</div>;
  return (
    <div className={className}>
      {bl.map((x, i) => "kopf" in x ? (
        <div key={i} className="tblwrap nf-srctab"><table>
          <thead><tr>{x.kopf.map((h, k) => <th key={k} scope="col">{h}</th>)}</tr></thead>
          <tbody>{x.zeilen.map((z, r) => <tr key={r}>{z.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody>
        </table></div>
      ) : <Fragment key={i}>{x.text}</Fragment>)}
    </div>
  );
}
