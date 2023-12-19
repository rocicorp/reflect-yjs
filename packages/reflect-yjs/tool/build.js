import * as esbuild from 'esbuild';
import packageJSON from '../package.json' assert {type: 'json'};

const {devDependencies, peerDependencies} = packageJSON;
const external = new Set(
  Object.keys({
    ...devDependencies,
    ...peerDependencies,
  }),
);

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  external: [...external],
  platform: 'neutral',
  target: 'esnext',
  format: 'esm',
  sourcemap: false,
});
