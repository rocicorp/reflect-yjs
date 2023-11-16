import * as esbuild from 'esbuild';
import packageJSON from '../package.json' assert {type: 'json'};
import process from 'node:process';

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
  platform: 'node',
  target: 'esnext',
  format: 'esm',
  sourcemap: false,
});

if (process.argv.includes('--watch')) {
  await indexCtx.watch();
} else {
  await indexCtx.rebuild();
  void indexCtx.dispose();
}
