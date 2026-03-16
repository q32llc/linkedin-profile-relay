/**
 * One-time helper: opens Playwright's Chromium with the extension loaded.
 * Log into LinkedIn manually, then close the browser.
 * The session is saved to tests/.auth/ for reuse in e2e tests.
 *
 * IMPORTANT: Must use Playwright's bundled Chromium (not system Chrome)
 * because system Chrome doesn't support --load-extension.
 *
 * Usage: node tests/save-login.mjs
 */

import { chromium } from "playwright";
import { resolve } from "path";

const EXTENSION_PATH = resolve("dist");
const USER_DATA_DIR = resolve("tests/.auth");

console.log("Opening Playwright Chromium — log into LinkedIn, then close the window.");
console.log(`Session will be saved to ${USER_DATA_DIR}\n`);

const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
  headless: false,
  args: [
    `--disable-extensions-except=${EXTENSION_PATH}`,
    `--load-extension=${EXTENSION_PATH}`,
  ],
});

const page = context.pages()[0] || await context.newPage();

try {
  await page.goto("https://www.linkedin.com/login", { timeout: 15000 });
} catch (err) {
  console.log(`Navigation error (${err.message}) — navigate manually in the browser.`);
}

console.log("Waiting for you to log in and close the browser...");

await new Promise((resolve) => {
  context.on("close", resolve);
});

console.log("Session saved. You can now run the e2e tests.");
