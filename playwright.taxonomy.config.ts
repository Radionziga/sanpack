import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', testMatch: ['storefront.spec.ts', 'subcategories.spec.ts', 'security-boundaries.spec.ts'],
  // Isolated production build and slow machines get a bounded startup budget.
  workers: 1, timeout: 180_000, fullyParallel: false, reporter: 'list',
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://127.0.0.1:3101', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'node tests/e2e/start-taxonomy-fixture.mjs',
    url: 'http://127.0.0.1:3101/api/health', reuseExistingServer: false, timeout: 180_000,
  },
});
