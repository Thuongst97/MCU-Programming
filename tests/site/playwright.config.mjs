// SPDX-License-Identifier: MIT
// Serves the repository root so both site/ and tests/site/fixtures/ are reachable.
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.mjs$/,
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: "retain-on-failure" },
  // CI runs `npx playwright install chromium`; locally PW_CHROMIUM may point at an existing Chromium binary.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {} } }],
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1 --directory ../..`,
    url: `http://127.0.0.1:${PORT}/site/index.html`,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "ignore",
  },
});
