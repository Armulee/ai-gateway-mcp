// Bundles scripts/stdio.ts into dist/stdio.mjs (gitignored), a single file
// that runs with plain `node`. Run `npm run build:ui` first: the bundle
// includes the generated media view.

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

await build({
  absWorkingDir: root,
  entryPoints: ['scripts/stdio.ts'],
  outfile: 'dist/stdio.mjs',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  tsconfig: 'tsconfig.json',
  // Lets bundled CommonJS packages call require() inside an ES module.
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'warning',
});
