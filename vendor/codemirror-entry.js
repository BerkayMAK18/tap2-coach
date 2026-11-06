// TAP2-Coach: schlanker CodeMirror-6-Editor für Pseudocode (IHK-Stil) und SQL
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, placeholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { StreamLanguage, syntaxHighlighting, indentUnit, bracketMatching } from "@codemirror/language";
import { sql, StandardSQL } from "@codemirror/lang-sql";
import { classHighlighter } from "@lezer/highlight";

const KW = new Set(("wenn dann sonst ende für fuer bis von schritt solange wiederhole führe fuehre aus rückgabe rueckgabe gib zurück zurueck " +
  "und oder nicht neu new null nil wahr falsch true false funktion methode prozedur klasse ausgabe eingabe drucke lies " +
  "return if then else end for each in to step while do repeat until break continue function procedure class and or not mod div").split(" "));
const TYPES = new Set("integer int double float string char boolean bool long datum date array list liste map void object".split(" "));
const pseudo = StreamLanguage.define({
  name: "pseudocode",
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match("//")) { stream.skipToEnd(); return "comment"; }
    if (stream.match(/^"([^"\\]|\\.)*"?/) || stream.match(/^'([^'\\]|\\.)*'?/)) return "string";
    if (stream.match(/^\d+(\.\d+)?/)) return "number";
    if (stream.match(/^(<=|>=|<>|!=|==|←|<-|→|[=<>+\-*\/%])/)) return "operator";
    const w = stream.match(/^[A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß]*/);
    if (w) { const l = w[0].toLowerCase(); if (KW.has(l)) return "keyword"; if (TYPES.has(l)) return "typeName"; return "variableName"; }
    stream.next(); return "punctuation";
  },
  languageData: { commentTokens: { line: "//" } }
});

// Enter: Einrückung der Vorzeile übernehmen, nach Blockanfang 2 Leerzeichen mehr
const OPEN = /(\bdann|\bsonst|\bwiederhole|\bdo|\bthen|\{)\s*$|^\s*(für|fuer|solange|for|while|funktion|methode|prozedur|klasse|function|class)\b/i;
function pseudoEnter(view) {
  const { state } = view, r = state.selection.main;
  if (!r.empty) return false;
  const line = state.doc.lineAt(r.head), before = line.text.slice(0, r.head - line.from);
  let ind = (before.match(/^\s*/) || [""])[0];
  if (OPEN.test(before.trim() ? before : "")) ind += "  ";
  view.dispatch(state.update({ changes: { from: r.head, to: r.head, insert: "\n" + ind }, selection: { anchor: r.head + 1 + ind.length }, scrollIntoView: true, userEvent: "input" }));
  return true;
}
// Beim Tippen von "sonst" bzw. "ende wenn/für/solange/…" eine Ebene ausrücken
const dedent = EditorState.transactionFilter.of((tr) => {
  if (!tr.docChanged || !tr.isUserEvent("input.type")) return tr;
  const st = tr.state, line = st.doc.lineAt(st.selection.main.head);
  if (!/^ {2,}(sonst|ende (wenn|für|fuer|solange|wiederhole|methode|funktion|prozedur|klasse))$/i.test(line.text)) return tr;
  return [tr, { changes: { from: line.from, to: line.from + 2 }, sequential: true }];
});

function create(parent, opts) {
  opts = opts || {};
  const lang = opts.lang === "sql" ? sql({ dialect: StandardSQL, upperCaseKeywords: true }) : [pseudo, dedent];
  const ext = [
    lineNumbers(), highlightActiveLineGutter(), drawSelection(), bracketMatching(),
    history(), indentUnit.of("  "), EditorState.tabSize.of(2),
    syntaxHighlighting(classHighlighter), lang,
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({ "aria-label": opts.label || "Code-Editor", autocapitalize: "off", autocorrect: "off", spellcheck: "false" }),
  ];
  if (opts.readOnly) ext.push(EditorState.readOnly.of(true), EditorView.editable.of(false));
  else {
    ext.push(highlightActiveLine(), placeholder(opts.placeholder || ""));
    const km = [];
    if (opts.onSubmit) km.push({ key: "Mod-Enter", run: () => { opts.onSubmit(); return true; } }, { key: "Ctrl-Enter", run: () => { opts.onSubmit(); return true; } });
    if (opts.lang !== "sql") km.push({ key: "Enter", run: pseudoEnter });
    ext.push(keymap.of([...km, indentWithTab, ...defaultKeymap, ...historyKeymap]));
    if (opts.onChange) ext.push(EditorView.updateListener.of((u) => { if (u.docChanged) opts.onChange(u.state.doc.toString()); }));
  }
  const view = new EditorView({ state: EditorState.create({ doc: opts.doc || "", extensions: ext }), parent });
  return { view, get: () => view.state.doc.toString(), focus: () => view.focus(), destroy: () => view.destroy() };
}
window.TAPCM = { create, version: "1" };
