import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/desktop',
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results',
  use: { trace: 'retain-on-failure' },
});
