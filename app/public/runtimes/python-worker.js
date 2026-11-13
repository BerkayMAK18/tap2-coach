import { loadPyodide } from './python/pyodide.mjs';
let python;
self.onmessage = async ({data}) => {
  let output = '';
  const append = text => { output = (output + text + '\n').slice(0,20000); };
  try {
    if (!python) python = await loadPyodide({indexURL: new URL('./python/', import.meta.url).href});
    const lines = (data.stdin || '').split('\n');
    python.setStdout({batched:append}); python.setStderr({batched:append});
    python.setStdin({stdin:()=>lines.length ? lines.shift() : undefined});
    const globals = python.toPy({});
    try { await python.runPythonAsync(data.code,{globals}); } finally { globals.destroy(); }
    self.postMessage({output:output || 'Programm ohne Ausgabe beendet.',results:[]});
  } catch(error) { self.postMessage({output:output+String(error),error:true,results:[]}); }
};