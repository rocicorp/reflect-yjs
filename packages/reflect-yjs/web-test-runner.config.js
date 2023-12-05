// @ts-check
/* eslint-env node, es2022 */

import {esbuildPlugin} from '@web/dev-server-esbuild';
import {playwrightLauncher} from '@web/test-runner-playwright';
import {readFileSync} from 'node:fs';

const chromium = playwrightLauncher({product: 'chromium'});
const webkit = playwrightLauncher({product: 'webkit'});
const firefox = playwrightLauncher({product: 'firefox'});
const define = {};

function getVersion() {
  const url = new URL('../../package.json', import.meta.url);
  return JSON.parse(readFileSync(url, 'utf-8')).version;
}

/** @type {import('@web/test-runner').TestRunnerConfig} */
const config = {
  concurrentBrowsers: 3,
  nodeResolve: {
    browser: true,
  },

  plugins: [
    esbuildPlugin({
      ts: true,
      target: 'es2022',
      define: {
        ...define,
        ['REFLECT_VERSION']: JSON.stringify(getVersion()),
        ['TESTING']: 'true',
      },
      banner:
        'var process = { env: { NODE_ENV: "development" } }; var exports = {};',
    }),
  ],
  staticLogging: !!process.env.CI,
  testFramework: {
    config: {
      ui: 'tdd',
      reporter: 'html',
      timeout: 30000,
      retries: process.env.CI ? 3 : 0, // Firefox is flaky
    },
  },
  files: ['src/**/*.test.ts'],
  browsers: [firefox, chromium, webkit],
  testRunnerHtml: testFramework =>
    `<!doctype html>
      <html>
      <body>
        <script type="module" src="${testFramework}"></script>
      </body>
    </html>`,
};

export {config as default};
