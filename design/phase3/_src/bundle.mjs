/* Phase 3 · esbuild bundler — wraps the modular engine (ESM) + three into one IIFE.
   Run: NODE_PATH=/tmp/p3build/node_modules node design/phase3/_src/bundle.mjs   */
import { createRequire } from 'module';
const require = createRequire('/tmp/p3build/index.js');
const esbuild = require('esbuild');
import { writeFileSync } from 'fs';

const NPM = '/tmp/p3build/node_modules';
const entry = '/home/user/design/phase3/engine/app.js';
const out = '/tmp/p3engine.js';

const result = await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  minify: !process.env.DEBUG,
  keepNames: !!process.env.DEBUG,
  format: 'iife',
  target: ['esnext', 'chrome120', 'safari16'],
  outfile: out,
  logLevel: 'warning',
  nodePaths: [NPM],
  define: { 'process.env.NODE_ENV': '"production"' },
});
writeFileSync(out + '.meta', JSON.stringify({ bytes: result ? 0 : 0 }));
console.log('bundled ->', out, require('fs').statSync(out).size, 'bytes');
