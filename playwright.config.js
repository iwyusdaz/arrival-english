import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.js$/,
  timeout: 90_000,
  retries: 0,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4574', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4574 --strictPort',
    url: 'http://127.0.0.1:4574',
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  outputDir: 'tmp/test-results',
});
