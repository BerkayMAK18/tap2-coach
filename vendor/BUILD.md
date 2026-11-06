# vendor/codemirror.min.js

Gebündelter CodeMirror-6-Editor (MIT-Lizenz, siehe `LICENSE-codemirror.txt`) mit Pseudocode-Highlighting im IHK-Stil und SQL.
Quelle: `codemirror-entry.js`. Neu bauen:

```bash
npm install --save-exact @codemirror/state@6.4.1 @codemirror/view@6.26.3 @codemirror/commands@6.5.0 @codemirror/language@6.10.1 @codemirror/lang-sql@6.6.4 @lezer/highlight@1.2.0 esbuild@0.21.5
npx esbuild codemirror-entry.js --bundle --minify --format=iife --target=es2019 --legal-comments=none --outfile=codemirror.min.js
```
