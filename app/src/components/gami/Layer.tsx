/**
 * Ebene des Belohnungs-Moduls (ensureLayer der Live-App): Fenster .gm-modal und Hinweise .gm-toasts am Ende von <body>.
 * Wird wie im Original erst beim ersten Hinweis/Fenster angelegt. Inhalte 1:1: Level-Up, Login-Kalender, Tagestruhe,
 * Schatzkammer (Truhe, Ergebnis, alle Teile), Event-Belohnung. Klick auf den Hintergrund oder „data-gm-close“ schließt.
 */
import { Fragment, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ANIMALS } from "@/lib/gami/art";
import { evEq, featuredOf, poolOf } from "@/lib/gami/core";
import { EXTRAS, GACHA, RANKS, RAR, SKINS, pct, rank } from "@/lib/gami/items";
import { today } from "@/lib/dates";
import { act, closeModal, gami, useGami, type Modal } from "@/store/gami";
import { Cal } from "./Belohnungen";
import { Fig, Tile } from "./bits";

export function GamiLayer() {
  const layer = useGami((s) => s.layer), modal = useGami((s) => s.modal), toasts = useGami((s) => s.toasts);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (modal && box.current) box.current.scrollTop = 0; }, [modal]);
  if (!layer) return null;
  return createPortal(
    <div>
      <div className="gm-modal" hidden={!modal} onClick={(e) => { const t = e.target as HTMLElement; if (t.classList.contains("gm-modal") || t.closest("[data-gm-close]")) closeModal(); }}>
        <div className="gm-mbox" role="dialog" aria-modal="true" ref={box}>{modal ? <ModalContent m={modal} /> : null}</div>
      </div>
      <div className="gm-toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className="gm-toast">{t.text}</div>)}</div>
    </div>,
    document.body,
  );
}

const CENTER = { justifyContent: "center" } as const;
export function ModalContent({ m }: { m: Modal }) {
  const G = gami();
  switch (m.k) {
    case "level": { const l = m.l, newRank = RANKS.some(([n]) => n === l); return <><div className="gm-ava-big" style={{ width: 130 }}><Fig c={G.char} eq={G.equip[G.char]} /></div><h2>{`Level ${l}!`}</h2>{newRank ? <p>Neuer Rang: <b>{rank(l)}</b></p> : <p className="muted">{rank(l)}</p>}<p className="gm-gain">{`+100 🪶${l % 5 === 0 ? " · +1 🎟️" : ""}`}</p><button type="button" className="btn primary" data-gm-close="">Weiter</button></>; }
    case "login": { const o = m.o; return <><h2>Willkommen zurück!</h2><p className="muted">{o.lost ? `Deine 🔥-Serie von ${o.oldStreak} Tagen ist gerissen – der Kalender läuft trotzdem weiter.` : <>Tagesserie: <b>{`🔥 ${o.streak}`}</b></>}{` · Runde ${o.round}`}</p><div style={{ margin: "14px 0" }}><Cal done={o.idx} now={o.idx} /></div><button type="button" className="btn primary" data-gm-login="" onClick={() => act.claimLogin(o)}>{`Tag ${o.idx + 1} abholen`}</button></>; }
    // Text wie in der Live-App (die Truhe gibt tatsächlich 300 🪶 + 2 🎟️, siehe Quests)
    case "chest": return <><div style={{ fontSize: 60 }}>🎁</div><h2>Tagestruhe</h2><p className="gm-gain">+150 🪶 · +1 🎟️</p><button type="button" className="btn primary" data-gm-close="">Super</button></>;
    case "pullOpen": { const col = ({ SSR: ["#F7C948", "#C98A00"], SR: ["#B98AF5", "#7B45C9"], R: ["#7DB3F5", "#3B6FC0"], N: ["#C9A27A", "#8A6440"] } as Record<string, string[]>)[m.top];
      return <><h2>{m.n === 1 ? "Die Truhe öffnet sich …" : "Zehn Truhen öffnen sich …"}</h2><svg className={`gm-chest glow-${m.top}`} viewBox="0 0 160 130" aria-hidden="true"><rect x="18" y="58" width="124" height="64" rx="8" fill={col[0]} /><path d="M18 64 C18 18 142 18 142 64 Z" fill={col[1]} /><rect x="18" y="58" width="124" height="10" fill={col[1]} /><rect x="70" y="52" width="20" height="28" rx="4" fill="#FFE58A" stroke="#8A6440" strokeWidth="3" /><path d="M40 70 v50 M120 70 v50" stroke={col[1]} strokeWidth="6" /></svg><p className="muted small">{m.top === "SSR" ? "Goldenes Licht dringt heraus …!" : m.top === "SR" ? "Es schimmert violett …" : "Es rumpelt …"}</p></>; }
    case "pull": { const { r } = m, n = r.n;
      return <><h2>{r.top === "SSR" ? (r.won ? "Legendär – das Highlight!" : "Legendär!") : r.top === "SR" ? "Episch!" : "Geöffnet"}</h2>
        <div className={`gm-pulls ${n === 1 ? "one" : ""}`}>{r.res.map((x, k) => <Tile key={k} style={{ animationDelay: `${k * 0.1}s` }} it={x.it} extra={x.isNew ? <span className="gm-tag">NEU</span> : x.dup ? <span className="gm-tag dup">{x.gain}</span> : null} />)}</div>
        {r.lost ? <p className="small" style={{ color: "#C98A00", fontWeight: 700 }}>{`Nicht das Highlight – dafür ist dein nächstes Legendär hier garantiert ${r.feat.name}.`}</p> : null}{r.res.some((x) => x.dup) ? <p className="small muted">Doppelte Teile werden in Federn umgewandelt.</p> : null}
        <div className="row" style={CENTER}><button type="button" className="btn primary" data-gm-close="">Weiter</button>{m.again ? <button type="button" className="btn" data-gm-again={n} onClick={() => act.again(n)}>{`Nochmal ${n}×`}</button> : null}</div></>; }
    case "info": return <Info c={m.c} />;
    case "ev": { const e = m.e, shirt = e.reward.kind === "shirt";
      return <><span className="gm-kicker">{`EVENT-BELOHNUNG · ${e.kurz}`}</span><div className="gm-ava-big" style={{ width: 150, marginTop: 10 }}>{shirt ? <Fig c={G.char} eq={evEq(G, e)} /> : <Fig c={G.char} eq={G.equip[G.char]} />}</div><h2>{e.reward.name}</h2>{shirt ? null : <p className="gm-title-big">{`«${e.reward.name}»`}</p>}<p className="muted">{String(e.reward.txt ?? "")}</p><p className="gm-gain">{`+300 🪶 · +2 🎟️ · +200 XP${m.up ? ` · Level ${m.l}!` : ""}`}</p><div className="row" style={CENTER}><button type="button" className="btn primary" data-gm-evwear="" onClick={() => act.evWear(e)}>{shirt ? "Jetzt anziehen" : "Titel anlegen"}</button><button type="button" className="btn" data-gm-close="">Später</button></div></>; }
  }
}

/** Alle Teile einer Kollektion (showInfo) */
function Info({ c }: { c: string }) {
  const G = gami(), A = ANIMALS[c], feat = featuredOf(c, today()), skins = SKINS.filter((s) => s.char === c && s.rar !== "S" && s.rar !== "EV");
  const group = (r: string) => { const pool = poolOf(c, r), sk = pool.filter((i) => !i.icon);
    return <Fragment key={r}><h3 className="gm-ih"><span className={`r-${r}`}>{`${RAR[r]} · ${pct(GACHA.rates[r])}`}</span><span className="small muted">{`${sk.filter((i) => G.owned[i.id]).length}/${sk.length} gefunden · ${r === "SSR" ? `Highlight ${pct(GACHA.rates.SSR * GACHA.featured)}, je anderes ${pct(GACHA.rates.SSR * (1 - GACHA.featured) / (pool.length - 1))}` : `je Teil ${pct(GACHA.rates[r] / pool.length)}`}`}</span></h3><div className="gm-tiles">{sk.map((i) => <Tile key={i.id} it={i} extra={i.id === feat.id ? <span className="gm-tag feat">HIGHLIGHT</span> : null} cls={(G.owned[i.id] ? "" : "locked") + (G.equip[c][i.slot] === i.id ? " eq" : "")} />)}</div></Fragment>; };
  return (
    <div className="gm-info"><div className="row" style={{ justifyContent: "space-between" }}><h2>{A.banner}</h2><button type="button" className="btn small" data-gm-close="">Schließen</button></div>
      <p className="small muted">{`Gesammelt: ${skins.filter((s) => G.owned[s.id]).length}/${skins.length} Skins · Farbig = in deiner Garderobe, grau = noch nicht gefunden, ✓ = angezogen. Pro Slot: 4 Normal, 3 Selten, 2 Episch, 1 Legendär.`}</p>
      {["SSR", "SR", "R", "N"].map(group)}
      <h3 className="gm-ih">Extras <span className="small muted">verbrauchbar, zählen nicht zur Sammlung</span></h3><div className="gm-tiles">{EXTRAS.map((i) => { const n = i.slot === "boost" ? G.boosts[i.id as "xp2"] : 0; return <Tile key={i.id} it={i} extra={n ? <span className="gm-tag">{`×${n}`}</span> : null} cls={n ? "" : "locked"} />; })}</div>
      <h3 className="gm-ih">Regeln</h3><ul className="small muted" style={{ paddingLeft: 18, margin: 0, textAlign: "left" }}><li>{`Episch oder besser spätestens alle ${GACHA.srEvery} Züge.`}</li><li>{`Ab Zug ${GACHA.softPity} steigt die Legendär-Chance um ${GACHA.softStep * 100} Prozentpunkte pro Zug, bei Zug ${GACHA.hardPity} ist es sicher.`}</li><li>{`Jedes Legendär ist zu ${GACHA.featured * 100} % das Wochen-Highlight; sonst ist das nächste garantiert das Highlight.`}</li><li>Zähler pro Kollektion. Mit allen Garantien kommt Legendär im Schnitt etwa alle 47 Züge.</li><li>Federn gibt es nur durchs Lernen – kein Echtgeld.</li></ul></div>
  );
}
