// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  timeout: 1_800_000, // 30 minutes for 12-room realistic click simulation
  webServer: {
    command: 'npx --yes serve -l 8080 ../..',
    url: 'http://localhost:8080/index.html',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  use: {
    headless: false, // Show browser windows so user can watch
    viewport: { width: 1280, height: 800 },
    actionTimeout: 15_000,
  },
});

