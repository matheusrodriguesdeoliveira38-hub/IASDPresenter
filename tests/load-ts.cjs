const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

module.exports = function loadTs(file, dependencies = {}, globals = {}) {
  let source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.vue')) source = source.match(/<script lang="ts">([\s\S]*?)<\/script>/)[1];
  const exports = {};
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports, console, Uint8Array, ArrayBuffer, setInterval, clearInterval,
    require: (id) => {
      if (id in dependencies) return dependencies[id];
      throw new Error(`Missing test dependency: ${id}`);
    },
    ...globals,
  }, { filename: file });
  return exports;
};
