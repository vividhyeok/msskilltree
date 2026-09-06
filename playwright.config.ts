import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:4183", headless: true },
  webServer: {
    command: "npm run preview -- --port 4183 --strictPort",
    url: "http://127.0.0.1:4183",
    reuseExistingServer: false,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
