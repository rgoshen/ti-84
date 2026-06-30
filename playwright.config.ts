import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e config for the graphing calculator.
 *
 * The webServer builds the site and serves the production output with `preview`.
 * We avoid `astro dev` here: Astro 7 keeps a persistent dev-server daemon, so a
 * `npm run dev` webServer command detects "already running" and exits immediately
 * (Playwright reports "webServer exited early"), and a stale daemon would serve
 * old content. `preview` has no daemon. `reuseExistingServer: false` guarantees a
 * fresh server per run rather than reusing whatever happens to be on the port.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
