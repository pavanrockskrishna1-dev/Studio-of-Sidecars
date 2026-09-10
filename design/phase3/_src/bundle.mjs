/* Phase 3 · esbuild bundler — wraps the modular engine (ESM) + three into one IIFE.
   Run from anywhere:  node design/phase3/_src/bundle.mjs
   (or `npm run bundle` from design/phase3).
   Requires `npm install` in design/phase3 first (pinned toolchain:
   three r170 + esbuild, see ../package.json).
   All paths resolve relative to this file and the pinned toolchain —
   no machine-specific absolute paths. Output is scratch (../_build/,
   gitignored);
   build_phase3.py consumes it to assemble the release artifact. */
import { createRequire } from 'module';
import { mkdirSync, statSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url)); // .../design/phase3/_src
const ROOT = dirname(here);                            // .../design/phase3
const require = createRequire(join(ROOT, 'package.json'));
const esbuild = require('esbuild');

const entry = join(ROOT, 'engine', 'app.js');
const outDir = join(ROOT, '_build');
const out = join(outDir, 'p3engine.js');
mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  minify: !process.env.DEBUG,
  keepNames: !!process.env.DEBUG,
  format: 'iife',
  target: ['esnext', 'chrome120', 'safari16'],
  outfile: out,
  logLevel: 'warning',
  nodePaths: [join(ROOT, 'node_modules')],
  define: { 'process.env.NODE_ENV': '"production"' },
});
const bytes = statSync(out).size;
writeFileSync(out + '.meta', JSON.stringify({ bytes, entry, builtAt: new Date().toISOString() }) + '\n');
console.log('bundled ->', out, bytes, 'bytes');
