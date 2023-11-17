import * as esbuild from 'esbuild';
import packageJSON from '../package.json' assert {type: 'json'};

const {dependencies, devDependencies} = packageJSON;
const external = new Set(
  Object.keys({
    ...dependencies,
    ...devDependencies,
  }),
);

const indexCtx = await esbuild.context({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  external: [...external],
  platform: 'neutral',
  target: 'esnext',
  format: 'esm',
  sourcemap: false,
});

await indexCtx.rebuild();
void indexCtx.dispose();
