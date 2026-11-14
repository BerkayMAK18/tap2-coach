/**
 * Katalog des Belohnungs-Moduls (1:1 aus der Live-App): Schatzkammer-Regeln, Kollektionen, Skins, Extras, Ränge,
 * Login-Kalender, Tagesquests. Skins nur anhängen, nie umbenennen – der Besitz hängt an den IDs (Sync, Rangliste).
 * Event-Shirts kommen aus ALLEN Events (auch abgeschalteten), sonst gingen Besitz und Ausrüstung verloren.
 */
import { ALL_EVENTS } from "@/content/catalog";
import { ANIMALS, CHARS } from "./art";

export const KEY_GAMI = "tap2coach-gami";
export type Rar = "S" | "N" | "R" | "SR" | "SSR" | "EV";
export const GACHA = { name: "Schatzkammer", rates: { SSR: 0.01, SR: 0.10, R: 0.29, N: 0.60 } as Record<string, number>, softPity: 60, softStep: 0.06, hardPity: 80, srEvery: 10, featured: 0.5, cost1: 100, cost10: 900, refund: { N: 10, R: 30, SR: 80, SSR: 250 } as Record<string, number> };
export const RAR: Record<string, string> = { S: "Basis", N: "Normal", R: "Selten", SR: "Episch", SSR: "Legendär", EV: "Event" };
export const RORDER = ["SSR", "SR", "R", "N", "S"];
export type Slot = "hat" | "eye" | "neck" | "bg" | "shirt";
export const SLOTS: [Slot, string][] = [["hat", "Kopf"], ["eye", "Augen"], ["neck", "Hals"], ["bg", "Hintergrund"], ["shirt", "Oberteil"]]; // neue Slots nur hinten anhängen (Reihenfolge = Format in Sync und Rangliste)
export const EV_SHIRTS = ALL_EVENTS.filter((e) => e.reward.kind === "shirt").map((e) => ({ art: String(e.reward.art), name: e.reward.name, ev: e.id }));

// Kollektionen: pro Slot 4 Normal · 3 Selten · 2 Episch · 1 Legendär (+ Basis „ohne“)
export const SETS: Record<string, Record<string, string[][]>> = {
  rabe: { hat: [["party", "cap", "stirnband", "papierhut"], ["muetze", "helm", "kopfhoerer"], ["doktorhut", "zylinder"], ["krone"]],
          eye: [["rund", "halb", "klappe", "funkel"], ["nerd", "herz", "taucher"], ["sonnen", "monokel"], ["visor"]],
          neck: [["fliege", "halstuch", "badge", "perlen"], ["schal", "krawatte", "kamera"], ["medaille", "umhang"], ["hermelin"]],
          bg: [["mint", "lavendel", "pfirsich", "himmel"], ["sonne", "ozean", "wald"], ["nacht", "terminal"], ["gold"]] },
  katze: { hat: [["schleife", "baske", "party", "stirnband"], ["blumenkranz", "muetze", "kopfhoerer"], ["hexenhut", "zauberhut"], ["diadem"]],
          eye: [["rund", "halb", "funkel", "herz"], ["katzenauge", "schlafmaske", "nerd"], ["sonnen", "lupe"], ["kristall"]],
          neck: [["glocke", "fliege", "perlen", "halstuch"], ["schal", "rueschen", "krawatte"], ["medaille", "umhang"], ["sternenumhang"]],
          bg: [["mint", "lavendel", "himmel", "wolle"], ["kissen", "sonne", "herbst"], ["nacht", "rosen"], ["galaxie"]] },
  hund: { hat: [["cap", "stirnband", "papierhut", "bandana"], ["helm", "feuerwehr", "cowboy"], ["pilot", "doktorhut"], ["heldenhelm"]],
          eye: [["rund", "klappe", "halb", "funkel"], ["taucher", "nerd", "sportbrille"], ["flieger", "sonnen"], ["goldbrille"]],
          neck: [["halstuch", "badge", "nieten", "fliege"], ["schal", "krawatte", "pfeife"], ["medaille", "umhang"], ["schaerpe"]],
          bg: [["mint", "pfirsich", "himmel", "lavendel"], ["park", "strand", "wald"], ["nacht", "neon"], ["regenbogen"]] },
  maus: { hat: [["party", "papierhut", "schleife", "cap"], ["detektiv", "muetze", "blumenkranz"], ["ritter", "zauberhut"], ["kaesekrone"]],
          eye: [["rund", "halb", "funkel", "klappe"], ["nerd", "herz", "katzenauge"], ["lupe", "monokel"], ["laser"]],
          neck: [["perlen", "fliege", "halstuch", "glocke"], ["schal", "rueschen", "kamera"], ["medaille", "ritterumhang"], ["goldruestung"]],
          bg: [["mint", "lavendel", "pfirsich", "kaese"], ["wald", "herbst", "kissen"], ["terminal", "nacht"], ["kristallhoehle"]] },
  pinguin: { hat: [["bommel", "ohrenschuetzer", "party", "stirnband"], ["expedition", "muetze", "kopfhoerer"], ["zylinder", "rentiergeweih"], ["eiskrone"]],
          eye: [["rund", "halb", "funkel", "herz"], ["skibrille", "taucher", "nerd"], ["sonnen", "monokel"], ["polarvisor"]],
          neck: [["fliege", "strickschal", "halstuch", "glocke"], ["krawatte", "kamera", "fischkette"], ["medaille", "fellkragen"], ["polarmantel"]],
          bg: [["himmel", "mint", "lavendel", "schnee"], ["eisberg", "iglu", "ozean"], ["polarlicht", "tiefsee"], ["eispalast"]] }
};
export const NAMES: Record<string, string> = {
  zylinder: "Zylinder", party: "Partyhut", cap: "Schirmmütze", stirnband: "Stirnband", papierhut: "Papierhut", muetze: "Wollmütze", helm: "Bauhelm", kopfhoerer: "Kopfhörer", doktorhut: "Absolventenhut", zauberhut: "Zauberhut", krone: "Krone",
  schleife: "Haarschleife", baske: "Baskenmütze", blumenkranz: "Blumenkranz", hexenhut: "Hexenhut", diadem: "Diadem", bandana: "Bandana", feuerwehr: "Feuerwehrhelm", cowboy: "Cowboyhut", pilot: "Fliegerhaube", heldenhelm: "Heldenhelm",
  detektiv: "Detektivmütze", ritter: "Ritterhelm", kaesekrone: "Käsekrone", strohhut: "Strohhut", kapitaen: "Kapitänsmütze", piratenhut: "Piratenhut", dreizackkrone: "Dreizackkrone",
  monokel: "Monokel", rund: "Runde Brille", halb: "Lesebrille", klappe: "Augenklappe", funkel: "Funkelauge", nerd: "Nerdbrille", herz: "Herzbrille", taucher: "Taucherbrille", sonnen: "Sonnenbrille", lupe: "Detektivlupe", visor: "Cyber-Visor",
  katzenauge: "Katzenaugenbrille", schlafmaske: "Schlafmaske", kristall: "Kristallbrille", sportbrille: "Sportbrille", flieger: "Fliegerbrille", goldbrille: "Goldene Pilotenbrille", schnorchel: "Schnorchelbrille", laser: "Laserblick",
  fliege: "Fliege", halstuch: "Halstuch", badge: "Azubi-Ausweis", perlen: "Perlenkette", schal: "Schal", krawatte: "Krawatte", kamera: "Kamera", medaille: "Medaille", umhang: "Heldenumhang", hermelin: "Königsmantel",
  glocke: "Glöckchen", rueschen: "Rüschenkragen", sternenumhang: "Sternenumhang", nieten: "Nietenhalsband", pfeife: "Trillerpfeife", schaerpe: "Meisterschärpe", ritterumhang: "Ritterumhang", goldruestung: "Goldrüstung",
  lei: "Blumenkette", rettungsring: "Rettungsring", muschelkette: "Muschelkette", schatzkette: "Schatzkette",
  tuerkis: "Türkis", rosa: "Rosa", sand: "Sand", grau: "Grau", meer: "Meerblau", mint: "Mint", lavendel: "Lavendel", pfirsich: "Pfirsich", himmel: "Himmel", wolle: "Wollknäuel", kaese: "Käse",
  sonne: "Abendrot", ozean: "Ozean", wald: "Wald", kissen: "Kissen", herbst: "Herbstlaub", park: "Park", strand: "Strand", nacht: "Sternennacht", terminal: "Terminal", rosen: "Rosen", neon: "Neon", riff: "Korallenriff", tiefsee: "Tiefsee",
  bommel: "Bommelmütze", ohrenschuetzer: "Ohrenschützer", expedition: "Polarmütze", rentiergeweih: "Rentiergeweih", eiskrone: "Eiskrone", skibrille: "Skibrille", polarvisor: "Polarlicht-Visor",
  strickschal: "Strickschal", fischkette: "Fischkette", fellkragen: "Fellkragen", polarmantel: "Polarmantel", eisblau: "Eisblau", schnee: "Schneeflocken", eisberg: "Eisberg", iglu: "Iglu", polarlicht: "Polarlicht", eispalast: "Eispalast",
  gold: "Goldglanz", galaxie: "Galaxie", regenbogen: "Regenbogen", kristallhoehle: "Kristallhöhle", perlmutt: "Perlmutt"
};
/** Skin (char/art), Extra (icon/desc) – ein gemeinsamer Typ wie in der Live-App */
export type Item = { id: string; slot: string; rar: Rar; name: string; char?: string; art?: string; ev?: string; icon?: string; desc?: string };
export const SKINS: Item[] = [];
CHARS.forEach((c) => SLOTS.forEach(([slot]) => {
  if (slot === "shirt") { SKINS.push({ id: `${c}-ohne-shirt`, char: c, slot, rar: "S", art: "", name: "Ohne" }); EV_SHIRTS.forEach((s) => SKINS.push({ id: `${c}-${s.art}`, char: c, slot, rar: "EV", art: s.art, name: s.name, ev: s.ev })); return; } // nur aus Events, nie in der Schatzkammer
  if (slot === "bg") SKINS.push({ id: `${c}-basis-bg`, char: c, slot, rar: "S", art: ANIMALS[c].base, name: NAMES[ANIMALS[c].base] });
  else SKINS.push({ id: `${c}-ohne-${slot}`, char: c, slot, rar: "S", art: "", name: "Ohne" });
  (["N", "R", "SR", "SSR"] as Rar[]).forEach((r, k) => SETS[c][slot][k].forEach((art) => SKINS.push({ id: `${c}-${art}`, char: c, slot, rar: r, art, name: NAMES[art] })));
}));
export const EXTRAS: Item[] = [
  { id: "buendel", slot: "cur", rar: "N", name: "Federbündel", icon: "🪶", desc: "+30 Federn" },
  { id: "xp2", slot: "boost", rar: "R", name: "XP-Trank", icon: "🧪", desc: "Doppelte XP für 10 Fragen" },
  { id: "shield", slot: "boost", rar: "SR", name: "Serien-Schild", icon: "🛡️", desc: "Rettet die Serie bei einem Fehler" }
];
export const ITEMS = SKINS.concat(EXTRAS);
/** Wie in der Live-App ein einfaches Objekt (Object.fromEntries) – gleiche Nachschlage-Regeln */
export const IT: Record<string, Item | undefined> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
export type Equip = Record<string, string>;
export const baseEquip = (c: string): Equip => ({ hat: `${c}-ohne-hat`, eye: `${c}-ohne-eye`, neck: `${c}-ohne-neck`, bg: `${c}-basis-bg`, shirt: `${c}-ohne-shirt` });

export const RANKS: [number, string][] = [[1, "Neuling"], [3, "Azubi"], [6, "Geselle"], [10, "Gelehrter"], [15, "Prüfungsprofi"], [20, "Großmeister"]];
export type CalDay = { f?: number; t?: number; b?: string };
export const CAL: CalDay[] = [{ f: 50 }, { f: 80 }, { t: 1 }, { f: 100 }, { b: "xp2" }, { f: 150 }, { t: 3 }];
/** Tageszähler (G.today) */
export type Today = { day: string; answered: number; correct: number; maxCombo: number; sowi: number; t2: number; green: number; fixed: number; fresh: number; [k: string]: string | number };
export type Quest = { id: string; txt: string; goal: number; key?: string; f: number; xp: number; calc?: (t: Today) => number; note?: (t: Today) => string };
// Täglich 5 aus 10. Gezählt werden nur sicher richtige Antworten – keine Quest belohnt Fehler.
export const QN = 5;
export const QPOOL: Quest[] = [
  { id: "ans40", txt: "Beantworte 40 Fragen", goal: 40, key: "answered", f: 150, xp: 60 },
  { id: "sure25", txt: "Gib 25 sicher richtige Antworten", goal: 25, key: "correct", f: 180, xp: 70 },
  { id: "combo12", txt: "Schaffe eine 12er-Serie", goal: 12, key: "maxCombo", f: 220, xp: 90 },
  { id: "combo20", txt: "Schaffe eine 20er-Serie", goal: 20, key: "maxCombo", f: 350, xp: 140 },
  { id: "acc85", txt: "Mindestens 85 % sicher richtig (ab 30 Antworten)", goal: 30, f: 220, xp: 90, calc: (t) => (t.answered >= 30 && t.correct / t.answered >= 0.85 ? 30 : Math.min(29, t.answered)), note: (t) => (t.answered ? ` · aktuell ${Math.round(t.correct / t.answered * 100)} %` : "") },
  { id: "sowi10", txt: "Beantworte 10 SoWi-Fragen", goal: 10, key: "sowi", f: 150, xp: 60 },
  { id: "t2_15", txt: "Beantworte 15 Fragen aus Teil 2", goal: 15, key: "t2", f: 150, xp: 60 },
  { id: "green8", txt: "Bringe 8 Fragen auf Grün", goal: 8, key: "green", f: 220, xp: 90 },
  { id: "fix5", txt: "Beantworte 5 rote Fragen sicher richtig", goal: 5, key: "fixed", f: 200, xp: 80 },
  { id: "new15", txt: "Beantworte 15 neue Fragen", goal: 15, key: "fresh", f: 150, xp: 60 }
];
export const need = (l: number) => 80 + l * 40;
export const rank = (l: number) => RANKS.filter(([n]) => l >= n).pop()![1];
export const mult = (c: number) => (c >= 10 ? 3 : c >= 6 ? 2 : c >= 3 ? 1.5 : 1);
export const fmtM = (m: number) => "×" + String(m).replace(".", ",");
export const pct = (x: number) => (x * 100).toLocaleString("de", { maximumFractionDigits: 2 }) + " %";
export const hash = (s: string) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
