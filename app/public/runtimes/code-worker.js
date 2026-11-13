let database;
self.onmessage = async ({ data }) => {
  const { code, seed = '' } = data;
  let output = '';
  const append = (text) => { output = (output + text + '\n').slice(0, 20000); };
  try {
      if (!database) {
        importScripts('/runtimes/sql/sql-wasm.js');
        const SQL = await initSqlJs({ locateFile: f => '/runtimes/sql/' + f });
        database = new SQL.Database(); database.run(seed);
      }
      const results = database.exec(code);
      self.postMessage({ output: results.length ? '' : 'SQL ausgeführt. Geänderte Zeilen: ' + database.getRowsModified(), results });
  } catch (error) { self.postMessage({ output: output + String(error), error: true, results: [] }); }
};