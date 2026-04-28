import { defineConfig, devices } from '@playwright/test';

const proxyPort = process.env.PLAYWRIGHT_PROXY_PORT ?? '13080';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${proxyPort}`;
const webServer = process.env.PLAYWRIGHT_BASE_URL
  ? undefined
  : {
      command: 'node scripts/playwright-proxy-server.mjs',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    };

export default defineConfig({
  testDir: './wiki/tiddlers/tests/playwright',
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
