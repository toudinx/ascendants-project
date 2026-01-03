import { defineConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4200';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  use: {
    baseURL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npm start -- --host=127.0.0.1 --port=4200',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  },
  projects: [
    {
      name: 'chromium'
    }
  ]
});
