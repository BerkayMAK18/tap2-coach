// @ts-nocheck
/*
 * Belohnungs-Modul (XP, Level, Quests, Login-Kalender, Schatzkammer/Gacha, Garderobe, Titel, Event-Belohnungen,
 * Bestenliste) – ORIGINAL aus der Live-App (index.html, main), unverändert übernommen.
 *
 * Warum unverändert: Live-App und Dev-App teilen Sync (tap2_sync) und Rangliste (tap2_lb). Gleiche Regeln, gleiche IDs
 * und gleiches Speicherformat (tap2coach-gami, pack/merge) sind Pflicht, sonst widersprechen sich die Apps.
 * Änderungen an Regeln deshalb nur zusammen mit der Live-App.
 *
 * Einbettung: Die Abhängigkeiten aus der Live-App kommen über `env` (siehe src/legacy/gami-env.ts). Einzige
 * Änderungen am Text: S/UI/view werden über env gelesen (env.S(), env.UI(), env.view()).
 * Quelle aktualisieren: Abschnitt „Belohnungen (XP, Level …)“ bis „App-Anbindung“ aus index.html kopieren.
 */
export function createGami(env) {
  const { esc, render, num, today, rpc, syncSoon, syncConf, syncGet, hexOf, TP, QMAP, sha, plain, isObj, dayStr, EVENTS, topicQ, st, mapObj, keyRaw, hud, daysBetween, counts, allQ, TOPICS } = env;

  const KEY_GAMI = "tap2coach-gami";
  const GACHA = { name: "Schatzkammer", rates: { SSR: 0.01, SR: 0.10, R: 0.29, N: 0.60 }, softPity: 60, softStep: 0.06, hardPity: 80, srEvery: 10, featured: 0.5, cost1: 100, cost10: 900, refund: { N: 10, R: 30, SR: 80, SSR: 250 } };
  const RAR = { S: "Basis", N: "Normal", R: "Selten", SR: "Episch", SSR: "Legendär", EV: "Event" };
  const RORDER = ["SSR", "SR", "R", "N", "S"];
  const SLOTS = [["hat", "Kopf"], ["eye", "Augen"], ["neck", "Hals"], ["bg", "Hintergrund"], ["shirt", "Oberteil"]]; // neue Slots nur hinten anhängen (Reihenfolge = Format in Sync und Rangliste)
  // ================= Zeichnungen
  // Alle Accessoires sind im Koordinatensystem des Raben gezeichnet (Kopf-Anker 268/150, Auge 240/222, Hals 260/310)
  // und werden pro Tier über Anker verschoben/skaliert.
  const arc = (n, f) => { let s = ""; for (let i = 0; i <= n; i++) { const t = i / n, x = (1 - t) * (1 - t) * 198 + 2 * (1 - t) * t * 262 + t * t * 326, y = (1 - t) * (1 - t) * 298 + 2 * (1 - t) * t * 356 + t * t * 296; s += f(x.toFixed(1), y.toFixed(1), i); } return s; };
  const cape = (a, b, clasp) => `<path d="M192 302 C150 362 140 420 124 470 L170 470 C178 410 198 352 226 314 Z M330 298 C382 352 410 420 420 470 L380 470 C368 410 346 352 300 314 Z" fill="${a}"/><path d="M198 298 C232 318 294 316 326 292 L330 306 C296 332 228 334 194 312 Z" fill="${b}"/>${clasp}`;
  const solid = (c) => () => `<rect width="512" height="512" fill="${c}"/><circle cx="430" cy="80" r="90" fill="#fff" opacity=".18"/><circle cx="60" cy="440" r="120" fill="#fff" opacity=".12"/>`;
  const grad = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="512" height="512" fill="url(#${id})"/>`;
  const star = (x, y, r, c) => `<path d="M${x} ${y - r} L${x + r * .3} ${y - r * .3} L${x + r} ${y} L${x + r * .3} ${y + r * .3} L${x} ${y + r} L${x - r * .3} ${y + r * .3} L${x - r} ${y} L${x - r * .3} ${y - r * .3} Z" fill="${c}"/>`;

  const HAT = {
    zylinder: `<rect x="176" y="148" width="184" height="22" rx="11" fill="#08312A"/><rect x="206" y="38" width="124" height="120" rx="10" fill="#08312A"/><rect x="206" y="122" width="124" height="24" fill="#FFD03D"/>`,
    party: `<path d="M214 160 L276 24 L330 156 Z" fill="#E2468A"/><path d="M236 112 L304 104 M252 76 L292 72" stroke="#FFD03D" stroke-width="10" stroke-linecap="round"/><circle cx="276" cy="24" r="16" fill="#FFD03D"/>`,
    cap: `<path d="M196 164 C194 92 342 92 340 164 Z" fill="#D8453B"/><path d="M204 158 C162 150 126 160 104 176 C150 182 190 176 214 168 Z" fill="#A9302A"/><circle cx="268" cy="100" r="9" fill="#A9302A"/>`,
    stirnband: `<path d="M182 190 C220 172 316 168 352 184 L354 210 C316 194 222 198 180 216 Z" fill="#F2B21B"/><path d="M350 192 l34 -18 l-4 30 z M350 200 l36 14 l-24 16 z" fill="#E09E00"/>`,
    papierhut: `<path d="M190 168 L268 64 L346 168 Z" fill="#F6F5F3" stroke="#B9C4C8" stroke-width="5" stroke-linejoin="round"/><rect x="176" y="160" width="184" height="24" rx="4" fill="#E3E9EB" stroke="#B9C4C8" stroke-width="4"/><path d="M236 128 h60 M248 104 h36" stroke="#9AA7AE" stroke-width="4"/>`,
    muetze: `<path d="M192 164 C188 70 348 70 344 164 Z" fill="#2F6FDB"/><rect x="186" y="144" width="164" height="30" rx="12" fill="#1E4FA8"/><circle cx="268" cy="66" r="20" fill="#F6F5F3"/>`,
    helm: `<path d="M190 162 C186 72 350 72 346 162 Z" fill="#FFC21A"/><rect x="168" y="150" width="200" height="20" rx="10" fill="#E09E00"/><rect x="256" y="78" width="24" height="76" rx="8" fill="#E09E00"/>`,
    kopfhoerer: `<path d="M204 178 C200 84 340 84 336 178" fill="none" stroke="#2B2D42" stroke-width="16" stroke-linecap="round"/><rect x="316" y="160" width="44" height="70" rx="18" fill="#3B8CF0" stroke="#2B2D42" stroke-width="6"/>`,
    doktorhut: `<path d="M200 168 L200 136 C230 118 306 118 336 136 L336 168 Z" fill="#14202A"/><path d="M268 76 L392 118 L268 158 L144 118 Z" fill="#22323F"/><path d="M268 117 L372 124 L374 190" stroke="#FFD03D" stroke-width="7" fill="none"/><path d="M366 186 h16 l-4 30 h-8 z" fill="#FFD03D"/>`,
    zauberhut: `<path d="M192 166 L262 22 Q270 8 280 22 L344 166 Z" fill="#4B2A9A"/><path d="M168 158 Q268 188 368 158 L368 174 Q268 204 168 174 Z" fill="#3A1F7A"/>${star(268, 106, 16, "#FFD03D")}<circle cx="300" cy="134" r="6" fill="#FFD03D"/><circle cx="240" cy="62" r="5" fill="#FFD03D"/>`,
    krone: `<path d="M196 170 L186 78 L232 120 L268 58 L304 120 L350 78 L340 170 Z" fill="#FFD03D" stroke="#C99400" stroke-width="7" stroke-linejoin="round"/><circle cx="268" cy="138" r="12" fill="#E2468A"/><circle cx="222" cy="150" r="9" fill="#3BB4F2"/><circle cx="314" cy="150" r="9" fill="#3BB4F2"/>`,
    schleife: `<path d="M268 128 L210 92 C196 86 186 98 190 112 L200 152 Z M268 128 L326 92 C340 86 350 98 346 112 L336 152 Z" fill="#FF5C8A"/><path d="M214 108 L244 126 M322 108 L292 126" stroke="#E23D6E" stroke-width="5" stroke-linecap="round"/><circle cx="268" cy="130" r="17" fill="#E23D6E"/>`,
    baske: `<path d="M184 162 C168 120 220 90 280 94 C344 98 374 132 350 164 Z" fill="#C0243A"/><rect x="194" y="152" width="150" height="16" rx="8" fill="#9A1B2E"/><path d="M276 96 l4 -20" stroke="#9A1B2E" stroke-width="7" stroke-linecap="round"/>`,
    blumenkranz: `<path d="M182 168 C220 150 316 148 354 164" stroke="#3E8E4E" stroke-width="10" fill="none" stroke-linecap="round"/>` + [[194, 164, "#FF7AB6"], [222, 154, "#FFD03D"], [250, 150, "#FF8A3D"], [278, 149, "#FF7AB6"], [306, 152, "#FFD03D"], [334, 158, "#B57CF2"]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="15" fill="${c}"/><circle cx="${x}" cy="${y}" r="5" fill="#FFF3C4"/>`).join(""),
    hexenhut: `<path d="M196 164 L250 60 Q264 30 304 40 Q280 54 286 76 L340 164 Z" fill="#1E1A2E"/><path d="M168 158 Q268 186 368 158 L368 174 Q268 202 168 174 Z" fill="#14111F"/><rect x="216" y="134" width="112" height="18" fill="#8E44AD"/><rect x="258" y="132" width="22" height="22" fill="none" stroke="#FFD03D" stroke-width="5"/>`,
    diadem: `<path d="M200 170 L216 128 L238 150 L268 86 L298 150 L320 128 L336 170 Z" fill="#E8EEF5" stroke="#9FB0C2" stroke-width="5" stroke-linejoin="round"/><path d="M268 106 l11 20 -11 20 -11 -20z" fill="#4FC3F7"/><circle cx="216" cy="144" r="7" fill="#FF7AB6"/><circle cx="320" cy="144" r="7" fill="#FF7AB6"/>${star(300, 92, 12, "#FFFFFF")}`,
    bandana: `<path d="M190 168 C188 102 348 102 346 168 Z" fill="#D8453B"/>` + [[220, 140], [252, 122], [286, 122], [316, 140], [236, 156], [300, 156], [268, 146]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff"/>`).join("") + `<path d="M344 150 l36 -8 -10 22 z M344 158 l32 22 -28 6z" fill="#B8352D"/>`,
    feuerwehr: `<path d="M192 164 C188 80 348 80 344 164 Z" fill="#D62828"/><path d="M160 158 L376 158 C380 172 370 180 352 178 L184 178 C166 180 156 172 160 158Z" fill="#A11616"/><path d="M226 106 l28 -6 4 52 -28 4z" fill="#FFD03D" stroke="#C99400" stroke-width="3"/><path d="M290 86 C310 100 320 124 322 158" stroke="#A11616" stroke-width="10" fill="none"/>`,
    cowboy: `<path d="M146 156 C170 178 366 178 390 150 C396 174 362 194 268 194 C174 194 136 178 146 156 Z" fill="#8B5A2B"/><path d="M204 164 C200 110 216 82 246 90 C258 94 262 104 268 104 C274 104 280 94 292 90 C322 82 338 110 334 164 Z" fill="#A0693A"/><rect x="204" y="146" width="130" height="14" fill="#5B3A1A"/>`,
    pilot: `<path d="M190 178 C184 92 352 92 346 178 Z" fill="#7A4A26"/><path d="M330 150 C354 170 358 208 340 234 L320 230 C326 206 322 176 310 160Z" fill="#6A3E1E"/><rect x="198" y="136" width="136" height="14" rx="7" fill="#3B2410"/><circle cx="234" cy="142" r="20" fill="#9ED8F0" stroke="#C99400" stroke-width="7"/><circle cx="292" cy="140" r="20" fill="#9ED8F0" stroke="#C99400" stroke-width="7"/>`,
    heldenhelm: `<path d="M196 142 C150 122 130 84 148 56 C170 88 190 104 212 116 Z M340 142 C386 122 406 84 388 56 C366 88 346 104 324 116 Z" fill="#FFFFFF" stroke="#C9D6E0" stroke-width="4"/><path d="M194 170 C190 82 346 82 342 170 Z" fill="#F7C948" stroke="#C99400" stroke-width="6"/><path d="M268 90 v80" stroke="#C99400" stroke-width="8"/><circle cx="268" cy="124" r="13" fill="#E2468A" stroke="#C99400" stroke-width="3"/>`,
    detektiv: `<path d="M194 168 C190 92 346 92 342 168 Z" fill="#9C7A54"/><path d="M220 110 V166 M254 98 V166 M288 98 V166 M318 110 V166 M196 132 H340" stroke="#6B4F33" stroke-width="4" opacity=".7"/><path d="M198 160 C170 158 148 168 136 180 C168 186 196 182 212 174 Z M338 160 C366 158 388 168 400 180 C368 186 340 182 324 174Z" fill="#7E6040"/><circle cx="268" cy="94" r="8" fill="#6B4F33"/>`,
    ritter: `<path d="M268 74 C300 40 334 58 324 92 C312 74 292 72 280 88Z" fill="#D8453B"/><path d="M192 188 C186 84 350 84 344 188 Z" fill="#B7C3CC" stroke="#7D8A94" stroke-width="6"/><rect x="198" y="170" width="140" height="18" rx="4" fill="#7D8A94"/><path d="M222 132 h92" stroke="#4A555D" stroke-width="8" stroke-linecap="round"/><path d="M268 96 v32" stroke="#7D8A94" stroke-width="6"/>`,
    kaesekrone: `<path d="M196 170 L186 80 L230 120 L268 60 L306 120 L350 80 L340 170 Z" fill="#FFD54F" stroke="#E0A800" stroke-width="7" stroke-linejoin="round"/><circle cx="232" cy="148" r="9" fill="#E0A800"/><circle cx="272" cy="128" r="12" fill="#E0A800"/><circle cx="308" cy="152" r="7" fill="#E0A800"/><circle cx="252" cy="160" r="5" fill="#E0A800"/><circle cx="268" cy="60" r="10" fill="#FF8A3D"/>`,
    strohhut: `<ellipse cx="268" cy="164" rx="124" ry="22" fill="#E9C46A"/><path d="M206 164 C204 110 332 110 330 164 Z" fill="#F2D27A"/><rect x="206" y="144" width="124" height="14" fill="#E76F51"/><path d="M180 168 q88 14 176 0" stroke="#D4A84A" stroke-width="3" fill="none"/>`,
    kapitaen: `<path d="M196 164 L192 116 C230 94 306 94 344 116 L340 164 Z" fill="#F6F5F3" stroke="#C9D2D6" stroke-width="4"/><rect x="194" y="144" width="148" height="22" fill="#14213D"/><path d="M180 164 C208 186 262 188 288 174 L284 164 Z" fill="#14213D"/><path d="M256 120 l12 -10 12 10 -12 12z" fill="#FFD03D"/><path d="M196 144 h146" stroke="#FFD03D" stroke-width="4"/>`,
    piratenhut: `<path d="M148 152 C190 172 346 172 388 152 C382 100 330 80 268 92 C206 80 154 100 148 152 Z" fill="#1E1E24"/><path d="M148 152 C190 172 346 172 388 152" stroke="#FFD03D" stroke-width="6" fill="none"/><circle cx="268" cy="122" r="14" fill="#F6F5F3"/><circle cx="263" cy="120" r="3" fill="#1E1E24"/><circle cx="273" cy="120" r="3" fill="#1E1E24"/><path d="M250 142 l36 12 M286 142 l-36 12" stroke="#F6F5F3" stroke-width="5" stroke-linecap="round"/>`,
    bommel: `<path d="M192 166 C188 76 348 76 344 166 Z" fill="#E63946"/><path d="M198 124 C240 112 298 112 340 124 L342 140 C298 128 240 128 196 142Z" fill="#F6F5F3"/><rect x="186" y="148" width="164" height="26" rx="12" fill="#F6F5F3"/><circle cx="268" cy="68" r="25" fill="#F6F5F3"/>`,
    ohrenschuetzer: `<path d="M214 198 C204 108 332 108 322 198" fill="none" stroke="#8E44AD" stroke-width="12" stroke-linecap="round"/><circle cx="322" cy="208" r="32" fill="#FF8FB8"/><circle cx="322" cy="208" r="19" fill="#FFC2D9"/>`,
    expedition: `<path d="M194 172 C188 90 348 90 342 172 Z" fill="#8B5A2B"/><path d="M178 150 C220 134 316 134 358 150 L362 180 C316 166 220 166 174 180Z" fill="#EFE4D2"/><path d="M332 162 C356 182 362 222 344 252 L318 246 C324 218 320 190 308 172Z" fill="#EFE4D2"/><path d="M190 158 q78 -14 160 0" stroke="#D8C8B0" stroke-width="3" fill="none"/>`,
    rentiergeweih: `<path d="M232 130 L216 72 M220 98 L194 86 M216 72 L204 46 M216 72 L234 52 M304 126 L320 68 M316 94 L342 82 M320 68 L332 42 M320 68 L302 48" stroke="#8B5A2B" stroke-width="11" stroke-linecap="round" fill="none"/><path d="M210 178 C204 108 332 108 326 178" fill="none" stroke="#C0392B" stroke-width="11" stroke-linecap="round"/><circle cx="214" cy="150" r="8" fill="#FFD03D"/>`,
    eiskrone: `<path d="M198 170 L192 100 L224 132 L240 70 L256 126 L268 44 L280 126 L296 70 L312 132 L344 100 L338 170 Z" fill="#CFF4FF" stroke="#5BC0EB" stroke-width="6" stroke-linejoin="round"/><path d="M268 62 V158 M240 88 L250 150 M296 88 L286 150" stroke="#fff" stroke-width="4" opacity=".8"/><circle cx="268" cy="146" r="12" fill="#7B61FF" stroke="#fff" stroke-width="3"/>${star(312, 92, 9, "#FFFFFF")}`,
    dreizackkrone: `<path d="M200 170 L196 110 L224 136 L236 70 L254 130 L268 36 L282 130 L300 70 L312 136 L340 110 L336 170 Z" fill="#4FD1C5" stroke="#F2B21B" stroke-width="7" stroke-linejoin="round"/><circle cx="268" cy="150" r="11" fill="#F7F1E6"/><circle cx="226" cy="156" r="7" fill="#F7F1E6"/><circle cx="310" cy="156" r="7" fill="#F7F1E6"/>`
  };
  const EYE = {
    monokel: `<circle cx="240" cy="222" r="31" fill="none" stroke="#FFD03D" stroke-width="10"/><path d="M262 246 C284 282 286 318 300 352" fill="none" stroke="#FFD03D" stroke-width="6" stroke-linecap="round"/>`,
    rund: `<circle cx="240" cy="222" r="28" fill="rgba(255,255,255,.12)" stroke="#8A5A2B" stroke-width="7"/><path d="M268 216 L346 204" stroke="#8A5A2B" stroke-width="6" stroke-linecap="round"/>`,
    halb: `<path d="M210 222 h62 c0 24-13 34-31 34 s-31-10-31-34z" fill="rgba(255,255,255,.22)" stroke="#9AA7AE" stroke-width="6"/><path d="M272 224 L346 208" stroke="#9AA7AE" stroke-width="5" stroke-linecap="round"/>`,
    klappe: `<path d="M186 200 L352 178" stroke="#14202A" stroke-width="7"/><ellipse cx="240" cy="222" rx="26" ry="22" fill="#14202A"/>`,
    funkel: `<circle cx="240" cy="222" r="17" fill="#F6F5F3"/><circle cx="237" cy="222" r="11" fill="#2F8FE0"/><circle cx="237" cy="222" r="5" fill="#0B2A33"/><circle cx="232" cy="216" r="4" fill="#fff"/>${star(274, 202, 11, "#FFF6C9")}`,
    nerd: `<rect x="204" y="192" width="74" height="60" rx="12" fill="rgba(255,255,255,.18)" stroke="#14202A" stroke-width="10"/><path d="M278 214 L346 204" stroke="#14202A" stroke-width="9" stroke-linecap="round"/>`,
    herz: `<path d="M240 256 C196 228 202 192 224 192 C233 192 240 199 240 206 C240 199 247 192 256 192 C278 192 284 228 240 256 Z" fill="#FF4F8B" opacity=".92"/><path d="M276 208 L346 200" stroke="#FF4F8B" stroke-width="6" stroke-linecap="round"/>`,
    taucher: `<rect x="198" y="188" width="88" height="66" rx="22" fill="rgba(140,220,255,.35)" stroke="#F28C28" stroke-width="10"/><path d="M286 214 L352 204" stroke="#2B2D42" stroke-width="13" stroke-linecap="round"/>`,
    sonnen: `<path d="M200 200 h86 c0 34-14 54-44 54 c-30 0-42-22-42-54z" fill="#111"/><path d="M212 210 l22 0" stroke="#fff" stroke-width="5" opacity=".5" stroke-linecap="round"/><path d="M284 206 L348 198" stroke="#111" stroke-width="9" stroke-linecap="round"/>`,
    lupe: `<path d="M262 258 L306 320" stroke="#8A5A2B" stroke-width="15" stroke-linecap="round"/><circle cx="236" cy="226" r="40" fill="#F6F5F3" stroke="#8A5A2B" stroke-width="9"/><circle cx="231" cy="226" r="17" fill="#0B2A33"/><circle cx="224" cy="218" r="6" fill="#fff"/>`,
    visor: `<path d="M178 198 L354 186 L356 236 L182 250 Z" fill="#FF2E63" opacity=".92"/><path d="M196 214 L340 204" stroke="#FFC2D3" stroke-width="5" stroke-linecap="round"/>`,
    katzenauge: `<path d="M204 216 C208 198 264 192 288 198 C290 228 272 252 242 252 C214 252 200 234 204 216 Z" fill="rgba(255,255,255,.15)" stroke="#E2468A" stroke-width="8"/><path d="M286 200 L304 182" stroke="#E2468A" stroke-width="9" stroke-linecap="round"/><path d="M286 212 L348 202" stroke="#E2468A" stroke-width="6" stroke-linecap="round"/>`,
    schlafmaske: `<path d="M194 206 C220 192 300 190 344 196 L346 242 C300 248 220 250 196 238 Z" fill="#A78BFA"/><path d="M218 226 q22 12 44 0" stroke="#5B3FB8" stroke-width="5" fill="none" stroke-linecap="round"/>${star(306, 214, 10, "#FFE58A")}`,
    kristall: `<path d="M200 202 L244 198 L232 252 L208 246 Z" fill="#7FDBFF" opacity=".9"/><path d="M244 198 L290 204 L280 248 L232 252 Z" fill="#C084FC" opacity=".9"/><path d="M200 202 L290 204" stroke="#fff" stroke-width="4"/><path d="M290 208 L350 200" stroke="#E0E7FF" stroke-width="6" stroke-linecap="round"/><path d="M214 216 l8 -7 M256 214 l8 -7" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    sportbrille: `<path d="M194 210 C220 196 292 194 354 202 L352 234 C292 228 222 234 196 240 Z" fill="#FF7A00" opacity=".92"/><path d="M206 214 C230 206 262 206 282 210" stroke="#FFE0B2" stroke-width="5" stroke-linecap="round"/>`,
    flieger: `<path d="M270 214 L354 202" stroke="#6A3E1E" stroke-width="18" stroke-linecap="round"/><circle cx="240" cy="222" r="30" fill="rgba(158,216,240,.5)" stroke="#C99400" stroke-width="9"/>`,
    goldbrille: `<path d="M202 204 h80 c2 30-12 50-40 50 c-28 0-42-20-40-50z" fill="#3B2A00" stroke="#F2B21B" stroke-width="7"/><path d="M212 214 l26 0" stroke="#FFE58A" stroke-width="5" stroke-linecap="round"/><path d="M282 208 L348 198" stroke="#F2B21B" stroke-width="7" stroke-linecap="round"/>`,
    schnorchel: `<path d="M330 214 C346 180 342 130 330 96" stroke="#FFB703" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M284 216 L352 206" stroke="#2EC4B6" stroke-width="12" stroke-linecap="round"/><rect x="200" y="192" width="84" height="60" rx="24" fill="rgba(140,220,255,.4)" stroke="#2EC4B6" stroke-width="9"/>`,
    skibrille: `<path d="M286 216 L352 206" stroke="#2B2D42" stroke-width="14" stroke-linecap="round"/><path d="M198 206 C210 190 276 188 290 204 C294 232 282 250 244 250 C210 250 194 234 198 206Z" fill="#FF9F1C" stroke="#2B2D42" stroke-width="7"/><path d="M212 210 C232 202 260 202 276 208" stroke="#FFE8C2" stroke-width="5" stroke-linecap="round"/>`,
    polarvisor: `<path d="M178 198 L354 186 L356 236 L182 250 Z" fill="#2EC4B6" opacity=".92"/><path d="M180 216 L355 204 L355 220 L181 234Z" fill="#7B61FF" opacity=".75"/><path d="M196 208 L340 198" stroke="#E0FFF9" stroke-width="4" stroke-linecap="round"/>`,
    laser: `<path d="M178 198 L354 186 L356 236 L182 250 Z" fill="#22D3A6" opacity=".92"/><path d="M196 214 L340 204" stroke="#B7FFE9" stroke-width="5" stroke-linecap="round"/>`
  };
  const HIDE_EYE = new Set(["sonnen", "visor", "klappe", "funkel", "herz", "lupe", "schlafmaske", "kristall", "sportbrille", "goldbrille", "laser", "skibrille", "polarvisor"]);
  const NECK = {
    fliege: `<path d="M212 300 L250 318 L212 338 Z M288 300 L250 318 L288 338 Z" fill="#E2468A"/><circle cx="250" cy="318" r="10" fill="#B8326C"/>`,
    halstuch: `<path d="M194 294 C232 316 294 314 328 290 L264 368 Z" fill="#2F9E6E"/><circle cx="262" cy="318" r="10" fill="#23805A"/>`,
    badge: `<path d="M214 296 L250 356 L290 294" fill="none" stroke="#3B8CF0" stroke-width="7"/><rect x="218" y="352" width="66" height="44" rx="6" fill="#F6F5F3" stroke="#9AA7AE" stroke-width="3"/><text x="251" y="381" font-size="17" font-weight="700" text-anchor="middle" fill="#0B2A33" font-family="sans-serif">AZUBI</text>`,
    perlen: arc(12, (x, y) => `<circle cx="${x}" cy="${y}" r="9" fill="#F7F1E6" stroke="#D9CBB2" stroke-width="2"/>`),
    schal: `<path d="M190 290 C228 318 298 318 330 288 L336 318 C298 348 226 348 186 320 Z" fill="#E94B3C"/><path d="M292 320 L310 400 L282 404 L268 328 Z" fill="#C53A2D"/>`,
    krawatte: `<path d="M242 300 L276 300 L268 318 L284 392 L259 418 L234 392 L250 318 Z" fill="#2F6FDB"/><path d="M246 344 l30 -10 M240 370 l42 -14 M240 396 l40 -14" stroke="#9CC2FF" stroke-width="5"/>`,
    kamera: `<path d="M206 296 C220 340 300 340 314 294" fill="none" stroke="#5B4636" stroke-width="7"/><rect x="236" y="330" width="18" height="12" rx="3" fill="#2B2D42"/><rect x="224" y="338" width="74" height="50" rx="9" fill="#2B2D42"/><circle cx="261" cy="363" r="16" fill="#5B6B8A" stroke="#11131F" stroke-width="5"/><circle cx="256" cy="358" r="4" fill="#C9D6F0"/>`,
    medaille: `<path d="M222 292 L252 352 M296 292 L266 352" stroke="#3B6FE0" stroke-width="13"/><circle cx="259" cy="366" r="25" fill="#FFD03D" stroke="#C99400" stroke-width="6"/>${star(259, 366, 12, "#C99400")}`,
    umhang: cape("#C0243A", "#E03A52", `<circle cx="262" cy="320" r="11" fill="#FFD03D" stroke="#C99400" stroke-width="3"/>`),
    hermelin: `<path d="M178 330 C150 380 140 430 130 470 L178 470 C184 420 198 376 216 350 Z M346 326 C382 376 404 430 414 470 L370 470 C362 420 344 376 312 350 Z" fill="#6A1B9A"/><path d="M176 296 C224 332 304 330 342 290 L354 332 C312 376 212 376 168 336 Z" fill="#F6F5F3"/>` + [[200, 322], [232, 340], [270, 344], [306, 334], [332, 316], [214, 348], [292, 356]].map(([x, y]) => `<path d="M${x} ${y} l3 9 -3 -2 -3 2z" fill="#14202A"/>`).join("") + `<circle cx="262" cy="350" r="15" fill="#FFD03D" stroke="#C99400" stroke-width="5"/><circle cx="262" cy="350" r="5" fill="#E2468A"/>`,
    glocke: `<path d="M196 300 C232 322 294 320 328 296 L330 312 C296 338 230 338 194 316 Z" fill="#E2468A"/><circle cx="262" cy="340" r="17" fill="#FFD03D" stroke="#C99400" stroke-width="4"/><path d="M252 344 h20" stroke="#8A6400" stroke-width="4"/><circle cx="262" cy="350" r="3" fill="#8A6400"/>`,
    rueschen: arc(9, (x, y) => `<circle cx="${x}" cy="${y}" r="19" fill="#FFFFFF" stroke="#D0D7DC" stroke-width="3"/>`),
    sternenumhang: cape("#1E2A5A", "#2E3F80", `<circle cx="262" cy="320" r="11" fill="#FFD03D" stroke="#C99400" stroke-width="3"/>`) + [[160, 420], [190, 370], [380, 410], [356, 360], [400, 450]].map(([x, y]) => star(x, y, 9, "#FFE58A")).join(""),
    nieten: `<path d="M196 300 C232 322 294 320 328 296 L330 316 C296 342 230 342 194 320 Z" fill="#2B2D42"/>` + arc(8, (x, y) => `<circle cx="${x}" cy="${(+y - 30).toFixed(1)}" r="5" fill="#C9D2D6"/>`),
    pfeife: `<path d="M214 296 L252 350 L292 294" fill="none" stroke="#FF7A00" stroke-width="6"/><rect x="236" y="346" width="44" height="24" rx="11" fill="#C9D2D6" stroke="#7D8A94" stroke-width="4"/><circle cx="268" cy="358" r="5" fill="#7D8A94"/>`,
    schaerpe: `<path d="M196 300 L232 296 L352 470 L306 470 Z" fill="#C0243A"/><path d="M200 302 L230 298 L262 346" stroke="#FFD03D" stroke-width="5" fill="none"/>${star(300, 400, 26, "#FFD03D")}<circle cx="300" cy="400" r="9" fill="#C99400"/>`,
    ritterumhang: cape("#1E4FA8", "#2F6FDB", `<path d="M262 306 l14 8 v14 c0 10 -8 16 -14 18 c-6 -2 -14 -8 -14 -18 v-14z" fill="#FFD03D" stroke="#C99400" stroke-width="3"/>`),
    goldruestung: `<path d="M184 470 C178 410 186 360 206 330 C230 350 294 352 318 328 C338 360 346 410 342 470 Z" fill="#F2C14E" stroke="#B8860B" stroke-width="6" stroke-linejoin="round"/><path d="M208 330 C190 318 166 326 156 350 C152 372 168 388 188 380 C192 362 198 344 208 330 Z M316 328 C334 316 360 324 370 348 C374 370 360 386 340 380 C336 362 328 344 316 328 Z" fill="#E0A82E" stroke="#B8860B" stroke-width="5" stroke-linejoin="round"/><path d="M188 424 Q262 446 338 424 M186 450 Q262 472 340 450" stroke="#B8860B" stroke-width="5" fill="none"/><path d="M224 360 C230 388 230 408 222 436" stroke="#FFF1B8" stroke-width="8" stroke-linecap="round" opacity=".75"/><path d="M262 362 l20 8 v18 c0 14 -10 22 -20 26 c-10 -4 -20 -12 -20 -26 v-18z" fill="#C0243A" stroke="#B8860B" stroke-width="4"/>${star(262, 384, 9, "#FFD03D")}`,
    lei: arc(11, (x, y, i) => `<circle cx="${x}" cy="${y}" r="13" fill="${["#FF7AB6", "#FFD03D", "#FF8A3D", "#B57CF2"][i % 4]}"/><circle cx="${x}" cy="${y}" r="4" fill="#FFF3C4"/>`),
    rettungsring: `<ellipse cx="262" cy="322" rx="84" ry="34" fill="none" stroke="#F6F5F3" stroke-width="24"/><ellipse cx="262" cy="322" rx="84" ry="34" fill="none" stroke="#E63946" stroke-width="24" stroke-dasharray="34 34"/>`,
    muschelkette: `<path d="M206 298 C226 346 298 346 318 296" fill="none" stroke="#8A6440" stroke-width="4"/>` + [[228, 330, 12], [262, 344, 17], [296, 330, 12]].map(([x, y, r]) => `<path d="M${x - r} ${y} Q${x} ${y - r * 2.2} ${x + r} ${y} Z" fill="#FFB4A2" stroke="#E07A5F" stroke-width="3"/><path d="M${x} ${y} L${x} ${y - r * 1.4} M${x} ${y} L${x - r * .6} ${y - r} M${x} ${y} L${x + r * .6} ${y - r}" stroke="#E07A5F" stroke-width="2"/>`).join(""),
    strickschal: `<path d="M190 290 C228 318 298 318 330 288 L336 318 C298 348 226 348 186 320 Z" fill="#3B6FE0"/><path d="M292 320 L310 400 L282 404 L268 328 Z" fill="#3B6FE0"/><path d="M220 314 l6 24 M250 320 l3 24 M282 318 l-2 24 M276 352 l22 -4 M280 374 l22 -4" stroke="#F6F5F3" stroke-width="7"/><path d="M284 404 l-2 12 M294 402 l0 12 M304 400 l2 12" stroke="#3B6FE0" stroke-width="4" stroke-linecap="round"/>`,
    fischkette: `<path d="M206 296 C222 344 300 344 316 294" fill="none" stroke="#5B6470" stroke-width="4"/><path d="M240 354 C252 340 278 340 290 354 C278 368 252 368 240 354Z" fill="#7FB3D5" stroke="#3B6F96" stroke-width="3"/><path d="M290 354 l16 -12 v24z" fill="#7FB3D5" stroke="#3B6F96" stroke-width="3" stroke-linejoin="round"/><circle cx="251" cy="351" r="3.5" fill="#14202A"/>`,
    fellkragen: arc(14, (x, y, i) => `<circle cx="${x}" cy="${y}" r="16" fill="${i % 3 ? "#B98A5E" : "#A47448"}" stroke="#7E5532" stroke-width="2"/>`),
    polarmantel: cape("#1F5FAE", "#1F5FAE", "") + [[158, 430], [188, 372], [384, 418], [356, 362], [404, 458]].map(([x, y]) => star(x, y, 10, "#CFEFFF")).join("") + arc(14, (x, y, i) => `<circle cx="${x}" cy="${y}" r="15" fill="${i % 3 ? "#F7FBFF" : "#DDEFFB"}" stroke="#B9D9EE" stroke-width="2"/>`) + `<circle cx="262" cy="330" r="13" fill="#7B61FF" stroke="#fff" stroke-width="3"/>`,
    schatzkette: arc(14, (x, y) => `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="#F2B21B" stroke-width="4"/>`) + `<path d="M262 344 l24 18 -24 32 -24 -32z" fill="#E2468A" stroke="#F2B21B" stroke-width="6" stroke-linejoin="round"/><path d="M254 360 l8 -8" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`
  };
  const BG = {
    tuerkis: solid("#6AD2E2"), rosa: solid("#F9C6D3"), sand: solid("#F1D9A8"), grau: solid("#C9D3DB"), meer: solid("#8CCBEA"),
    mint: solid("#8EDDBE"), lavendel: solid("#C2B0F0"), pfirsich: solid("#FFBFA0"), himmel: solid("#9FD0FF"),
    wolle: () => `<rect width="512" height="512" fill="#F6E3C8"/><circle cx="80" cy="430" r="56" fill="#E2468A"/><path d="M34 410 q46 32 92 0 M36 440 q44 30 88 0 M60 382 q30 50 4 104" stroke="#B8326C" stroke-width="5" fill="none"/><circle cx="440" cy="100" r="46" fill="#3B8CF0"/><path d="M402 86 q38 28 76 0 M404 112 q36 26 72 0" stroke="#1E5FB8" stroke-width="5" fill="none"/><path d="M136 430 C220 400 300 480 380 140" stroke="#E2468A" stroke-width="4" fill="none" opacity=".6"/>`,
    kaese: () => `<rect width="512" height="512" fill="#FFD54F"/>` + [[70, 80, 30], [420, 60, 22], [460, 260, 34], [60, 300, 26], [120, 460, 40], [400, 440, 28], [250, 40, 16]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#F2B21B"/>`).join(""),
    sonne: (id) => grad(id, "#FF7A59", "#FFD36B") + `<circle cx="410" cy="120" r="56" fill="#FFF2B0" opacity=".8"/>`,
    ozean: (id) => grad(id, "#57B8F0", "#0B4F8A") + `<path d="M0 380 Q64 356 128 380 T256 380 T384 380 T512 380 V512 H0Z" fill="#1C6FB0" opacity=".75"/><path d="M0 430 Q64 408 128 430 T256 430 T384 430 T512 430 V512 H0Z" fill="#0E5A97"/>`,
    wald: (id) => grad(id, "#BDEBC6", "#4E9E6A") + [[40, 380, 70], [110, 330, 90], [420, 340, 80], [480, 390, 60], [360, 400, 50]].map(([x, y, h]) => `<path d="M${x} ${y - h * 1.6} L${x + h * .55} ${y} L${x - h * .55} ${y} Z" fill="#2E7A4C"/>`).join(""),
    kissen: () => `<rect width="512" height="512" fill="#B39DDB"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${i * 64 - 256} 0 L${i * 64 + 256} 512 M${i * 64 + 256} 0 L${i * 64 - 256} 512" stroke="#9575CD" stroke-width="4"/>`).join("") + Array.from({ length: 16 }, (_, i) => `<circle cx="${(i % 4) * 128 + 64}" cy="${Math.floor(i / 4) * 128 + 64}" r="6" fill="#EDE7F6"/>`).join(""),
    herbst: (id) => grad(id, "#FFB26B", "#D9572B") + [[60, 80, 30, "#C0392B"], [420, 120, -20, "#F2B21B"], [100, 380, 60, "#8E3B1E"], [440, 420, 10, "#E67E22"], [250, 60, -40, "#E67E22"], [370, 260, 70, "#C0392B"]].map(([x, y, r, c]) => `<ellipse cx="${x}" cy="${y}" rx="26" ry="14" fill="${c}" transform="rotate(${r} ${x} ${y})"/>`).join(""),
    park: (id) => grad(id, "#BFE6FF", "#E8F7FF") + `<circle cx="420" cy="90" r="40" fill="#FFE066"/><path d="M0 360 C120 320 240 340 512 300 V512 H0Z" fill="#7BC67E"/><path d="M0 420 C160 390 330 410 512 380 V512 H0Z" fill="#5AAE5E"/><circle cx="80" cy="300" r="40" fill="#3E8E4E"/><rect x="74" y="330" width="12" height="40" fill="#7A4E2A"/>`,
    strand: (id) => grad(id, "#9ED8FF", "#E0F4FF") + `<rect y="300" width="512" height="80" fill="#3BA3E0"/><path d="M0 370 Q128 350 256 372 T512 366 V512 H0Z" fill="#F4D99B"/><circle cx="420" cy="80" r="38" fill="#FFE066"/><path d="M60 460 L90 360" stroke="#7A4E2A" stroke-width="6"/><path d="M40 366 Q90 320 140 366 Z" fill="#E63946"/>`,
    nacht: () => `<rect width="512" height="512" fill="#1B2A4A"/>` + [[60, 70], [120, 160], [420, 60], [380, 200], [460, 300], [70, 300], [300, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#FFF6C9"/>`).join("") + `<path d="M440 120a40 40 0 1 1-40-52a32 32 0 0 0 40 52z" fill="#FFE58A"/>`,
    terminal: () => `<rect width="512" height="512" fill="#0B1410"/>` + ["SELECT * FROM", "WHILE i < n DO", "GRANT SELECT ON", "LEFT JOIN k ON", "RETURN max", "IF x THEN", "COMMIT;", "i := i + 1", "GROUP BY id", "HAVING n > 2"].map((t, i) => `<text x="${i % 2 ? 250 : 18}" y="${40 + i * 48}" font-family="monospace" font-size="26" fill="#3BE37A" opacity="${0.25 + (i % 3) * 0.15}">${t}</text>`).join(""),
    rosen: () => `<rect width="512" height="512" fill="#8E244D"/>` + [[70, 80], [430, 70], [460, 300], [60, 330], [130, 470], [410, 460], [260, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="30" fill="#E2467A"/><circle cx="${x}" cy="${y}" r="19" fill="#C2185B"/><circle cx="${x}" cy="${y}" r="8" fill="#F48FB1"/>`).join(""),
    neon: (id) => grad(id, "#2A0E5A", "#7A1F7A") + `<circle cx="256" cy="300" r="120" fill="#FF6AD5"/>` + [0, 1, 2, 3, 4].map((i) => `<rect x="120" y="${250 + i * 20}" width="272" height="${4 + i * 2}" fill="#2A0E5A"/>`).join("") + `<rect y="340" width="512" height="172" fill="#1A0838"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M256 340 L${i * 64 - 2} 512" stroke="#00E5FF" stroke-width="2" opacity=".7"/>`).join("") + [360, 390, 430, 480].map((y) => `<path d="M0 ${y} H512" stroke="#00E5FF" stroke-width="2" opacity=".7"/>`).join(""),
    riff: (id) => grad(id, "#4FC3F7", "#0B5C99") + `<path d="M0 512 V430 C30 400 50 440 70 410 C90 380 110 430 130 420 V512 Z" fill="#FF7A8A"/><path d="M380 512 V400 C390 360 410 380 420 350 C430 380 450 360 460 400 V512 Z" fill="#FFB347"/><path d="M180 512 C190 470 200 460 210 430 C220 460 230 470 240 512 Z" fill="#B57CF2"/><path d="M420 160 l26 -14 v28 z M446 160 c-8 -14 -40 -14 -46 0 c6 14 38 14 46 0z" fill="#FFD03D"/><path d="M90 120 l20 -10 v20 z M110 120 c-6 -10 -30 -10 -34 0 c4 10 28 10 34 0z" fill="#FF7A8A"/>`,
    tiefsee: (id) => grad(id, "#0E3A66", "#030D1F") + `<path d="M140 0 L60 512 L120 512 L200 0Z M300 0 L260 512 L300 512 L350 0Z" fill="#fff" opacity=".06"/>` + [[80, 400, 10], [96, 360, 6], [430, 300, 12], [446, 260, 7], [420, 220, 5], [60, 180, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#9ED8F0" stroke-width="2" opacity=".7"/>`).join("") + `<circle cx="440" cy="90" r="6" fill="#6CFFE0"/><circle cx="440" cy="90" r="16" fill="#6CFFE0" opacity=".25"/>`,
    eisblau: solid("#BFE3F2"),
    schnee: () => `<rect width="512" height="512" fill="#CFE3F3"/>` + [[60, 70, 10], [150, 160, 6], [420, 60, 12], [380, 220, 7], [470, 320, 9], [80, 320, 8], [300, 40, 6], [130, 460, 11], [420, 460, 8], [240, 110, 5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join(""),
    eisberg: (id) => grad(id, "#CDEBFA", "#EAF7FF") + `<rect y="380" width="512" height="132" fill="#3B8CC4"/><path d="M300 380 L350 240 L392 290 L430 200 L480 380 Z" fill="#F4FBFF"/><path d="M350 240 L372 380 M430 200 L420 380" stroke="#BFE3F2" stroke-width="6"/><path d="M290 380 L480 380 L460 440 L320 450 Z" fill="#9FD3EE" opacity=".7"/><path d="M0 400 Q64 390 128 400 T256 400" stroke="#8CCBEA" stroke-width="4" fill="none"/>`,
    iglu: (id) => grad(id, "#A9D6F5", "#E4F3FF") + `<path d="M0 400 C120 380 380 380 512 400 V512 H0Z" fill="#F4FBFF"/><path d="M330 400 A90 90 0 0 1 510 400 Z" fill="#FFFFFF" stroke="#BFD8EA" stroke-width="4"/><path d="M340 370 H500 M352 340 H490 M372 316 H470" stroke="#BFD8EA" stroke-width="4"/><path d="M392 400 A28 28 0 0 1 448 400 Z" fill="#6C8EA6"/>` + [[60, 80], [160, 50], [260, 100], [80, 200]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff"/>`).join(""),
    polarlicht: () => `<rect width="512" height="512" fill="#0B1A33"/><path d="M-20 200 C80 120 180 240 280 150 S460 120 540 180 L540 240 C460 190 380 230 280 220 S80 200 -20 270Z" fill="#2EE6A6" opacity=".45"/><path d="M-20 120 C100 60 200 160 300 90 S460 60 540 110 L540 150 C450 110 380 150 300 140 S100 110 -20 170Z" fill="#7B61FF" opacity=".4"/>` + [[60, 40], [200, 30], [420, 50], [470, 260], [40, 300], [300, 280]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#fff"/>`).join("") + `<path d="M0 430 C140 410 360 420 512 400 V512 H0Z" fill="#E4F3FF"/>`,
    eispalast: (id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FC8F8"/><stop offset="1" stop-color="#F0FAFF"/></linearGradient></defs><rect width="512" height="512" fill="url(#${id})"/>` + [[40, 360, 50, 260], [110, 360, 40, 200], [400, 360, 46, 240], [470, 360, 40, 280], [440, 360, 30, 170]].map(([x, y, w, h]) => `<rect x="${x - w / 2}" y="${y - h}" width="${w}" height="${h}" fill="#DDF4FF" stroke="#8FD3F5" stroke-width="4"/><path d="M${x - w / 2 - 6} ${y - h} L${x} ${y - h - 50} L${x + w / 2 + 6} ${y - h} Z" fill="#BDEFFF" stroke="#8FD3F5" stroke-width="4"/>`).join("") + `<rect y="360" width="512" height="152" fill="#F0FAFF"/>` + [[160, 80], [340, 60], [260, 160], [90, 40]].map(([x, y]) => star(x, y, 12, "#FFFFFF")).join(""),
    gold: (id) => `<defs><radialGradient id="${id}" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#FFF3B8"/><stop offset=".55" stop-color="#F7C948"/><stop offset="1" stop-color="#C98A00"/></radialGradient></defs><rect width="512" height="512" fill="url(#${id})"/>` + Array.from({ length: 12 }, (_, i) => `<path d="M256 220 L${256 + 400 * Math.cos(i * Math.PI / 6)} ${220 + 400 * Math.sin(i * Math.PI / 6)} L${256 + 400 * Math.cos(i * Math.PI / 6 + .12)} ${220 + 400 * Math.sin(i * Math.PI / 6 + .12)} Z" fill="#FFF7D1" opacity=".35"/>`).join(""),
    galaxie: (id) => `<defs><radialGradient id="${id}" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="#5B2A9A"/><stop offset=".6" stop-color="#1E1046"/><stop offset="1" stop-color="#07041A"/></radialGradient></defs><rect width="512" height="512" fill="url(#${id})"/><ellipse cx="160" cy="140" rx="160" ry="60" fill="#FF6AD5" opacity=".22" transform="rotate(-20 160 140)"/><ellipse cx="380" cy="380" rx="170" ry="60" fill="#4FC3F7" opacity=".2" transform="rotate(-25 380 380)"/>` + [[50, 60], [120, 300], [460, 80], [420, 260], [300, 40], [70, 440], [470, 470], [210, 470]].map(([x, y], i) => star(x, y, i % 2 ? 7 : 11, "#FFF6E0")).join(""),
    regenbogen: (id) => grad(id, "#BFE6FF", "#F4FBFF") + ["#E63946", "#F4A261", "#FFD03D", "#2A9D8F", "#3B8CF0", "#8E44AD"].map((c, i) => `<path d="M${20 + i * 18} 420 A${236 - i * 18} ${236 - i * 18} 0 0 1 ${492 - i * 18} 420" stroke="${c}" stroke-width="18" fill="none"/>`).join("") + `<ellipse cx="60" cy="420" rx="70" ry="34" fill="#fff"/><ellipse cx="452" cy="420" rx="70" ry="34" fill="#fff"/>`,
    kristallhoehle: (id) => grad(id, "#163A40", "#05161A") + [[40, 512, 60, 220, "#7FDBFF"], [100, 512, 40, 150, "#C084FC"], [440, 512, 70, 260, "#C084FC"], [380, 512, 36, 140, "#7FDBFF"], [470, 0, 40, -150, "#7FDBFF"], [60, 0, 50, -130, "#C084FC"]].map(([x, y, w, h, c]) => `<path d="M${x - w / 2} ${y} L${x} ${y - h} L${x + w / 2} ${y} Z" fill="${c}" opacity=".85"/><path d="M${x} ${y} L${x} ${y - h}" stroke="#fff" stroke-width="3" opacity=".5"/>`).join(""),
    perlmutt: (id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD6E8"/><stop offset=".35" stop-color="#C9F2FF"/><stop offset=".7" stop-color="#E5D4FF"/><stop offset="1" stop-color="#FFF3C9"/></linearGradient></defs><rect width="512" height="512" fill="url(#${id})"/>` + [0, 1, 2, 3].map((i) => `<path d="M-40 ${120 + i * 110} Q256 ${60 + i * 110} 552 ${140 + i * 110}" stroke="#fff" stroke-width="16" fill="none" opacity=".45"/>`).join("") + [[70, 90], [440, 70], [460, 430], [50, 440]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="18" fill="#FFF8F0" stroke="#E8D9CF" stroke-width="3"/>`).join("")
  };

  // ================= Tiere: Grundfigur + Anker (Kopf: x, y, Drehung, Größe · Auge: x, y, Größe · Hals: x, y, Größe)
  const ANIMALS = {
    rabe: { name: "Rabe", banner: "Raben-Kollektion", base: "tuerkis", a: { hat: [268, 150, -8, 1], eye: [240, 222, 1], neck: [260, 310, 1] },
      body: `<path d="M138 470 C132 372 176 300 258 288 C346 276 404 344 410 470 Z" fill="#0B2A33"/><path d="M296 322 C356 340 388 404 392 470 L352 470 C346 414 326 372 286 346 Z" fill="#17414D"/><path d="M176 238 C176 168 222 140 268 140 C324 140 356 184 352 238 C348 294 306 318 262 318 C214 318 176 292 176 238 Z" fill="#0B2A33"/><path d="M190 262 L206 300 L214 278 L228 318 L238 290 L254 330 L262 300 L280 322 L268 270 Z" fill="#0B2A33"/><path d="M196 204 C150 206 112 226 74 266 C120 262 160 262 202 272 Z" fill="#0B2A33"/><path d="M74 266 C120 262 160 262 202 272 L200 254 C160 252 118 256 74 266 Z" fill="#17414D"/>`,
      eye: `<circle cx="240" cy="222" r="15" fill="#F6F5F3"/><circle cx="236" cy="222" r="8" fill="#0B2A33"/>` },
    katze: { name: "Katze", banner: "Katzen-Kollektion", base: "rosa", a: { hat: [270, 160, -6, .95], eye: [232, 218, .95], neck: [262, 318, 1] },
      body: `<path d="M140 470 C136 380 180 316 260 306 C344 296 400 360 406 470 Z" fill="#E8863A"/><path d="M182 470 C182 400 212 346 252 332 C264 362 264 420 258 470 Z" fill="#FFE3C2"/><path d="M332 340 q20 30 16 70 M362 372 q14 26 12 60" stroke="#C4621F" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M286 172 L332 80 L354 194 Z" fill="#D9722A"/><ellipse cx="268" cy="234" rx="92" ry="84" fill="#E8863A"/><path d="M204 180 L222 84 L278 158 Z" fill="#E8863A"/><path d="M216 168 L226 110 L258 156 Z" fill="#F7A8B8"/><path d="M302 162 q10 20 4 40 M328 178 q8 18 2 36 M278 158 q6 14 2 30" stroke="#C4621F" stroke-width="8" fill="none" stroke-linecap="round"/><ellipse cx="204" cy="264" rx="42" ry="30" fill="#FFE3C2"/><path d="M196 236 C162 236 150 258 166 272 C178 280 198 278 210 268 Z" fill="#FFE3C2"/><path d="M158 248 l16 -2 -7 11z" fill="#E86A8A"/><path d="M168 262 q6 10 18 6" stroke="#8A4A1E" stroke-width="3" fill="none"/><path d="M182 262 L110 250 M184 268 L112 274 M186 274 L120 294" stroke="#FFF" stroke-width="3" opacity=".9"/>`,
      eye: `<ellipse cx="232" cy="218" rx="15" ry="13" fill="#B6E36B"/><ellipse cx="230" cy="218" rx="4" ry="11" fill="#14202A"/>` },
    hund: { name: "Hund", banner: "Hunde-Kollektion", base: "sand", a: { hat: [278, 146, -6, 0.95], eye: [238, 220, 0.9], neck: [262, 318, 1] },
      body: `<path d="M140 470 C136 380 182 316 262 306 C346 296 402 360 408 470 Z" fill="#C88A50"/><path d="M318 312 C368 330 400 392 408 470 L372 470 C368 410 348 362 306 336 Z" fill="#B3753F"/><path d="M166 470 C160 408 182 352 220 326 C250 312 280 326 286 352 C298 398 290 438 276 470 Z" fill="#F1DCBC"/><path d="M192 216 C192 160 236 136 282 136 C338 136 364 182 360 236 C356 290 314 316 270 316 C232 316 202 298 194 270 Z" fill="#C88A50"/><path d="M214 214 C172 212 120 222 102 246 C96 268 112 286 142 288 C178 290 212 282 228 268 Z" fill="#F1DCBC"/><ellipse cx="106" cy="246" rx="17" ry="13" fill="#2A2522"/><ellipse cx="100" cy="242" rx="5" ry="3.5" fill="#fff" opacity=".35"/><path d="M120 280 q30 8 70 -4" stroke="#7A4E2A" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M300 158 C346 148 372 190 360 252 C354 284 322 296 308 274 C296 244 288 200 300 158 Z" fill="#7B4A2B"/>`,
      eye: `<circle cx="238" cy="220" r="13" fill="#2B1A10"/><circle cx="234" cy="215" r="4" fill="#fff"/>` },
    maus: { name: "Maus", banner: "Mäuse-Kollektion", base: "grau", a: { hat: [262, 170, -8, .85], eye: [232, 226, .85], neck: [262, 322, .95] },
      body: `<path d="M400 440 C452 430 474 380 444 356" stroke="#F4B6C2" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M146 470 C142 384 186 322 262 312 C342 302 396 364 402 470 Z" fill="#A9B2BC"/><path d="M188 470 C188 410 214 352 252 338 C264 372 264 426 258 470 Z" fill="#E6EAEE"/><circle cx="314" cy="148" r="70" fill="#A9B2BC"/><circle cx="316" cy="152" r="47" fill="#F4B6C2"/><path d="M186 236 C186 180 228 160 270 160 C324 160 350 196 348 244 C346 292 308 314 266 314 C226 314 196 296 188 270 Z" fill="#A9B2BC"/><path d="M208 224 C170 230 136 246 116 262 C140 276 178 282 216 276 Z" fill="#B9C1CA"/><circle cx="117" cy="262" r="11" fill="#F28CA8"/><path d="M150 262 L94 244 M152 268 L92 270 M154 274 L98 296" stroke="#5B6470" stroke-width="3"/>`,
      eye: `<circle cx="232" cy="226" r="12" fill="#14202A"/><circle cx="228" cy="222" r="4" fill="#fff"/>` },
    pinguin: { name: "Pinguin", banner: "Pinguin-Kollektion", base: "eisblau", a: { hat: [268, 154, -6, 0.95], eye: [236, 214, 0.85], neck: [262, 320, 1] },
      body: `<path d="M148 470 C138 380 178 300 262 292 C352 284 406 362 406 470 Z" fill="#22303F"/><path d="M168 470 C160 400 186 338 236 314 C276 330 296 404 290 470 Z" fill="#F6F8FB"/><path d="M178 234 C178 170 222 142 270 142 C328 142 356 186 352 240 C348 294 306 318 262 318 C214 318 180 292 178 234 Z" fill="#22303F"/><path d="M194 236 C190 196 220 176 250 180 C286 186 302 216 296 252 C292 276 278 292 256 298 C228 304 206 290 198 268 C195 258 194 248 194 236 Z" fill="#F6F8FB"/><path d="M318 330 C362 346 392 400 388 462 C384 470 374 470 370 462 C352 420 332 388 304 362 C298 346 302 332 318 330 Z" fill="#3E556E"/><path d="M322 338 C356 354 380 398 382 448" stroke="#5E7A96" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M206 230 C180 232 152 242 126 258 C156 260 184 258 208 250 Z" fill="#F59A2E"/><path d="M128 258 C156 261 184 259 208 251 L206 262 C182 270 154 268 128 258 Z" fill="#D46E17"/>`,
      eye: `<circle cx="236" cy="214" r="11" fill="#14202A"/><circle cx="232" cy="210" r="3.5" fill="#fff"/>` }
  };
  const CHARS = Object.keys(ANIMALS);
  // Oberteile aus Events: über den Rumpf des Tiers gelegt (Clip auf die Rumpfform), Ausschnitt unterhalb des Kopfes. [Rumpf, Mitte x, Oberkante y]
  const TORSO = { rabe: ["M138 470 C132 372 176 300 258 288 C346 276 404 344 410 470 Z", 262, 322], katze: ["M140 470 C136 380 180 316 260 306 C344 296 400 360 406 470 Z", 264, 330], hund: ["M140 470 C136 380 182 316 262 306 C346 296 402 360 408 470 Z", 266, 330], maus: ["M146 470 C142 384 186 322 262 312 C342 302 396 364 402 470 Z", 264, 334], pinguin: ["M148 470 C138 380 178 300 262 292 C352 284 406 362 406 470 Z", 266, 330] };
  const SHIRT = {
    baumshirt: (c, id) => { const [tp, cx, ty] = TORSO[c] || TORSO.rabe, py = ty + 74; return `<defs><clipPath id="${id}s"><path d="${tp}"/></clipPath></defs><g clip-path="url(#${id}s)"><path d="M0 ${ty} H${cx - 46} Q${cx} ${ty + 34} ${cx + 46} ${ty} H512 V512 H0 Z" fill="#F1E8D4"/><path d="M${cx - 46} ${ty} Q${cx} ${ty + 34} ${cx + 46} ${ty}" fill="none" stroke="#CDB894" stroke-width="9" stroke-linecap="round"/><path d="M0 ${ty + 40} C60 ${ty + 60} 90 ${ty + 120} 100 512 M512 ${ty + 40} C452 ${ty + 60} 422 ${ty + 120} 412 512" fill="none" stroke="#E0D2B4" stroke-width="5"/>`
      + `<ellipse cx="${cx}" cy="${py + 42}" rx="56" ry="10" fill="#8A5A35"/><rect x="${cx - 7}" y="${py - 4}" width="14" height="46" rx="4" fill="#7A4B2A"/><circle cx="${cx}" cy="${py - 22}" r="27" fill="#3E8E4E"/><circle cx="${cx - 23}" cy="${py - 5}" r="19" fill="#3E8E4E"/><circle cx="${cx + 23}" cy="${py - 5}" r="19" fill="#3E8E4E"/><circle cx="${cx - 8}" cy="${py - 32}" r="9" fill="#62B35E"/>`
      + `<path d="M${cx + 58} ${py - 32} L${cx + 38} ${py + 28}" stroke="#7A4B2A" stroke-width="6" stroke-linecap="round"/><path d="M${cx + 50} ${py - 35} l16 5" stroke="#7A4B2A" stroke-width="6" stroke-linecap="round"/><path d="M${cx + 30} ${py + 20} l18 6 l-6 20 q-12 4 -19 -6 z" fill="#9AA7AE" stroke="#6E7B82" stroke-width="2"/></g>`; }
  };
  const EV_SHIRTS = EVENTS.filter((e) => e.reward.kind === "shirt").map((e) => ({ art: e.reward.art, name: e.reward.name, ev: e.id }));

  // Kollektionen: pro Slot 4 Normal · 3 Selten · 2 Episch · 1 Legendär (+ Basis „ohne“)
  const SETS = {
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
  const NAMES = {
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
  const SKINS = [];
  CHARS.forEach((c) => SLOTS.forEach(([slot]) => {
    if (slot === "shirt") { SKINS.push({ id: `${c}-ohne-shirt`, char: c, slot, rar: "S", art: "", name: "Ohne" }); EV_SHIRTS.forEach((s) => SKINS.push({ id: `${c}-${s.art}`, char: c, slot, rar: "EV", art: s.art, name: s.name, ev: s.ev })); return; } // nur aus Events, nie in der Schatzkammer
    if (slot === "bg") SKINS.push({ id: `${c}-basis-bg`, char: c, slot, rar: "S", art: ANIMALS[c].base, name: NAMES[ANIMALS[c].base] });
    else SKINS.push({ id: `${c}-ohne-${slot}`, char: c, slot, rar: "S", art: "", name: "Ohne" });
    ["N", "R", "SR", "SSR"].forEach((r, k) => SETS[c][slot][k].forEach((art) => SKINS.push({ id: `${c}-${art}`, char: c, slot, rar: r, art, name: NAMES[art] })));
  }));
  const EXTRAS = [
    { id: "buendel", slot: "cur", rar: "N", name: "Federbündel", icon: "🪶", desc: "+30 Federn" },
    { id: "xp2", slot: "boost", rar: "R", name: "XP-Trank", icon: "🧪", desc: "Doppelte XP für 10 Fragen" },
    { id: "shield", slot: "boost", rar: "SR", name: "Serien-Schild", icon: "🛡️", desc: "Rettet die Serie bei einem Fehler" }
  ];
  const ITEMS = SKINS.concat(EXTRAS);
  const IT = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
  const baseEquip = (c) => ({ hat: `${c}-ohne-hat`, eye: `${c}-ohne-eye`, neck: `${c}-ohne-neck`, bg: `${c}-basis-bg`, shirt: `${c}-ohne-shirt` });


  // Skins nur anhängen, nie umbenennen – der Besitz hängt an den IDs.
  const RANKS = [[1, "Neuling"], [3, "Azubi"], [6, "Geselle"], [10, "Gelehrter"], [15, "Prüfungsprofi"], [20, "Großmeister"]];
  const CAL = [{ f: 50 }, { f: 80 }, { t: 1 }, { f: 100 }, { b: "xp2" }, { f: 150 }, { t: 3 }];
  // Täglich 5 aus 10. Gezählt werden nur sicher richtige Antworten – keine Quest belohnt Fehler.
  const QN = 5;
  const QPOOL = [
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
  // Titel: zum Anlegen in der Garderobe, sichtbar in der Rangliste. Freigeschaltet aus dem Fortschritt (auch rückwirkend) oder über Events.
  // IDs nie ändern – Besitz und Rangliste hängen daran. Nur Kleinbuchstaben, Ziffern und „-“ (Format der Rangliste).
  const cntQ = (fn) => Object.entries(env.S().q || {}).filter(([id, r]) => r && !id.startsWith("ev:") && fn(id, r)).length;
  const TITLES = [
    { id: "hello-world", name: "Hello World", how: "Die erste Frage sicher richtig beantworten", ok: () => G.earned > 0 },
    { id: "kaffee", name: "Kaffeegetrieben", how: "7 Tage am Stück einloggen", ok: () => G.loginStreak >= 7 },
    { id: "endlosschleife", name: "Endlosschleife", how: "Eine 20er-Serie schaffen", ok: () => G.best >= 20 },
    { id: "junior", name: "Junior Developer", how: "Level 10 erreichen", ok: () => G.level >= 10 },
    { id: "senior", name: "Senior Developer", how: "Level 20 erreichen", ok: () => G.level >= 20 },
    { id: "10x", name: "10x-Entwickler", how: "Level 30 erreichen", ok: () => G.level >= 30 },
    { id: "gruener-daumen", name: "Grüner Daumen", how: "100 Fragen auf Grün bringen", ok: () => cntQ((id, r) => r.s === 2) >= 100 },
    { id: "paragrafenreiter", name: "Paragrafenreiter", how: "50 SoWi-Fragen auf Grün bringen", ok: () => cntQ((id, r) => r.s === 2 && QMAP[id] && TP[QMAP[id].topic] && TP[QMAP[id].topic].teil === "SoWi") >= 50 },
    { id: "fullstack", name: "Full-Stack-Azubi", how: "In jedem Thema mindestens eine Frage auf Grün", ok: () => TOPICS.every((t) => topicQ(t.id).some((q) => st(q.id) === 2)) },
    { id: "production", name: "Ready for Production", how: "90 % Prüfungsreife erreichen", ok: () => counts(allQ()).pct >= 0.9 },
    { id: "simulant", name: "Prüfungssimulant", how: "Eine Prüfungssimulation abschließen", ok: () => (env.S().runs || []).length > 0 },
    { id: "404", name: "404: Freizeit not found", how: "100 Fragen an einem Tag beantworten", ok: () => !!(G.today && G.today.answered >= 100) },
    { id: "nachteule", name: "Nachteule", how: "Zwischen Mitternacht und 4 Uhr lernen", ok: () => !!(G.flags && G.flags.nacht) },
    { id: "lootbox", name: "Lootbox-Lobbyist", how: "100-mal die Schatzkammer öffnen", ok: () => G.pulls >= 100 },
    { id: "gluckspilz", name: "Glückspilz", how: "Ein legendäres Teil finden", ok: () => SKINS.some((s) => s.rar === "SSR" && G.owned[s.id]) },
    { id: "garderobe", name: "Garderoben-Admin", how: "30 Skins sammeln", ok: () => SKINS.filter((s) => s.rar !== "S" && s.rar !== "EV" && G.owned[s.id]).length >= 30 },
    { id: "works-on-my-machine", name: "Works on my machine", how: "Zwei Geräte per Sync verbinden", ok: () => !!syncGet() },
    { id: "rangliste", name: "Ranglisten-Rookie", how: "In der Rangliste mitmachen", ok: () => !!lbGet().joined }
  ].concat(EVENTS.filter((e) => e.reward.kind === "title").map((e) => ({ id: e.reward.id, name: e.reward.name, how: `Abschlusstest im Event „${e.kurz}“ bestehen – nur bis ${new Date(e.ende + "T12:00:00").toLocaleDateString("de-DE")}`, ev: e.id })));
  const TI = Object.assign(Object.create(null), Object.fromEntries(TITLES.map((t) => [t.id, t]))); // ohne Prototyp: „constructor“ o. Ä. ist kein Titel
  function titleCheck() {
    G.titles = G.titles || {};
    const neu = TITLES.filter((t) => { if (!t.ok || G.titles[t.id]) return false; try { return t.ok(); } catch (e) { return false; } });
    if (!neu.length) return;
    neu.forEach((t) => { G.titles[t.id] = Date.now(); }); save();
    setTimeout(() => toast(neu.length === 1 ? `🏷️ Neuer Titel: ${esc(neu[0].name)} – anlegen in der Garderobe` : `🏷️ ${neu.length} neue Titel freigeschaltet – schau in die Garderobe`), 400);
  }
  function titlesHTML() {
    const have = TITLES.filter((t) => G.titles[t.id]).length;
    return `<section class="card"><div class="row" style="justify-content:space-between"><h3>Titel</h3><span class="small muted">${have}/${TITLES.length}</span></div><p class="small muted">Dein Titel steht in der Rangliste unter deinem Namen. Grau = noch nicht freigeschaltet, darunter steht, wie du ihn bekommst.</p>
      <div class="gm-titles"><button type="button" class="gm-ttl ${G.title ? "" : "on"}" data-gm-title=""><b>Kein Titel</b><span>Es wird kein Titel angezeigt</span></button>${TITLES.map((t) => { const own = !!G.titles[t.id]; return `<button type="button" class="gm-ttl ${own ? "" : "locked"} ${G.title === t.id ? "on" : ""} ${t.ev ? "ev" : ""}" data-gm-title="${t.id}" ${own ? "" : "disabled"}><b>${esc(t.name)}</b><span>${esc(t.how)}</span>${t.ev ? `<i class="gm-tag ev">EVENT</i>` : ""}</button>`; }).join("")}</div></section>`;
  }
  // ---- Events: Sonderbelohnungen, nur bis zum Klausurtermin
  const evRec = (e) => (G.ev[e.id] = G.ev[e.id] || {});
  const evEq = (e) => Object.assign({}, G.equip[G.char], { shirt: `${G.char}-${e.reward.art}` });
  function evPreview(e) { return e.reward.kind === "shirt" ? `<div class="ev-fig">${figure(G.char, evEq(e))}</div>` : `<div class="ev-tt">🏷️<b>«${esc(e.reward.name)}»</b></div>`; }
  function evKap(e, kid) { const r = evRec(e); r.kap = r.kap || {}; if (r.kap[kid]) return false; r.kap[kid] = Date.now(); G.federn += 80; addXP(40); save(); toast("📘 Kapitel gemeistert: +80 🪶 · +40 XP"); try { syncSoon(3000); } catch (x) {} lbSoon(5000); return true; }
  function evFinal(e, sure, n) {
    const r = evRec(e), q = n ? sure / n : 0, pass = n > 0 && q >= 0.8, on = today() >= e.start && today() <= e.ende;
    r.best = Math.max(+r.best || 0, q); if (pass && !r.done) r.done = Date.now();
    let got = false;
    if (pass && on && !r.got) {
      r.got = Date.now(); got = true;
      if (e.reward.kind === "shirt") CHARS.forEach((c) => { if (IT[`${c}-${e.reward.art}`]) G.owned[`${c}-${e.reward.art}`] = 1; });
      else G.titles[e.reward.id] = Date.now();
      G.federn += 300; G.tickets += 2; const up = addXP(200, true);
      setTimeout(() => evRewardModal(e, up), 400);
    }
    save(); lbSoon(5000); try { syncSoon(3000); } catch (x) {}
    return { pass, got, late: pass && !on && !r.got };
  }
  function evRewardModal(e, up) {
    const shirt = e.reward.kind === "shirt"; confetti(70);
    modal(`<span class="gm-kicker">EVENT-BELOHNUNG · ${esc(e.kurz)}</span><div class="gm-ava-big" style="width:150px;margin-top:10px">${shirt ? figure(G.char, evEq(e)) : myFigure()}</div><h2>${esc(e.reward.name)}</h2>${shirt ? "" : `<p class="gm-title-big">«${esc(e.reward.name)}»</p>`}<p class="muted">${esc(e.reward.txt)}</p><p class="gm-gain">+300 🪶 · +2 🎟️ · +200 XP${up ? ` · Level ${G.level}!` : ""}</p><div class="row" style="justify-content:center"><button type="button" class="btn primary" data-gm-evwear>${shirt ? "Jetzt anziehen" : "Titel anlegen"}</button><button type="button" class="btn" data-gm-close>Später</button></div>`);
    const b = layer.querySelector("[data-gm-evwear]"); if (b) b.onclick = () => { if (shirt) { const id = `${G.char}-${e.reward.art}`; if (G.owned[id]) G.equip[G.char].shirt = id; } else { G.title = e.reward.id; G.titleAt = Date.now(); } G.lookAt = Date.now(); save(); lbSoon(3000); try { syncSoon(3000); } catch (x) {} closeModal(); };
  }
  const need = (l) => 80 + l * 40;
  const rank = (l) => RANKS.filter(([n]) => l >= n).pop()[1];
  const mult = (c) => (c >= 10 ? 3 : c >= 6 ? 2 : c >= 3 ? 1.5 : 1);
  const fmtM = (m) => "×" + String(m).replace(".", ",");
  const pct = (x) => (x * 100).toLocaleString("de", { maximumFractionDigits: 2 }) + " %";
  const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

  // ---- Zustand
  const fresh = () => ({ v: 1, earned: 0, xp: 0, level: 1, federn: 300, tickets: 1, combo: 0, best: 0, lastLogin: null, loginClaimed: null, loginStreak: 0, calIdx: 0, calRound: 1, today: null, quests: null, owned: {}, equip: {}, char: "rabe", banner: "rabe", boosts: { xp2: 0, shield: 0 }, xp2Left: 0, shieldOn: false, pity: {}, hist: [], pulls: 0, tab: "quests" }); // G.lookAt (erst beim ersten Wechsel gesetzt): Zeitpunkt der letzten Wahl von Figur/Ausrüstung, für den Abgleich zwischen Geräten
  let G = fresh(), ready = false;
  const ensure = () => { if (!ready) { ready = true; load(); } };
  function fix() {
    if (!G.owned || typeof G.owned !== "object") G.owned = {};
    SKINS.filter((i) => i.rar === "S").forEach((i) => { G.owned[i.id] = 1; });
    G.equip = G.equip || {};
    CHARS.forEach((c) => { const e = G.equip[c] = Object.assign(baseEquip(c), G.equip[c] || {}); SLOTS.forEach(([sl]) => { if (!IT[e[sl]] || !G.owned[e[sl]] || IT[e[sl]].char !== c) e[sl] = baseEquip(c)[sl]; }); });
    if (!ANIMALS[G.char]) G.char = "rabe"; if (!ANIMALS[G.banner]) G.banner = "rabe";
    if (!G.titles || typeof G.titles !== "object") G.titles = {}; if (!G.ev || typeof G.ev !== "object") G.ev = {}; if (G.title && (!TI[G.title] || !G.titles[G.title])) G.title = "";
    if (G.title && !G.titleAt) G.titleAt = +G.lookAt || 1; // Titel aus v2.6/2.7 (ohne eigenen Zeitpunkt): gilt ab seiner letzten Wahl
    G.boosts = Object.assign({ xp2: 0, shield: 0 }, G.boosts || {}); G.pity = G.pity || {}; G.hist = Array.isArray(G.hist) ? G.hist : [];
    if (G.quests && (!Array.isArray(G.quests.ids) || !G.quests.ids.every((id) => QPOOL.some((q) => q.id === id)))) G.quests = null; // alte Quests → neu würfeln, Tageszähler bleiben
    ["earned", "xp", "level", "federn", "tickets", "pulls"].forEach((k) => { G[k] = Math.max(k === "level" ? 1 : 0, Math.floor(+G[k] || 0)); });
    // Felder, die angezeigt werden, auf ihren Typ zwingen (Belohnungen können aus Link, Sicherung oder Sync kommen)
    ["combo", "best", "loginStreak", "calIdx", "xp2Left"].forEach((k) => { G[k] = Math.max(0, Math.floor(num(G[k]))); });
    G.calRound = Math.max(1, Math.floor(num(G.calRound, 1)));
    ["lastLogin", "loginClaimed"].forEach((k) => { if (G[k] != null && !dayStr(G[k])) G[k] = null; });
    if (G.today != null && (!isObj(G.today) || !dayStr(G.today.day))) G.today = null;
    if (G.today) Object.keys(G.today).forEach((k) => { if (k !== "day") G.today[k] = Math.max(0, num(G.today[k])); });
    G.boosts = { xp2: Math.max(0, num(G.boosts.xp2)), shield: Math.max(0, num(G.boosts.shield)) }; G.shieldOn = !!G.shieldOn;
    G.pity = mapObj(G.pity, (p) => (isObj(p) ? Object.assign(plain(p), { ssr: Math.max(0, num(p.ssr)), sr: Math.max(0, num(p.sr)), guar: !!p.guar }) : null)); // pro Tier: { ssr, sr, guar }
    G.hist = G.hist.filter((r) => typeof r === "string" && /^[A-Z]{1,4}$/.test(r)).slice(0, 60);
    if (G.quests) { G.quests.chest = !!G.quests.chest; if (!Array.isArray(G.quests.claimed)) G.quests.claimed = []; }
    if (!["quests", "schatz", "garderobe"].includes(G.tab)) G.tab = "quests";
    ["lookAt", "titleAt"].forEach((k) => { if (G[k] != null) G[k] = num(G[k]); });
  }
  function save() { try { localStorage.setItem(KEY_GAMI, JSON.stringify(G)); } catch (e) {} }
  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY_GAMI); } catch (e) {}
    if (raw) {
      try { G = Object.assign(fresh(), JSON.parse(raw)); fix(); return; }
      catch (e) { try { localStorage.setItem(KEY_GAMI + "-defekt", raw); } catch (x) {} } // nichts wegwerfen
    }
    // Erster Start: Startbonus aus dem bisherigen Lernstand (einmalig, ohne Popups)
    G = fresh(); fix();
    const q = Object.values(env.S().q || {}), bonus = q.reduce((a, r) => a + (r.s === 2 ? 10 : r.s === 1 ? 5 : r.s === 0 ? 2 : 0), 0);
    G.earned = bonus; G.xp = bonus; while (G.xp >= need(G.level)) { G.xp -= need(G.level); G.level++; }
    G.federn += (G.level - 1) * 100; G.tickets += Math.floor(G.level / 5);
    save();
  }
  window.addEventListener("storage", (e) => { if (e.key === KEY_GAMI && e.newValue) { try { ready = true; G = Object.assign(fresh(), JSON.parse(e.newValue)); fix(); if (env.view() === "belohnungen") render(); else hud(); } catch (x) {} } });

  function rollDay() {
    const t = today();
    if (!G.today || G.today.day !== t) { G.today = { day: t, answered: 0, correct: 0, maxCombo: 0, sowi: 0, t2: 0, green: 0, fixed: 0, fresh: 0 }; G.quests = null; }
    if (!G.quests || !Array.isArray(G.quests.ids) || G.quests.ids.length !== QN || !G.quests.ids.every((id) => QPOOL.some((q) => q.id === id))) {
      const pool = QPOOL.slice(); let h = hash(t); const ids = [];
      while (ids.length < QN) { const q = pool.splice(h % pool.length, 1)[0]; if (!(q.key === "maxCombo" && ids.some((x) => /^combo/.test(x)))) ids.push(q.id); h = hash(t + ":" + ids.length + ":" + pool.length); if (!pool.length) break; }
      G.quests = { ids, claimed: [], chest: false };
    }
  }
  const qprog = (q) => (q.calc ? q.calc(G.today) : Math.min(q.goal, G.today[q.key] || 0));
  const claimable = () => { rollDay(); return G.loginClaimed !== today() || G.quests.ids.some((id) => { const q = QPOOL.find((x) => x.id === id); return qprog(q) >= q.goal && !G.quests.claimed.includes(id); }) || (G.quests.claimed.length === G.quests.ids.length && !G.quests.chest); };

  // ---- Figur
  let gid = 0;
  function figure(c, eq) {
    const A = ANIMALS[c], art = (s) => (IT[eq[s]] || {}).art || "";
    const id = "gm" + (++gid), bgArt = art("bg") || A.base, e = art("eye");
    const [hx, hy, hr, hs] = A.a.hat, [ex, ey, es] = A.a.eye, [nx, ny, ns] = A.a.neck;
    return `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${BG[bgArt](id)}${A.body}${SHIRT[art("shirt")] ? SHIRT[art("shirt")](c, id) : ""}<g transform="translate(${nx} ${ny}) scale(${ns}) translate(-260 -310)">${NECK[art("neck")] || ""}</g><g transform="translate(${hx} ${hy}) rotate(${hr}) scale(${hs}) translate(-268 -150)">${HAT[art("hat")] || ""}</g>${HIDE_EYE.has(e) ? "" : A.eye}<g transform="translate(${ex} ${ey}) scale(${es}) translate(-240 -222)">${EYE[e] || ""}</g></svg>`;
  }
  const myFigure = () => figure(G.char, G.equip[G.char]);
  const preview = (it) => { if (it.icon) return `<div class="gm-icon">${it.icon}</div>`; const eq = baseEquip(it.char); eq[it.slot] = it.id; return figure(it.char, eq); };
  const tile = (it, extra = "", cls = "") => `<div class="gm-tile r-${it.rar} ${cls}">${extra}${preview(it)}<div class="gm-nm">${esc(it.name)}</div><div class="gm-rar">${RAR[it.rar]}</div></div>`;

  // ---- Effekte
  let layer = null;
  function ensureLayer() { if (layer) return; layer = document.createElement("div"); layer.innerHTML = `<div class="gm-modal" hidden><div class="gm-mbox" role="dialog" aria-modal="true"></div></div><div class="gm-toasts" aria-live="polite"></div>`; document.body.appendChild(layer); layer.querySelector(".gm-modal").addEventListener("click", (e) => { if (e.target.classList.contains("gm-modal") || e.target.closest("[data-gm-close]")) closeModal(); }); }
  function modal(html) { ensureLayer(); const m = layer.querySelector(".gm-modal"); m.querySelector(".gm-mbox").innerHTML = html; m.hidden = false; m.querySelector(".gm-mbox").scrollTop = 0; }
  function closeModal() { if (layer) layer.querySelector(".gm-modal").hidden = true; render(); }
  function toast(html) { ensureLayer(); const t = document.createElement("div"); t.className = "gm-toast"; t.innerHTML = html; layer.querySelector(".gm-toasts").appendChild(t); setTimeout(() => t.remove(), 2600); }
  function confetti(n = 50) { if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return; const cols = ["#6AD2E2", "#FFD03D", "#E2468A", "#928BDE", "#3B8CF0", "#1EAD1B"]; for (let i = 0; i < n; i++) { const c = document.createElement("div"); c.className = "gm-confetti"; c.style.left = Math.random() * 100 + "vw"; c.style.background = cols[i % cols.length]; c.style.animationDelay = Math.random() * 0.4 + "s"; document.body.appendChild(c); setTimeout(() => c.remove(), 2600); } }

  // ---- Fortschritt
  function addXP(n, quiet) { G.xp += n; G.earned += n; let up = 0; while (G.xp >= need(G.level)) { G.xp -= need(G.level); G.level++; up++; G.federn += 100; if (G.level % 5 === 0) G.tickets++; } if (up && !quiet) setTimeout(levelUp, 500); return up; }
  function levelUp() {
    const l = G.level, newRank = RANKS.some(([n]) => n === l);
    confetti();
    modal(`<div class="gm-ava-big" style="width:130px">${myFigure()}</div><h2>Level ${l}!</h2>${newRank ? `<p>Neuer Rang: <b>${rank(l)}</b></p>` : `<p class="muted">${rank(l)}</p>`}<p class="gm-gain">+100 🪶${l % 5 === 0 ? " · +1 🎟️" : ""}</p><button type="button" class="btn primary" data-gm-close>Weiter</button>`);
  }
  // Nur „sicher gewusst“ zählt: XP, Federn, Serie und die Quests für richtige Antworten.
  // „Unsicher“ (Wissensfrage) oder „Geraten“ (Auswahlfrage) gibt nichts und beendet die Serie – wie ein Fehler (Serien-Schild rettet sie).
  let LAST = null;
  const SNAP = ["earned", "xp", "level", "federn", "tickets", "combo", "best", "xp2Left", "shieldOn", "today"];
  function onAnswer(q, ok, unsure, f, t, noSnap) {
    rollDay();
    if (!noSnap) LAST = { id: q.id, f, snap: JSON.stringify(Object.fromEntries(SNAP.map((k) => [k, G[k]]))) };
    const st = G.today, tp = TP[q.topic], sure = ok && !unsure;
    st.answered++;
    if (tp && tp.teil === "SoWi") st.sowi++;
    if (tp && tp.teil !== "SoWi" && tp.teil.includes("2")) st.t2 = (st.t2 || 0) + 1;
    if (f === -1) st.fresh = (st.fresh || 0) + 1;
    let msg;
    if (sure) {
      G.combo++; st.correct++; st.maxCombo = Math.max(st.maxCombo, G.combo); G.best = Math.max(G.best, G.combo);
      if (f === 0) st.fixed = (st.fixed || 0) + 1;
      if (t === 2 && f !== 2) st.green = (st.green || 0) + 1;
      const m = mult(G.combo), boost = G.xp2Left > 0 ? 2 : 1; if (boost > 1) G.xp2Left--;
      const xp = Math.round(10 * m * boost); G.federn += 5; addXP(xp);
      msg = `+${xp} XP${m > 1 ? ` · ${fmtM(m)}` : ""}${boost > 1 ? " · 🧪" : ""}`;
      if ([3, 6, 10].includes(G.combo)) setTimeout(() => toast(`🔥 ${G.combo}er-Serie! Ab jetzt ${fmtM(mult(G.combo))} XP`), 150);
    } else {
      if (ok) msg = "Nicht sicher · keine XP";
      if (G.shieldOn && G.combo > 0) { G.shieldOn = false; setTimeout(() => toast("🛡️ Das Schild hat deine Serie gerettet"), 150); }
      else G.combo = 0;
    }
    if (new Date().getHours() < 4) (G.flags = G.flags || {}).nacht = 1;
    titleCheck();
    save(); lbSoon();
    if (msg) setTimeout(() => { ensureLayer(); const fl = document.createElement("div"); fl.className = "gm-float" + (sure ? "" : " gm-float-off"); fl.textContent = msg; document.body.appendChild(fl); setTimeout(() => fl.remove(), 1200); }, 30);
  }
  // „Geraten“ nach einer richtigen Auswahlfrage: XP und Serie dieser Antwort zurücknehmen und als unsicher werten
  function onGuess(q) {
    if (!LAST || LAST.id !== q.id || LAST.done) return;
    Object.assign(G, JSON.parse(LAST.snap)); LAST.done = true;
    onAnswer(q, true, true, LAST.f, 1, true);
  }
  function grant(it) {
    if (it.slot === "cur") { G.federn += 30; return { it, gain: "+30 🪶" }; }
    if (it.slot === "boost") { G.boosts[it.id]++; return { it, gain: "+1" }; }
    if (G.owned[it.id]) { G.federn += GACHA.refund[it.rar]; return { it, dup: true, gain: "+" + GACHA.refund[it.rar] + " 🪶" }; }
    G.owned[it.id] = 1; return { it, isNew: true };
  }

  // ---- Login-Kalender
  const calLabel = (r) => (r.f ? `<b>🪶</b>${r.f}` : r.t ? `<b>🎟️</b>${r.t}× Ticket` : `<b>${IT[r.b].icon}</b>${IT[r.b].name}`);
  const calHTML = (nowIdx) => `<div class="gm-cal">${CAL.map((r, i) => `<div class="${i < G.calIdx ? "done" : ""} ${i === nowIdx ? "now" : ""} ${i === 6 ? "big" : ""}">Tag ${i + 1}${calLabel(r)}</div>`).join("")}</div>`;
  function showLogin() {
    const t = today(); if (G.loginClaimed === t) return;
    const cont = G.lastLogin && daysBetween(G.lastLogin, t) === 1, streak = cont ? G.loginStreak + 1 : 1, lost = G.lastLogin && !cont && G.loginStreak > 1, r = CAL[G.calIdx];
    modal(`<h2>Willkommen zurück!</h2><p class="muted">${lost ? `Deine 🔥-Serie von ${G.loginStreak} Tagen ist gerissen – der Kalender läuft trotzdem weiter.` : `Tagesserie: <b>🔥 ${streak}</b>`} · Runde ${G.calRound}</p><div style="margin:14px 0">${calHTML(G.calIdx)}</div><button type="button" class="btn primary" data-gm-login>Tag ${G.calIdx + 1} abholen</button>`);
    layer.querySelector("[data-gm-login]").onclick = () => {
      if (G.loginClaimed === today()) return closeModal();
      if (r.f) G.federn += r.f; if (r.t) G.tickets += r.t; if (r.b) G.boosts[r.b]++;
      G.loginStreak = streak; G.lastLogin = t; G.loginClaimed = t; G.calIdx++;
      if (G.calIdx >= CAL.length) { G.calIdx = 0; G.calRound++; confetti(40); setTimeout(() => toast(`Woche geschafft! Runde ${G.calRound} beginnt – alle Belohnungen wieder verfügbar`), 300); }
      save(); closeModal(); toast(`Login-Bonus: ${r.f ? "+" + r.f + " 🪶" : r.t ? "+" + r.t + " 🎟️" : "+1 " + IT[r.b].name}`);
    };
  }

  // ---- Schatzkammer
  const poolOf = (c, r) => ITEMS.filter((i) => i.rar === r && (i.char === c || !i.char));
  const ssrChance = (n) => (n >= GACHA.hardPity ? 1 : Math.min(1, GACHA.rates.SSR + Math.max(0, n - GACHA.softPity + 1) * GACHA.softStep));
  const pityOf = (c) => (G.pity[c] = G.pity[c] || { ssr: 0, sr: 0, guar: false });
  function featuredOf(c) { const l = SKINS.filter((s) => s.char === c && s.rar === "SSR"), w = Math.floor((new Date(today() + "T12:00:00").getTime() / 864e5 + 3) / 7); return l[(w + CHARS.indexOf(c)) % l.length]; }
  const daysToMonday = () => { const d = new Date(today() + "T12:00:00").getDay(); return ((8 - d) % 7) || 7; };
  function rollOne(c) {
    const P = pityOf(c); P.ssr++; P.sr++;
    const pS = ssrChance(P.ssr), x = Math.random();
    const r = x < pS ? "SSR" : (P.sr >= GACHA.srEvery || x < pS + GACHA.rates.SR) ? "SR" : x < pS + GACHA.rates.SR + GACHA.rates.R ? "R" : "N";
    let item;
    if (r === "SSR") { const feat = featuredOf(c); if (P.guar || Math.random() < GACHA.featured) { item = feat; P.guar = false; } else { const o = poolOf(c, "SSR").filter((i) => i.id !== feat.id); item = o[Math.floor(Math.random() * o.length)]; P.guar = true; } P.ssr = 0; P.sr = 0; }
    else { if (r === "SR") P.sr = 0; const pool = poolOf(c, r); item = pool[Math.floor(Math.random() * pool.length)]; }
    G.pulls++; return item;
  }
  function pull(n) {
    const c = G.banner, useT = G.tickets >= n, cost = n === 1 ? GACHA.cost1 : GACHA.cost10;
    if (!useT && G.federn < cost) return;
    if (useT) G.tickets -= n; else G.federn -= cost;
    const feat = featuredOf(c), items = Array.from({ length: n }, () => rollOne(c)), res = items.map(grant);
    items.forEach((i) => G.hist.unshift(i.rar)); G.hist = G.hist.slice(0, 60); save();
    const top = ["SSR", "SR", "R", "N"].find((r) => items.some((i) => i.rar === r));
    const col = { SSR: ["#F7C948", "#C98A00"], SR: ["#B98AF5", "#7B45C9"], R: ["#7DB3F5", "#3B6FC0"], N: ["#C9A27A", "#8A6440"] }[top];
    modal(`<h2>${n === 1 ? "Die Truhe öffnet sich …" : "Zehn Truhen öffnen sich …"}</h2><svg class="gm-chest glow-${top}" viewBox="0 0 160 130" aria-hidden="true"><rect x="18" y="58" width="124" height="64" rx="8" fill="${col[0]}"/><path d="M18 64 C18 18 142 18 142 64 Z" fill="${col[1]}"/><rect x="18" y="58" width="124" height="10" fill="${col[1]}"/><rect x="70" y="52" width="20" height="28" rx="4" fill="#FFE58A" stroke="#8A6440" stroke-width="3"/><path d="M40 70 v50 M120 70 v50" stroke="${col[1]}" stroke-width="6"/></svg><p class="muted small">${top === "SSR" ? "Goldenes Licht dringt heraus …!" : top === "SR" ? "Es schimmert violett …" : "Es rumpelt …"}</p>`);
    setTimeout(() => {
      if (top === "SSR") confetti(90);
      const won = items.some((i) => i.id === feat.id), lost = items.some((i) => i.rar === "SSR" && i.id !== feat.id);
      modal(`<h2>${top === "SSR" ? (won ? "Legendär – das Highlight!" : "Legendär!") : top === "SR" ? "Episch!" : "Geöffnet"}</h2>
        <div class="gm-pulls ${n === 1 ? "one" : ""}">${res.map((x, k) => tile(x.it, x.isNew ? `<span class="gm-tag">NEU</span>` : x.dup ? `<span class="gm-tag dup">${x.gain}</span>` : "").replace('class="gm-tile', `style="animation-delay:${k * 0.1}s" class="gm-tile`)).join("")}</div>
        ${lost ? `<p class="small" style="color:#C98A00;font-weight:700">Nicht das Highlight – dafür ist dein nächstes Legendär hier garantiert ${esc(feat.name)}.</p>` : ""}${res.some((x) => x.dup) ? `<p class="small muted">Doppelte Teile werden in Federn umgewandelt.</p>` : ""}
        <div class="row" style="justify-content:center"><button type="button" class="btn primary" data-gm-close>Weiter</button>${G.tickets >= n || G.federn >= cost ? `<button type="button" class="btn" data-gm-again="${n}">Nochmal ${n}×</button>` : ""}</div>`);
      const a = layer.querySelector("[data-gm-again]"); if (a) a.onclick = () => pull(n);
    }, 1000);
  }
  function showInfo(c) {
    const A = ANIMALS[c], feat = featuredOf(c), skins = SKINS.filter((s) => s.char === c && s.rar !== "S" && s.rar !== "EV");
    const group = (r) => { const pool = poolOf(c, r), sk = pool.filter((i) => !i.icon); return `<h3 class="gm-ih"><span class="r-${r}">${RAR[r]} · ${pct(GACHA.rates[r])}</span><span class="small muted">${sk.filter((i) => G.owned[i.id]).length}/${sk.length} gefunden · ${r === "SSR" ? `Highlight ${pct(GACHA.rates.SSR * GACHA.featured)}, je anderes ${pct(GACHA.rates.SSR * (1 - GACHA.featured) / (pool.length - 1))}` : `je Teil ${pct(GACHA.rates[r] / pool.length)}`}</span></h3><div class="gm-tiles">${sk.map((i) => tile(i, i.id === feat.id ? `<span class="gm-tag feat">HIGHLIGHT</span>` : "", (G.owned[i.id] ? "" : "locked") + (G.equip[c][i.slot] === i.id ? " eq" : ""))).join("")}</div>`; };
    modal(`<div class="gm-info"><div class="row" style="justify-content:space-between"><h2>${esc(A.banner)}</h2><button type="button" class="btn small" data-gm-close>Schließen</button></div>
      <p class="small muted">Gesammelt: ${skins.filter((s) => G.owned[s.id]).length}/${skins.length} Skins · Farbig = in deiner Garderobe, grau = noch nicht gefunden, ✓ = angezogen. Pro Slot: 4 Normal, 3 Selten, 2 Episch, 1 Legendär.</p>
      ${["SSR", "SR", "R", "N"].map(group).join("")}
      <h3 class="gm-ih">Extras <span class="small muted">verbrauchbar, zählen nicht zur Sammlung</span></h3><div class="gm-tiles">${EXTRAS.map((i) => { const n = i.slot === "boost" ? G.boosts[i.id] : 0; return tile(i, n ? `<span class="gm-tag">×${n}</span>` : "", n ? "" : "locked"); }).join("")}</div>
      <h3 class="gm-ih">Regeln</h3><ul class="small muted" style="padding-left:18px;margin:0;text-align:left"><li>Episch oder besser spätestens alle ${GACHA.srEvery} Züge.</li><li>Ab Zug ${GACHA.softPity} steigt die Legendär-Chance um ${GACHA.softStep * 100} Prozentpunkte pro Zug, bei Zug ${GACHA.hardPity} ist es sicher.</li><li>Jedes Legendär ist zu ${GACHA.featured * 100} % das Wochen-Highlight; sonst ist das nächste garantiert das Highlight.</li><li>Zähler pro Kollektion. Mit allen Garantien kommt Legendär im Schnitt etwa alle 47 Züge.</li><li>Federn gibt es nur durchs Lernen – kein Echtgeld.</li></ul></div>`);
  }

  // ---- Seite
  const charSel = (attr, cur, label) => `<div class="gm-sel">${CHARS.map((c) => `<button type="button" class="gm-bsel" data-gm-${attr}="${c}" aria-pressed="${c === cur}"><span class="gm-mini">${figure(c, G.equip[c])}</span>${esc(label(c))}</button>`).join("")}</div>`;
  function rQuests() {
    const qs = G.quests.ids.map((id) => QPOOL.find((q) => q.id === id)), all = G.quests.claimed.length === G.quests.ids.length;
    return `<section class="card"><div class="row" style="justify-content:space-between"><h3>Tagesquests</h3><span class="small muted">neu um Mitternacht</span></div>
      ${qs.map((q) => { const p = qprog(q), done = G.quests.claimed.includes(q.id); return `<div class="gm-quest"><div><b>${esc(q.txt)}</b><div class="bar"><i style="width:${p / q.goal * 100}%"></i></div><div class="small muted">${p}/${q.goal}${q.note ? q.note(G.today) : ""} · ${q.f} 🪶 + ${q.xp} XP</div></div><button type="button" class="btn small ${p >= q.goal && !done ? "primary" : ""}" data-gm-claim="${q.id}" ${p < q.goal || done ? "disabled" : ""}>${done ? "✓ Erledigt" : "Abholen"}</button></div>`; }).join("")}
      <div class="gm-quest"><div><b>🎁 Tagestruhe</b><div class="small muted">Alle fünf Quests abholen · 300 🪶 + 2 🎟️</div></div><button type="button" class="btn small ${all && !G.quests.chest ? "primary" : ""}" data-gm-chest ${!all || G.quests.chest ? "disabled" : ""}>${G.quests.chest ? "✓ Geöffnet" : "Öffnen"}</button></div></section>
      <section class="card"><div class="row" style="justify-content:space-between"><h3>Login-Kalender <span class="small muted">· Runde ${G.calRound}</span></h3><span class="chip">🔥 ${G.loginStreak} ${G.loginStreak === 1 ? "Tag" : "Tage"}</span></div>
      <p class="small muted">Jeder Login-Tag rückt ein Feld weiter. Nach Tag 7 beginnt die nächste Runde mit denselben Belohnungen. Ein ausgelassener Tag setzt nur die 🔥-Serie zurück.</p>
      ${calHTML(G.loginClaimed !== today() ? G.calIdx : -1)}${G.loginClaimed !== today() ? `<div class="row" style="margin-top:12px"><button type="button" class="btn primary" data-gm-showlogin>Heutigen Bonus abholen</button></div>` : ""}</section>
      <section class="card"><h3>So bekommst du XP</h3><p class="small muted">Jede sicher richtige Antwort in einer Lernrunde: 10 XP und 5 🪶. „Unsicher“ oder „Geraten“ gibt nichts. Serie: 3 sicher richtig in Folge ×1,5 · 6 ×2 · 10 ×3. Ein Fehler, „unsicher“ oder „geraten“ beendet die Serie (außer mit Serien-Schild). Neue Level bringen 100 🪶, alle 5 Level ein Ticket.</p></section>`;
  }
  function rSchatz() {
    const c = G.banner, A = ANIMALS[c], P = pityOf(c), feat = featuredOf(c);
    const can1 = G.tickets >= 1 || G.federn >= GACHA.cost1, can10 = G.tickets >= 10 || G.federn >= GACHA.cost10, toSR = GACHA.srEvery - P.sr, toSSR = GACHA.hardPity - P.ssr, skins = SKINS.filter((s) => s.char === c && s.rar !== "S" && s.rar !== "EV");
    return `${charSel("banner", c, (x) => ANIMALS[x].banner)}
      <section class="card gm-banner"><span class="gm-kicker">${GACHA.name.toUpperCase()} · ${esc(A.banner.toUpperCase())}</span>
        <div class="gm-bgrid"><div>${tile(feat, G.owned[feat.id] ? `<span class="gm-tag">IM BESITZ</span>` : `<span class="gm-tag dup">NOCH NICHT</span>`)}</div>
          <div><span class="gm-rateup">WOCHEN-HIGHLIGHT</span><h2>${esc(feat.name)}</h2><p class="small gm-soft">50 % aller Legendären sind dieses Teil. Wechselt in ${daysToMonday()} ${daysToMonday() === 1 ? "Tag" : "Tagen"}. Gesammelt: ${skins.filter((s) => G.owned[s.id]).length}/${skins.length}.</p>${P.guar ? `<p class="small" style="color:#F7C948;font-weight:700">Dein nächstes Legendär ist garantiert das Highlight.</p>` : ""}</div></div>
        <div class="row"><button type="button" class="btn gm-gold" data-gm-pull="1" ${can1 ? "" : "disabled"}>1× öffnen · ${G.tickets >= 1 ? "1 🎟️" : GACHA.cost1 + " 🪶"}</button><button type="button" class="btn gm-gold" data-gm-pull="10" ${can10 ? "" : "disabled"}>10× öffnen · ${G.tickets >= 10 ? "10 🎟️" : GACHA.cost10 + " 🪶"}</button></div>
        <div class="gm-pity"><div class="row" style="justify-content:space-between"><span>Legendär spätestens in <b>${toSSR}</b> Zügen</span><span class="gm-soft">nächster Zug: ${pct(ssrChance(P.ssr + 1))}</span></div><div class="bar"><i style="width:${P.ssr / GACHA.hardPity * 100}%"></i></div><span>Episch oder besser spätestens in <b>${toSR}</b> ${toSR === 1 ? "Zug" : "Zügen"}</span><div class="bar sr"><i style="width:${P.sr / GACHA.srEvery * 100}%"></i></div></div></section>
      <section class="card"><div class="row" style="justify-content:space-between"><h3>Chancen</h3><button type="button" class="gm-q" data-gm-info="${c}" aria-label="Alle Teile dieser Kollektion anzeigen" title="Alle Teile dieser Kollektion">?</button></div>
        <table class="gm-rates"><tr><th>Seltenheit</th><th>Chance</th><th>Skins</th></tr>${["SSR", "SR", "R", "N"].map((r) => { const p = poolOf(c, r).filter((i) => !i.icon); return `<tr><td class="r-${r}"><b>${RAR[r]}</b></td><td>${pct(GACHA.rates[r])}</td><td>${p.filter((i) => G.owned[i.id]).length}/${p.length} gefunden</td></tr>`; }).join("")}</table>
        <p class="small muted">Tippe auf „?“, um alle Teile dieser Kollektion zu sehen. Federn gibt es nur durchs Lernen.</p></section>`;
  }
  function rGarderobe() {
    const c = G.char, eq = G.equip[c], skins = SKINS.filter((s) => s.char === c && s.rar !== "S" && s.rar !== "EV");
    return `${charSel("char", c, (x) => ANIMALS[x].name)}
      <section class="card" style="text-align:center"><div class="gm-ava-big">${myFigure()}</div>${(() => { const lb = lbGet(), nick = lb.joined && lb.name ? lb.name : ""; return `<h2 class="gm-figname" style="margin-top:12px">${esc(nick || ANIMALS[c].name)}</h2>${G.title && TI[G.title] ? `<p class="gm-title-big gm-figsub">«${esc(TI[G.title].name)}»</p>` : ""}<p class="small muted">${nick ? esc(ANIMALS[c].name) + " · " : ""}Level ${G.level} · Sammlung ${skins.filter((i) => G.owned[i.id]).length}/${skins.length}${nick ? "" : ` · <a href="#rangliste">Spitznamen wählen</a>`}</p>`; })()}</section>
      ${titlesHTML()}
      <section class="card"><h3>Boosts</h3><div class="gm-tiles">${["xp2", "shield"].map((id) => { const it = IT[id], n = G.boosts[id], act = id === "xp2" ? G.xp2Left > 0 : G.shieldOn; return `<div class="gm-tile r-${it.rar} ${n || act ? "" : "locked"}"><div class="gm-icon">${it.icon}</div><div class="gm-nm">${it.name} ×${n}</div><div class="small muted">${it.desc}</div><button type="button" class="btn small" data-gm-use="${id}" ${!n || act ? "disabled" : ""}>${act ? "aktiv" : "Benutzen"}</button></div>`; }).join("")}</div></section>
      ${SLOTS.map(([slot, label]) => { const list = SKINS.filter((i) => i.char === c && i.slot === slot).sort((a, b) => RORDER.indexOf(b.rar) - RORDER.indexOf(a.rar)); return `<section class="card"><div class="row" style="justify-content:space-between"><h3>${label}</h3><span class="small muted">${list.filter((i) => i.rar !== "S" && G.owned[i.id]).length}/${list.length - 1}</span></div><div class="gm-tiles">${list.map((i) => `<button type="button" class="gm-tbtn" data-gm-eq="${i.id}" ${G.owned[i.id] ? "" : "disabled"} title="${G.owned[i.id] ? "Anziehen" : i.ev ? "Nur als Event-Belohnung erhältlich" : "Noch nicht gefunden"}">${tile(i, i.ev ? `<span class="gm-tag ev">EVENT</span>` : "", (G.owned[i.id] ? "" : "locked") + (eq[slot] === i.id ? " eq" : ""))}</button>`).join("")}</div></section>`; }).join("")}`;
  }
  function viewHTML(el) {
    rollDay(); titleCheck();
    const tabs = [["quests", "Quests"], ["schatz", GACHA.name], ["garderobe", "Garderobe"]];
    el.innerHTML = `<div class="gm-head card"><div class="gm-ava">${myFigure()}</div><div class="gm-lvl"><div class="row" style="gap:8px;align-items:baseline"><b class="gm-lv">Level ${G.level}</b>${G.title && TI[G.title] ? `<span class="muted small">«${esc(TI[G.title].name)}»</span>` : ""}<span class="spacer"></span><span class="small muted num">${G.xp}/${need(G.level)} XP</span></div><div class="bar"><i style="width:${G.xp / need(G.level) * 100}%"></i></div></div><div class="gm-cur"><span class="chip">🪶 ${G.federn}</span><span class="chip">🎟️ ${G.tickets}</span><span class="chip">🔥 ${G.loginStreak}</span></div></div>
      <div class="tabs-in gm-tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" class="${G.tab === k ? "on" : ""}" aria-selected="${G.tab === k}" data-gm-tab="${k}">${l}</button>`).join("")}</div>
      <div class="gm-body">${G.tab === "schatz" ? rSchatz() : G.tab === "garderobe" ? rGarderobe() : rQuests()}</div>`;
    el.onclick = (e) => {
      const t = e.target.closest("button"); if (!t || t.disabled) return; const d = t.dataset;
      if (d.gmTab) { G.tab = d.gmTab; save(); render(); }
      else if (d.gmClaim) { const q = QPOOL.find((x) => x.id === d.gmClaim); if (qprog(q) < q.goal || G.quests.claimed.includes(q.id)) return; G.quests.claimed.push(q.id); G.federn += q.f; addXP(q.xp); save(); toast(`Quest erledigt: +${q.f} 🪶 · +${q.xp} XP`); render(); }
      else if (d.gmChest !== undefined) { if (G.quests.chest || G.quests.claimed.length < G.quests.ids.length) return; G.quests.chest = true; G.federn += 300; G.tickets += 2; save(); confetti(40); modal(`<div style="font-size:60px">🎁</div><h2>Tagestruhe</h2><p class="gm-gain">+150 🪶 · +1 🎟️</p><button type="button" class="btn primary" data-gm-close>Super</button>`); }
      else if (d.gmShowlogin !== undefined) showLogin();
      else if (d.gmPull) pull(+d.gmPull);
      else if (d.gmInfo) showInfo(d.gmInfo);
      else if (d.gmBanner) { G.banner = d.gmBanner; save(); render(); }
      else if (d.gmChar) { G.char = d.gmChar; G.lookAt = Date.now(); save(); render(); }
      else if (d.gmEq) { const it = IT[d.gmEq]; if (!it || !G.owned[it.id]) return; G.equip[it.char][it.slot] = it.id; G.lookAt = Date.now(); save(); render(); }
      else if (d.gmTitle !== undefined) { const id = d.gmTitle; if (id && !(G.titles || {})[id]) return; G.title = id; G.titleAt = G.lookAt = Date.now(); save(); render(); }
      else if (d.gmUse) { const id = d.gmUse; if (G.boosts[id] < 1) return; G.boosts[id]--; if (id === "xp2") G.xp2Left = 10; else G.shieldOn = true; save(); toast(`${IT[id].icon} ${IT[id].name} aktiviert`); render(); }
      if (d.gmClaim || d.gmChest !== undefined || d.gmPull || d.gmChar || d.gmEq || d.gmUse || d.gmTitle !== undefined) { try { syncSoon(3000); } catch (x) {} lbSoon(d.gmChar || d.gmEq || d.gmTitle !== undefined ? 5000 : 30000); } // Belohnungen auch ohne Lernen abgleichen
    };
    return true;
  }

  // ---- Übertragung und Sicherung: zusammenführen, nie verlieren
  function pack() {
    const own = {}; Object.keys(G.owned).forEach((id) => { const it = IT[id]; if (it && it.rar !== "S") (own[it.char] = own[it.char] || []).push(it.art); });
    const eq = {}; CHARS.forEach((c) => { eq[c] = SLOTS.map(([s]) => (IT[G.equip[c][s]] || {}).art || "").join("."); });
    return { v: 1, x: G.earned, l: G.level, p: G.xp, f: G.federn, t: G.tickets, o: Object.fromEntries(Object.entries(own).map(([c, l]) => [c, l.join(".")])), e: eq, c: G.char, b: [G.boosts.xp2, G.boosts.shield], y: G.pity, n: G.pulls, s: [G.loginStreak, G.lastLogin, G.calIdx, G.calRound, G.best], a: G.lookAt || 0, ti: Object.keys(G.titles || {}).filter((id) => TI[id]).join("."), tt: G.title || "", tz: G.titleAt || 0, ev: G.ev || {} };
  }
  function unpack(p) {
    if (!p || typeof p !== "object") return null;
    if (p.owned) return Object.assign(fresh(), plain(p)); // ganze Sicherung (fix() prüft danach alle Felder)
    const g = fresh(), s = p.s || [];
    Object.assign(g, { earned: +p.x || 0, level: +p.l || 1, xp: +p.p || 0, federn: +p.f || 0, tickets: +p.t || 0, char: p.c || "rabe", pity: p.y || {}, pulls: +p.n || 0, loginStreak: +s[0] || 0, lastLogin: s[1] || null, calIdx: +s[2] || 0, calRound: +s[3] || 1, best: +s[4] || 0 });
    g.boosts = { xp2: +(p.b || [])[0] || 0, shield: +(p.b || [])[1] || 0 }; if (+p.a) g.lookAt = +p.a;
    g.titles = {}; String(p.ti || "").split(".").forEach((id) => { if (TI[id]) g.titles[id] = 1; }); if (p.tt != null) g.title = TI[p.tt] ? String(p.tt) : ""; if (+p.tz) g.titleAt = +p.tz; else if (p.tt) g.titleAt = +p.a || 0; g.ev = p.ev && typeof p.ev === "object" ? p.ev : {};
    Object.entries(p.o || {}).forEach(([c, l]) => String(l).split(".").forEach((a) => { if (IT[c + "-" + a]) g.owned[c + "-" + a] = 1; }));
    Object.entries(p.e || {}).forEach(([c, l]) => { if (!ANIMALS[c]) return; const arts = String(l).split("."); g.equip[c] = baseEquip(c); SLOTS.forEach(([sl], i) => { if (i >= arts.length) { delete g.equip[c][sl]; return; } const id = c + "-" + arts[i]; if (arts[i] && IT[id] && IT[id].slot === sl) g.equip[c][sl] = id; }); });
    return g;
  }
  function merge(p) {
    const inc = unpack(p); if (!inc) return;
    Object.keys(inc.owned || {}).forEach((id) => { if (IT[id]) G.owned[id] = 1; });
    Object.keys(inc.titles || {}).forEach((id) => { if (TI[id] && !G.titles[id]) G.titles[id] = +inc.titles[id] || 1; });           // Titel: Vereinigung
    Object.entries(inc.ev || {}).forEach(([k, r]) => { if (!r || typeof r !== "object") return; const m = G.ev[k] = G.ev[k] || {}; m.best = Math.max(+m.best || 0, +r.best || 0); ["done", "got"].forEach((f) => { if (+r[f] && (!+m[f] || +r[f] < +m[f])) m[f] = +r[f]; }); m.kap = Object.assign({}, r.kap || {}, m.kap || {}); }); // Events: nie verlieren           // Skins: Vereinigung
    G.boosts.xp2 = Math.max(G.boosts.xp2, +inc.boosts.xp2 || 0); G.boosts.shield = Math.max(G.boosts.shield, +inc.boosts.shield || 0);
    if (inc.title !== undefined && (+inc.titleAt || 0) > (+G.titleAt || 0) && (!inc.title || G.titles[inc.title])) { G.title = inc.title; G.titleAt = +inc.titleAt; } // Titel: die zuletzt getroffene Wahl
    const ahead = (+inc.earned || 0) > G.earned, tie = (+inc.earned || 0) === G.earned, incA = +inc.lookAt || 0, myA = +G.lookAt || 0;
    const lookKey = (g) => g.char + "|" + CHARS.map((c) => SLOTS.map(([s]) => ((g.equip || {})[c] || {})[s] || "").join(",")).join(";");
    if (ahead) {                                                                                 // Fortschritt: der weiter fortgeschrittene Stand
      ["earned", "xp", "level", "federn", "tickets", "pulls", "best", "loginStreak", "lastLogin", "calIdx", "calRound"].forEach((k) => { if (inc[k] != null) G[k] = inc[k]; });
      if (inc.pity) G.pity = inc.pity;
    }
    if (incA > myA) {                                                                            // Figur + Ausrüstung: die zuletzt getroffene Wahl gilt auf allen Geräten
      if (inc.char && ANIMALS[inc.char]) G.char = inc.char;
      CHARS.forEach((c) => { const ie = inc.equip && inc.equip[c]; if (ie) SLOTS.forEach(([s]) => { const it = IT[ie[s]]; if (it && it.char === c && it.slot === s && G.owned[it.id]) G.equip[c][s] = it.id; }); });
      G.lookAt = incA;
    } else if (!incA && !myA) {                                                                  // Stände ohne Zeitpunkt (vor dem Update gewählt):
      // Der weiter fortgeschrittene Stand gibt Figur und Ausrüstung vor (bei Gleichstand eine feste Regel); wo er nur die Grundausstattung trägt, gilt die des anderen.
      // So landen beide Geräte nach einem Abgleich hin und zurück beim selben Aussehen.
      // Bei gleichem Stand entscheidet eine feste Regel (Vergleich des Aussehens), die beide Geräte gleich anwenden.
      const lead = ahead || (tie && lookKey(inc) > lookKey(G));
      if (lead && inc.char && ANIMALS[inc.char]) G.char = inc.char;
      CHARS.forEach((c) => {
        const ie = inc.equip && inc.equip[c], base = baseEquip(c); if (!ie) return;
        const incBase = SLOTS.every(([s]) => !ie[s] || ie[s] === base[s]), myBase = SLOTS.every(([s]) => G.equip[c][s] === base[s]);
        if ((lead && !incBase) || myBase) SLOTS.forEach(([s]) => { const it = IT[ie[s]]; if (it && it.char === c && it.slot === s && G.owned[it.id]) G.equip[c][s] = it.id; });
      });
    }
    fix(); save();
  }

  // ---- Bestenliste (freiwillig): sichtbar sind nur Spitzname, Level, XP und Figur. Server: tools/supabase-leaderboard.sql
  // Die Eintrags-ID ist eine Prüfsumme des Sync-Schlüssels (dann teilen sich verbundene Geräte einen Eintrag) oder eines
  // zufälligen Geräte-Werts. Sie wird nie angezeigt und vom Server nie herausgegeben.
  const KEY_LB = "tap2coach-lb", NAME_RE = /^[A-Za-z0-9ÄÖÜäöüß_.-]{3,16}$/;
  const lbGet = () => { try { const o = JSON.parse(localStorage.getItem(KEY_LB) || "null"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } };
  const lbSet = (o) => { try { localStorage.setItem(KEY_LB, JSON.stringify(o)); } catch (e) {} };
  const LB = { data: null, at: 0, busy: false, err: "", timer: 0, edit: false, leave: false, away: true };
  const lookOf = () => G.char + ":" + SLOTS.map(([s]) => (IT[G.equip[G.char][s]] || {}).art || "").join(".") + (G.title && TI[G.title] ? ":" + G.title : ""); // Titel als dritter Teil – ältere Versionen ignorieren ihn
  const lookEq = (str) => { const [c, rest, ti] = String(str || "").split(":"), ch = CHARS.includes(c) ? c : "rabe", eq = baseEquip(ch); String(rest || "").split(".").forEach((a, i) => { const sl = SLOTS[i] && SLOTS[i][0], it = IT[ch + "-" + a]; if (sl && a && it && it.slot === sl) eq[sl] = it.id; }); return [ch, eq, Object.prototype.hasOwnProperty.call(TI, ti) ? ti : ""]; };
  async function lbId() {
    const sk = syncGet(); if (sk) return hexOf(await sha("tap2-lb|s|" + keyRaw(sk.key)));
    const lb = lbGet(); if (!lb.token) { lb.token = hexOf(crypto.getRandomValues(new Uint8Array(20))); lbSet(lb); }
    return hexOf(await sha("tap2-lb|t|" + lb.token));
  }
  const lbBox = () => { const el = document.getElementById("gm-lbsec"); if (el) el.innerHTML = lbListHTML(); };
  const lbRedraw = () => { if (env.view() === "rangliste" || env.view() === "belohnungen") render(); };
  async function lbLoad(force) {
    if (!syncConf() || (!force && Date.now() - LB.at < 60000)) return;
    LB.at = Date.now();
    try {
      const id = await lbId(), d = await rpc("tap2_lb_top", { p_limit: 100, p_id: id }), lb = lbGet();
      LB.data = d && Array.isArray(d.top) ? d : { top: [], me: null, total: 0 }; if (!force) LB.err = "";
      if (LB.data.me && (!lb.joined || lb.id !== id)) { Object.assign(lb, { joined: true, id, name: LB.data.me.name }); lbSet(lb); lbRedraw(); return; } // ein verbundenes Gerät ist schon eingetragen
      if (!LB.data.me && lb.joined) { if (lb.id && lb.id !== id && lb.name) { lbJoin(lb.name); return; } lb.joined = false; lbSet(lb); lbRedraw(); return; } // Sync-Gruppe gewechselt → Eintrag mitnehmen; sonst gelöscht
    } catch (e) { if (!LB.data) LB.err = "Die Bestenliste ist gerade nicht erreichbar."; }
    lbBox();
  }
  async function lbJoin(name) {
    name = String(name || "").trim();
    if (!NAME_RE.test(name)) { LB.err = "3–16 Zeichen: Buchstaben, Ziffern, _ . -"; return lbRedraw(); }
    LB.busy = true; LB.err = ""; lbRedraw();
    try {
      const id = await lbId(), lb = lbGet();
      if (lb.id && lb.id !== id) { try { await rpc("tap2_lb_leave", { p_id: lb.id }); } catch (e) {} } // alten Eintrag nicht doppelt stehen lassen
      const r = await rpc("tap2_lb_join", { p_id: id, p_name: name, p_xp: G.earned, p_level: G.level, p_look: lookOf() });
      if (!r || !r.ok) { LB.err = r && r.err === "vergeben" ? "Der Name ist schon vergeben." : "Dieser Name geht nicht. 3–16 Zeichen: Buchstaben, Ziffern, _ . -"; if (lb.joined && lb.id !== id) { lb.joined = false; delete lb.id; lbSet(lb); } }
      else { Object.assign(lb, { id, name, joined: true }); lbSet(lb); LB.edit = false; }
    } catch (e) { LB.err = "Gerade nicht erreichbar. Versuche es später noch einmal."; }
    LB.busy = false; LB.at = 0; await lbLoad(true); lbRedraw();
  }
  async function lbLeave() {
    const lb = lbGet(); LB.busy = true; lbRedraw();
    try { if (lb.id) await rpc("tap2_lb_leave", { p_id: lb.id }); lb.joined = false; delete lb.id; lbSet(lb); LB.err = ""; }
    catch (e) { LB.err = "Austragen gerade nicht möglich. Versuche es später noch einmal."; }
    LB.busy = false; LB.leave = false; LB.at = 0; await lbLoad(true); lbRedraw();
  }
  async function lbPush() {
    LB.timer = 0; const lb = lbGet(); if (!lb.joined || !syncConf() || navigator.onLine === false) return;
    try {
      const id = await lbId(); if (lb.id !== id) return lbJoin(lb.name);
      const r = await rpc("tap2_lb_push", { p_id: id, p_xp: G.earned, p_level: G.level, p_look: lookOf() });
      if (r && r.gone) { lb.joined = false; lbSet(lb); }
      else if (r && r.later) lbSoon(20000);
      LB.at = 0;
    } catch (e) {}
  }
  function lbSoon(ms) { if (!lbGet().joined) return; clearTimeout(LB.timer); LB.timer = setTimeout(lbPush, ms == null ? 30000 : ms); }
  function lbListHTML() {
    const d = LB.data, lb = lbGet();
    const row = (e) => { const [c, eq, ti] = lookEq(e.look); return `<div class="gm-lbrow ${e.me ? "me" : ""} ${e.r <= 3 ? "p" + e.r : ""}"><span class="gm-lbr num">${num(e.r)}</span><span class="gm-lbfig">${figure(c, eq)}</span><span class="gm-lbn"><b>${esc(e.name)}</b>${e.me ? ' <span class="chip">Du</span>' : ""}<span class="gm-lbl">Level ${+e.level || 1}${ti ? " · «" + esc(TI[ti].name) + "»" : ""}</span></span><span class="gm-lbxp num">${(+e.xp || 0).toLocaleString("de-DE")} XP</span></div>`; };
    const list = !d ? `<p class="small muted">${LB.err ? esc(LB.err) : "Lädt …"}</p>`
      : !d.top.length ? `<p class="small muted">Noch niemand eingetragen – sei die erste Person!</p>`
      : d.top.map(row).join("") + (d.me && d.me.r > d.top.length ? `<div class="gm-lbgap">…</div>` + row(Object.assign({ me: true }, d.me)) : "");
    const mine = lb.joined && !LB.edit ? `<div class="row" style="margin-top:12px"><span class="small muted">Du bist dabei als <b>${esc(lb.name || "")}</b>${d && d.me ? ` · Platz ${num(d.me.r)} von ${num(d.total)}` : ""}</span><span class="spacer"></span><button type="button" class="btn small ghost" data-gm-lbedit>Namen ändern</button>${LB.leave ? `<button type="button" class="btn small danger" data-gm-lbleave2 ${LB.busy ? "disabled" : ""}>Wirklich austragen</button>` : `<button type="button" class="btn small ghost" data-gm-lbleave>Austragen</button>`}</div>` : "";
    return `<div class="row"><h3>Bestenliste</h3><span class="spacer"></span><span class="small muted">${d ? num(d.total) + " dabei" : ""}</span></div><p class="tiny muted">Sortiert nach gesammelten XP. Wird etwa jede Minute aktualisiert.</p><div class="gm-lb">${list}</div>${mine}`;
  }
  function rRang() {
    if (!syncConf()) return `<section class="card"><h3>Bestenliste</h3><p class="small muted">Die Bestenliste ist in dieser Version nicht verfügbar.</p></section>`;
    const fresh = LB.away; LB.away = false; setTimeout(() => lbLoad(fresh || Date.now() - LB.at > 60000), 0); // beim Aufruf über das Menü frisch laden, beim Neuzeichnen nicht
    const lb = lbGet();
    const join = !lb.joined || LB.edit ? `<section class="card"><h3>${lb.joined ? "Namen ändern" : "Mitmachen"}</h3><p class="small muted">Wähle einen Spitznamen. Für alle sichtbar sind nur dein Name, dein Level, deine XP und deine Figur. Nimm bitte nicht deinen echten Namen. Du kannst dich jederzeit wieder austragen.</p><div class="row" style="margin-top:10px"><input type="text" class="gm-in" id="gm-lb-name" maxlength="16" placeholder="z. B. CodeRabe" value="${esc(lb.name || "")}" autocomplete="off" spellcheck="false" aria-label="Spitzname"><button type="button" class="btn primary small" data-gm-lbjoin ${LB.busy ? "disabled" : ""}>${lb.joined ? "Speichern" : "Mitmachen"}</button>${lb.joined ? `<button type="button" class="btn small ghost" data-gm-lbcancel>Abbrechen</button>` : ""}</div>${LB.err ? `<p class="small warn-text" style="margin-top:6px">${esc(LB.err)}</p>` : ""}</section>` : "";
    return `${join}<section class="card" id="gm-lbsec">${lbListHTML()}</section>`;
  }
  function rangView(el) {
    el.innerHTML = `<section class="card gm-lbhead"><div class="gm-ava">${myFigure()}</div><div><h2>Rangliste</h2><p class="small muted">Wer sammelt die meisten XP? Du bist Level ${G.level} mit ${G.earned.toLocaleString("de-DE")} XP.</p></div></section>` + rRang();
    el.onkeydown = (e) => { if (e.target && e.target.id === "gm-lb-name" && e.key === "Enter") lbJoin(e.target.value); };
    el.onclick = (e) => { const t = e.target.closest("button"); if (!t || t.disabled) return; lbClick(t.dataset); };
    return true;
  }
  function lbClick(d) {
    if (d.gmLbjoin !== undefined) { const i = document.getElementById("gm-lb-name"); lbJoin(i ? i.value : ""); return true; }
    if (d.gmLbedit !== undefined) { LB.edit = true; LB.err = ""; render(); return true; }
    if (d.gmLbcancel !== undefined) { LB.edit = false; LB.err = ""; render(); return true; }
    if (d.gmLbleave !== undefined) { LB.leave = true; lbBox(); return true; }
    if (d.gmLbleave2 !== undefined) { lbLeave(); return true; }
    return false;
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && LB.timer) { clearTimeout(LB.timer); lbPush(); } });

  // ---- App-Anbindung (erst nach dem Laden des Lernstands initialisieren)
  return {
    init: ensure,
    hudHTML() { ensure(); if (env.view() !== "rangliste") LB.away = true; return `<button type="button" class="pill gm-pill" data-go="belohnungen" title="Belohnungen: Level ${G.level}" aria-label="Belohnungen, Level ${G.level}"><span class="gm-hava">${myFigure()}</span><b>${G.level}</b>${claimable() ? `<i class="gm-dot" aria-hidden="true"></i>` : ""}</button>`; },
    chip() { ensure(); return G.combo >= 2 ? `<span class="gm-combo" title="Serie richtiger Antworten">🔥 ${G.combo}${mult(G.combo) > 1 ? " · " + fmtM(mult(G.combo)) : ""}</span>` : ""; },
    answer(q, ok, unsure, f, t) { ensure(); onAnswer(q, ok, unsure, f, t); }, guess(q) { ensure(); onGuess(q); }, view(el) { ensure(); return viewHTML(el); }, pack() { ensure(); return pack(); }, merge(p) { ensure(); merge(p); },
    data() { ensure(); return JSON.parse(JSON.stringify(G)); },
    evInfo(e) { ensure(); return Object.assign({}, (G.ev || {})[e.id] || {}); }, evPreview(e) { ensure(); return evPreview(e); }, evFinal(e, s, n) { ensure(); return evFinal(e, s, n); }, evKap(e, k) { ensure(); return evKap(e, k); }, rangView(el) { ensure(); return rangView(el); },
    boot(h) { ensure(); rollDay(); titleCheck(); save(); if (lbGet().joined) setTimeout(lbPush, 4000); else if (syncGet() && syncConf()) setTimeout(() => lbLoad(true), 5000); if (!h.startsWith("import=") && env.view() !== "tutorial" && !env.UI().sess && !env.UI().run && G.loginClaimed !== today()) setTimeout(() => { if (!env.UI().sess && !env.UI().run && env.view() !== "tutorial") showLogin(); }, 700); }
  };
  
}
