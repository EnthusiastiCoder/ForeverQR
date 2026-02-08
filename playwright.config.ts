import { defineConfig, devices } from '@playwright/test';

// ForeverQR's own fixed port. Other local projects already own 4321 (Nopload, QuietPDF),
// 4799 (Framelab) and 4173 (JEE Quest); never share one.
const PORT = 4391;
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
  // Production headers offline: build, then serve dist/ with the _headers and _redirects rules.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: `npm run build && node scripts/serve-dist.mjs ${PORT}`,
        url: baseURL,
        // Never reuse a running server: if the port is busy, fail rather than test another project.
        reuseExistingServer: false,
        timeout: 240_000,
      },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, grepInvert: /@mobile/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grep: /@smoke/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grep: /@smoke/ },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
});
