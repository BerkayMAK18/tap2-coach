/**
 * Seite Belohnungen – 1:1 wie viewHTML() der Live-App: Kopf (Figur, Level, XP, Federn, Tickets, Serie), Reiter
 * Quests (Tagesquests, Tagestruhe, Login-Kalender, XP-Regeln), Schatzkammer (Kollektion, Highlight, Pity, Chancen) und
 * Garderobe (Figur, Titel, Boosts, Slots). Gleiche Klassen, Texte und data-Attribute; Bedienung über React-Handler.
 */
import { Link } from "@tanstack/react-router";
import { today } from "@/lib/dates";
import { ANIMALS, CHARS } from "@/lib/gami/art";
import { daysToMonday, featuredOf, pityOf, poolOf, qprog, questOf, ssrChance } from "@/lib/gami/core";
import { CAL, GACHA, IT, RAR, RORDER, SKINS, SLOTS, need, pct, type CalDay } from "@/lib/gami/items";
import { lbGet } from "@/lib/gami/lb";
import type { GState } from "@/lib/gami/state";
import { TI, TITLES } from "@/lib/gami/titles";
import { act, gami, useGami, viewPrep } from "@/store/gami";
import { Bar, Fig, Tile } from "./bits";

const SB = { justifyContent: "space-between" } as const;

export function Belohnungen() {
  useGami((s) => s.n);
  viewPrep(); // wie viewHTML: Tag weiterschalten und Titel prüfen bei jedem Zeichnen
  const G = gami();
  const tabs: [string, string][] = [["quests", "Quests"], ["schatz", GACHA.name], ["garderobe", "Garderobe"]];
  return (
    <>
      <div className="gm-head card"><div className="gm-ava"><Fig c={G.char} eq={G.equip[G.char]} /></div><div className="gm-lvl"><div className="row" style={{ gap: 8, alignItems: "baseline" }}><b className="gm-lv">Level {G.level}</b>{G.title && TI[G.title] ? <span className="muted small">«{TI[G.title]!.name}»</span> : null}<span className="spacer" /><span className="small muted num">{`${G.xp}/${need(G.level)} XP`}</span></div><Bar w={G.xp / need(G.level) * 100} /></div><div className="gm-cur"><span className="chip">🪶 {G.federn}</span><span className="chip">🎟️ {G.tickets}</span><span className="chip">🔥 {G.loginStreak}</span></div></div>
      <div className="tabs-in gm-tabs" role="tablist">{tabs.map(([k, l]) => <button key={k} type="button" role="tab" className={G.tab === k ? "on" : ""} aria-selected={G.tab === k} data-gm-tab={k} onClick={() => act.tab(k)}>{l}</button>)}</div>
      <div className="gm-body">{G.tab === "schatz" ? <Schatz G={G} /> : G.tab === "garderobe" ? <Garderobe G={G} /> : <Quests G={G} />}</div>
    </>
  );
}

// ---- Login-Kalender (calHTML)
const CalLabel = ({ r }: { r: CalDay }) => (r.f ? <><b>🪶</b>{r.f}</> : r.t ? <><b>🎟️</b>{`${r.t}× Ticket`}</> : <><b>{IT[r.b!]!.icon}</b>{IT[r.b!]!.name}</>);
export const Cal = ({ done, now }: { done: number; now: number }) => (
  <div className="gm-cal">{CAL.map((r, i) => <div key={i} className={`${i < done ? "done" : ""} ${i === now ? "now" : ""} ${i === 6 ? "big" : ""}`}>{`Tag ${i + 1}`}<CalLabel r={r} /></div>)}</div>
);

function Quests({ G }: { G: GState }) {
  const Q = G.quests!, qs = Q.ids.map(questOf), all = Q.claimed.length === Q.ids.length, open = G.loginClaimed !== today();
  return (
    <>
      <section className="card"><div className="row" style={SB}><h3>Tagesquests</h3><span className="small muted">neu um Mitternacht</span></div>
        {qs.map((q) => { const p = qprog(G, q), done = Q.claimed.includes(q.id); return <div key={q.id} className="gm-quest"><div><b>{q.txt}</b><Bar w={p / q.goal * 100} /><div className="small muted">{`${p}/${q.goal}${q.note ? q.note(G.today!) : ""} · ${q.f} 🪶 + ${q.xp} XP`}</div></div><button type="button" className={`btn small ${p >= q.goal && !done ? "primary" : ""}`} data-gm-claim={q.id} disabled={p < q.goal || done} onClick={() => act.claim(q.id)}>{done ? "✓ Erledigt" : "Abholen"}</button></div>; })}
        <div className="gm-quest"><div><b>🎁 Tagestruhe</b><div className="small muted">Alle fünf Quests abholen · 300 🪶 + 2 🎟️</div></div><button type="button" className={`btn small ${all && !Q.chest ? "primary" : ""}`} data-gm-chest="" disabled={!all || Q.chest} onClick={act.chest}>{Q.chest ? "✓ Geöffnet" : "Öffnen"}</button></div></section>
      <section className="card"><div className="row" style={SB}><h3>Login-Kalender <span className="small muted">· Runde {G.calRound}</span></h3><span className="chip">{`🔥 ${G.loginStreak} ${G.loginStreak === 1 ? "Tag" : "Tage"}`}</span></div>
        <p className="small muted">Jeder Login-Tag rückt ein Feld weiter. Nach Tag 7 beginnt die nächste Runde mit denselben Belohnungen. Ein ausgelassener Tag setzt nur die 🔥-Serie zurück.</p>
        <Cal done={G.calIdx} now={open ? G.calIdx : -1} />{open ? <div className="row" style={{ marginTop: 12 }}><button type="button" className="btn primary" data-gm-showlogin="" onClick={act.showLogin}>Heutigen Bonus abholen</button></div> : null}</section>
      <section className="card"><h3>So bekommst du XP</h3><p className="small muted">Jede sicher richtige Antwort in einer Lernrunde: 10 XP und 5 🪶. „Unsicher“ oder „Geraten“ gibt nichts. Serie: 3 sicher richtig in Folge ×1,5 · 6 ×2 · 10 ×3. Ein Fehler, „unsicher“ oder „geraten“ beendet die Serie (außer mit Serien-Schild). Neue Level bringen 100 🪶, alle 5 Level ein Ticket.</p></section>
    </>
  );
}

/** Auswahl der Kollektion/Figur (charSel) */
function CharSel({ attr, cur, label, G, on }: { attr: "banner" | "char"; cur: string; label: (c: string) => string; G: GState; on: (c: string) => void }) {
  return <div className="gm-sel">{CHARS.map((c) => <button key={c} type="button" className="gm-bsel" {...{ [`data-gm-${attr}`]: c }} aria-pressed={c === cur} onClick={() => on(c)}><span className="gm-mini"><Fig c={c} eq={G.equip[c]} /></span>{label(c)}</button>)}</div>;
}

function Schatz({ G }: { G: GState }) {
  const day = today(), c = G.banner, A = ANIMALS[c], P = pityOf(G, c), feat = featuredOf(c, day); // pityOf legt den Zähler an (wie die Live-App)
  const can1 = G.tickets >= 1 || G.federn >= GACHA.cost1, can10 = G.tickets >= 10 || G.federn >= GACHA.cost10, toSR = GACHA.srEvery - P.sr, toSSR = GACHA.hardPity - P.ssr, skins = SKINS.filter((s) => s.char === c && s.rar !== "S" && s.rar !== "EV"), dm = daysToMonday(day);
  return (
    <>
      <CharSel attr="banner" cur={c} label={(x) => ANIMALS[x].banner} G={G} on={act.banner} />
      <section className="card gm-banner"><span className="gm-kicker">{`${GACHA.name.toUpperCase()} · ${A.banner.toUpperCase()}`}</span>
        <div className="gm-bgrid"><div><Tile it={feat} extra={G.owned[feat.id] ? <span className="gm-tag">IM BESITZ</span> : <span className="gm-tag dup">NOCH NICHT</span>} /></div>
          <div><span className="gm-rateup">WOCHEN-HIGHLIGHT</span><h2>{feat.name}</h2><p className="small gm-soft">{`50 % aller Legendären sind dieses Teil. Wechselt in ${dm} ${dm === 1 ? "Tag" : "Tagen"}. Gesammelt: ${skins.filter((s) => G.owned[s.id]).length}/${skins.length}.`}</p>{P.guar ? <p className="small" style={{ color: "#F7C948", fontWeight: 700 }}>Dein nächstes Legendär ist garantiert das Highlight.</p> : null}</div></div>
        <div className="row"><button type="button" className="btn gm-gold" data-gm-pull="1" disabled={!can1} onClick={() => act.pull(1)}>{`1× öffnen · ${G.tickets >= 1 ? "1 🎟️" : GACHA.cost1 + " 🪶"}`}</button><button type="button" className="btn gm-gold" data-gm-pull="10" disabled={!can10} onClick={() => act.pull(10)}>{`10× öffnen · ${G.tickets >= 10 ? "10 🎟️" : GACHA.cost10 + " 🪶"}`}</button></div>
        <div className="gm-pity"><div className="row" style={SB}><span>Legendär spätestens in <b>{toSSR}</b> Zügen</span><span className="gm-soft">{`nächster Zug: ${pct(ssrChance(P.ssr + 1))}`}</span></div><Bar w={P.ssr / GACHA.hardPity * 100} /><span>Episch oder besser spätestens in <b>{toSR}</b> {toSR === 1 ? "Zug" : "Zügen"}</span><Bar cls="sr" w={P.sr / GACHA.srEvery * 100} /></div></section>
      <section className="card"><div className="row" style={SB}><h3>Chancen</h3><button type="button" className="gm-q" data-gm-info={c} aria-label="Alle Teile dieser Kollektion anzeigen" title="Alle Teile dieser Kollektion" onClick={() => act.info(c)}>?</button></div>
        <table className="gm-rates"><tbody><tr><th>Seltenheit</th><th>Chance</th><th>Skins</th></tr>{["SSR", "SR", "R", "N"].map((r) => { const p = poolOf(c, r).filter((i) => !i.icon); return <tr key={r}><td className={`r-${r}`}><b>{RAR[r]}</b></td><td>{pct(GACHA.rates[r])}</td><td>{`${p.filter((i) => G.owned[i.id]).length}/${p.length} gefunden`}</td></tr>; })}</tbody></table>
        <p className="small muted">Tippe auf „?“, um alle Teile dieser Kollektion zu sehen. Federn gibt es nur durchs Lernen.</p></section>
    </>
  );
}

function Titles({ G }: { G: GState }) {
  const have = TITLES.filter((t) => G.titles[t.id]).length;
  return (
    <section className="card"><div className="row" style={SB}><h3>Titel</h3><span className="small muted">{`${have}/${TITLES.length}`}</span></div><p className="small muted">Dein Titel steht in der Rangliste unter deinem Namen. Grau = noch nicht freigeschaltet, darunter steht, wie du ihn bekommst.</p>
      <div className="gm-titles"><button type="button" className={`gm-ttl ${G.title ? "" : "on"}`} data-gm-title="" onClick={() => act.title("")}><b>Kein Titel</b><span>Es wird kein Titel angezeigt</span></button>{TITLES.map((t) => { const own = !!G.titles[t.id]; return <button key={t.id} type="button" className={`gm-ttl ${own ? "" : "locked"} ${G.title === t.id ? "on" : ""} ${t.ev ? "ev" : ""}`} data-gm-title={t.id} disabled={!own} onClick={() => act.title(t.id)}><b>{t.name}</b><span>{t.how}</span>{t.ev ? <i className="gm-tag ev">EVENT</i> : null}</button>; })}</div></section>
  );
}

function Garderobe({ G }: { G: GState }) {
  const c = G.char, eq = G.equip[c], skins = SKINS.filter((s) => s.char === c && s.rar !== "S" && s.rar !== "EV");
  const lb = lbGet(), nick = lb.joined && lb.name ? String(lb.name) : "";
  return (
    <>
      <CharSel attr="char" cur={c} label={(x) => ANIMALS[x].name} G={G} on={act.char} />
      <section className="card" style={{ textAlign: "center" }}><div className="gm-ava-big"><Fig c={c} eq={eq} /></div><h2 className="gm-figname" style={{ marginTop: 12 }}>{nick || ANIMALS[c].name}</h2>{G.title && TI[G.title] ? <p className="gm-title-big gm-figsub">«{TI[G.title]!.name}»</p> : null}<p className="small muted">{`${nick ? ANIMALS[c].name + " · " : ""}Level ${G.level} · Sammlung ${skins.filter((i) => G.owned[i.id]).length}/${skins.length}`}{nick ? null : <>{" · "}<Link to="/rangliste">Spitznamen wählen</Link></>}</p></section>
      <Titles G={G} />
      <section className="card"><h3>Boosts</h3><div className="gm-tiles">{["xp2", "shield"].map((id) => { const it = IT[id]!, n = G.boosts[id as "xp2"], on = id === "xp2" ? G.xp2Left > 0 : G.shieldOn; return <div key={id} className={`gm-tile r-${it.rar} ${n || on ? "" : "locked"}`}><div className="gm-icon">{it.icon}</div><div className="gm-nm">{`${it.name} ×${n}`}</div><div className="small muted">{it.desc}</div><button type="button" className="btn small" data-gm-use={id} disabled={!n || on} onClick={() => act.use(id)}>{on ? "aktiv" : "Benutzen"}</button></div>; })}</div></section>
      {SLOTS.map(([slot, label]) => {
        const list = SKINS.filter((i) => i.char === c && i.slot === slot).sort((a, b) => RORDER.indexOf(b.rar) - RORDER.indexOf(a.rar));
        return (
          <section key={slot} className="card"><div className="row" style={SB}><h3>{label}</h3><span className="small muted">{`${list.filter((i) => i.rar !== "S" && G.owned[i.id]).length}/${list.length - 1}`}</span></div><div className="gm-tiles">{list.map((i) => <button key={i.id} type="button" className="gm-tbtn" data-gm-eq={i.id} disabled={!G.owned[i.id]} title={G.owned[i.id] ? "Anziehen" : i.ev ? "Nur als Event-Belohnung erhältlich" : "Noch nicht gefunden"} onClick={() => act.equip(i.id)}><Tile it={i} extra={i.ev ? <span className="gm-tag ev">EVENT</span> : null} cls={(G.owned[i.id] ? "" : "locked") + (eq[slot] === i.id ? " eq" : "")} /></button>)}</div></section>
        );
      })}
    </>
  );
}
