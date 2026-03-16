/**
 * End-to-end test: loads the extension, navigates to a LinkedIn profile,
 * registers the test server, scrapes, and asserts the server received data.
 *
 * Prerequisites:
 *   1. pnpm build               (builds dev extension to dist/)
 *   2. node tests/save-login.mjs (saves LinkedIn session to tests/.auth/)
 *   3. node tests/e2e.spec.mjs  (runs this test)
 *
 * Uses Playwright's bundled Chromium with persistent context (required for
 * extensions — system Chrome doesn't support --load-extension).
 */

import { chromium } from "playwright";
import { resolve } from "path";
import { startTestServer } from "../test-server.mjs";
import assert from "node:assert/strict";

const EXTENSION_PATH = resolve("dist");
const USER_DATA_DIR = resolve("tests/.auth");
const PROFILE_URL = process.env.LINKEDIN_PROFILE_URL || "https://www.linkedin.com/in/earonesty/";

let testServer;
let context;

try {
  // --- Setup ---
  console.log("Starting test server...");
  testServer = await startTestServer(0);
  console.log(`Test server on ${testServer.url}`);

  console.log("Launching Chromium with extension...");
  context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  // --- Get extension ID (official Playwright pattern) ---
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent("serviceworker");
  const extensionId = sw.url().split("/")[2];
  console.log(`Extension ID: ${extensionId}`);
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;

  // --- Navigate to LinkedIn profile ---
  const page = context.pages()[0] || await context.newPage();
  console.log(`Navigating to ${PROFILE_URL}...`);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(PROFILE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
      break;
    } catch (err) {
      console.log(`  Navigation attempt ${attempt + 1} failed: ${err.message}`);
      if (attempt === 2) throw err;
      await page.waitForTimeout(2000);
    }
  }
  // Wait for LinkedIn to render content
  await page.waitForFunction(
    () => document.body.innerText.length > 200,
    { timeout: 30000 }
  );
  await page.waitForTimeout(3000);
  console.log(`Profile loaded: ${page.url()}`);

  // --- Register the test server endpoint via popup ---
  const popup = await context.newPage();
  await popup.goto(popupUrl);
  await popup.waitForLoadState("domcontentloaded");
  console.log("Popup opened.");

  console.log(`Registering ${testServer.url}...`);
  await popup.fill("#domain-input", testServer.url);
  await popup.click("#register-btn");
  await popup.waitForSelector(".endpoint-name", { timeout: 10000 });
  const endpointName = await popup.textContent(".endpoint-name");
  console.log(`Registered: ${endpointName}`);
  assert.equal(endpointName, "Test CRM (localhost)");
  await popup.close();

  // --- Scrape the profile ---
  // The popup is opened as a tab (Playwright limitation), not a real browser popup.
  // The popup code now falls back to chrome.tabs.query({ url: "linkedin.com/in/*" })
  // so it can find the LinkedIn tab even when it's not the "active" tab.
  const popup2 = await context.newPage();
  await popup2.goto(popupUrl);
  await popup2.waitForLoadState("domcontentloaded");

  console.log("Clicking Scrape & Relay...");
  await popup2.click("#scrape-btn");

  // Wait for relay to complete — poll the test server
  console.log("Waiting for profile data...");
  let received = [];
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    received = testServer.received;
    if (received.length > 0) break;
    if (i % 5 === 4) console.log(`  Still waiting... (${i + 1}s)`);
  }

  // --- Assertions ---
  assert.ok(received.length > 0, "Test server should have received at least one profile");

  const profile = received[0].data;
  console.log("\n=== Received Profile ===");
  console.log("Name:", profile.top_card?.full_name);
  console.log("URL:", profile.source?.profile_url);
  console.log("Sections:", profile.sections?.length);
  console.log("Warnings:", profile.warnings?.length);

  assert.ok(profile.source, "Profile should have source");
  assert.equal(profile.source.platform, "linkedin");
  assert.ok(profile.source.profile_url.includes("linkedin.com"), "Should be a LinkedIn URL");
  assert.ok(profile.source.captured_at, "Should have captured_at timestamp");

  assert.ok(profile.top_card, "Profile should have top_card");
  assert.ok(profile.top_card.full_name, "Should have a name");

  assert.ok(Array.isArray(profile.sections), "Sections should be an array");
  assert.ok(profile.sections.length >= 3, `Should have at least 3 sections, got ${profile.sections.length}`);

  const sectionIds = profile.sections.map((s) => s.id);
  console.log("Section IDs:", sectionIds);
  assert.ok(sectionIds.includes("experience"), "Should have experience section");
  assert.ok(sectionIds.includes("education"), "Should have education section");

  const experience = profile.sections.find((s) => s.id === "experience");
  assert.ok(experience.items.length > 0, "Experience should have items");
  assert.ok(experience.items[0].title || experience.items[0].company, "Experience items should have title or company");

  console.log("\n✓ All assertions passed!\n");

} catch (err) {
  console.error("\n✗ Test failed:", err.message);
  if (err.code === "ERR_ASSERTION") {
    console.error("  Expected:", err.expected);
    console.error("  Actual:", err.actual);
  }
  process.exitCode = 1;
} finally {
  if (context) await context.close();
  if (testServer) await testServer.close();
}
