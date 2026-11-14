/**
 * Patch Notes – 1:1 wie rPatch() der Live-App: GitHub-Releases, neueste oben und aufgeklappt. Beim Öffnen frisch geladen
 * (höchstens alle 10 Minuten, Zwischenspeicher tap2coach-patch wie in der Live-App), ohne Netz aus der letzten Kopie.
 * Release-Texte sind Fremddaten und werden nur als Text gerendert (lib/patchnotes.ts).
 */
import { Fragment, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { create } from "zustand";
import { KEY_PN, REPO, pnCmp, pnFmt, pnFromApi, pnMd, pnParseCache, type Block, type Li, type Seg, type Ul } from "@/lib/patchnotes";
import { Ic } from "@/ui-main";

export const Route = createFileRoute("/patchnotes")({ component: PatchNotes });

const pnGet = () => { try { return pnParseCache(localStorage.getItem(KEY_PN)); } catch { return null; } };
const usePN = create<{ busy: boolean; err: string; n: number }>(() => ({ busy: false, err: "", n: 0 }));
async function pnLoad(force = false) {
  const c = pnGet(); if (usePN.getState().busy || (!force && c && Date.now() - c.at < 600000)) return;
  usePN.setState({ busy: true, err: "" });
  let err = "";
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const list = pnFromApi(await r.json());
    try { localStorage.setItem(KEY_PN, JSON.stringify({ at: Date.now(), list })); } catch { /* privat */ }
  } catch { err = navigator.onLine === false ? "Du bist offline – hier steht der zuletzt geladene Stand." : "GitHub ist gerade nicht erreichbar."; }
  usePN.setState((s) => ({ busy: false, err, n: s.n + 1 }));
}

const Inl = ({ segs }: { segs: Seg[] }) => <>{segs.map((x, k) => (x.b ? <b key={k}>{x.t}</b> : x.i ? <i key={k}>{x.t}</i> : <Fragment key={k}>{x.t}</Fragment>))}</>;
const List = ({ u }: { u: Ul }) => <ul>{u.ul.map((x, k) => ("li" in x ? <li key={k}><Inl segs={(x as Li).li} /></li> : <List key={k} u={x as Ul} />))}</ul>;
const Md = ({ blocks }: { blocks: Block[] }) => <>{blocks.map((b, k) => ("h4" in b ? <h4 key={k}><Inl segs={b.h4} /></h4> : "p" in b ? <p key={k}><Inl segs={b.p} /></p> : <List key={k} u={b} />))}</>;

function PatchNotes() {
  const { busy, err } = usePN();
  usePN((s) => s.n); // nach dem Laden neu zeichnen
  const [loaded, setLoaded] = useState(false); // „Lädt …“ bis der erste Ladeversuch dieser Ansicht fertig ist
  useEffect(() => { void pnLoad().then(() => setLoaded(true)); }, []);
  const c = pnGet(), list = c ? c.list.slice().sort(pnCmp) : [];
  return (
    <>
      <section className="card"><h2>Patch Notes</h2><p className="muted">Was sich in der App geändert hat – die neueste Version steht oben. Die Liste kommt direkt aus den <a href={`https://github.com/${REPO}/releases`} target="_blank" rel="noopener">Releases auf GitHub</a>.</p>{err && <p className="small warn-text">{err}</p>}</section>
      {list.length ? (
        <div className="pn-list">{list.map((x, i) => (
          <details key={x.tag + i} className="pn" open={i === 0}><summary><span className="pn-tag">{x.tag}</span>{i === 0 && <span className="pn-new">NEU</span>}<span className="pn-t">{x.name}</span><span className="pn-d">{pnFmt(x.date)}</span><Ic name="down" cls="ic sm chev" /></summary>
            <div className="pn-b"><Md blocks={pnMd(x.body)} /><p><a href={x.url} target="_blank" rel="noopener">Auf GitHub ansehen</a></p></div></details>
        ))}</div>
      ) : <section className="card"><p className="small muted">{busy || !loaded ? "Lädt …" : "Gerade keine Patch Notes verfügbar."}</p></section>}
    </>
  );
}
