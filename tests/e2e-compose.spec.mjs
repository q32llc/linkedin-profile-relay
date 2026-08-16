/**
 * Real-LinkedIn E2E for vendor draft-message links.
 *
 * Uses the saved login in tests/.auth. Set LINKEDIN_MESSAGE_PROFILE_URL to a
 * messageable profile, or the test will use the first profile listed on the
 * signed-in account's connections page. The inserted test draft is cleared
 * before the browser closes.
 */

import assert from "node:assert/strict";
import { chromium } from "playwright";
import { resolve } from "path";

const EXTENSION_PATH = resolve("dist");
const USER_DATA_DIR = resolve("tests/.auth");
const DRAFT_TEXT = `LinkedIn Profile Relay E2E draft ${Date.now()}`;

let context;

try {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  const page = await context.newPage();
  const profileUrl =
    process.env.LINKEDIN_MESSAGE_PROFILE_URL || (await findConnectionProfile(page));
  const draftUrl = new URL(profileUrl);
  draftUrl.hash = new URLSearchParams({
    "linkedin-profile-relay-message": DRAFT_TEXT,
  }).toString();

  console.log("Opening a real LinkedIn draft-message link...");
  await page.goto(draftUrl.toString(), {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  await page.waitForFunction(
    (draft) =>
      Array.from(document.querySelectorAll('[contenteditable="true"]')).some(
        (editor) => editor.textContent?.trim() === draft
      ),
    DRAFT_TEXT,
    { timeout: 40_000 }
  );

  assert.equal(new URL(page.url()).hash, "", "The draft-link fragment should be consumed");

  const editor = page
    .locator(
      '.msg-form__contenteditable[contenteditable="true"], [role="textbox"][contenteditable="true"]'
    )
    .filter({ hasText: DRAFT_TEXT })
    .last();
  assert.equal((await editor.textContent())?.trim(), DRAFT_TEXT);

  // Leave the real account exactly as the test found it.
  await editor.click();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
  await page.keyboard.press("Backspace");
  await page.waitForFunction(
    (draft) =>
      !Array.from(document.querySelectorAll('[contenteditable="true"]')).some(
        (candidate) => candidate.textContent?.includes(draft)
      ),
    DRAFT_TEXT
  );

  console.log("✓ Real LinkedIn composer opened, filled, and was cleaned up");
} catch (error) {
  console.error(`✗ Draft-message E2E failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  if (context) await context.close();
}

async function findConnectionProfile(page) {
  await page.goto("https://www.linkedin.com/mynetwork/invite-connect/connections/", {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });
  await page.waitForTimeout(5_000);

  const candidates = await page.locator('main a[href*="/in/"]').evaluateAll(
    (links) =>
      Array.from(
        new Set(
          links
            .map((link) => new URL(link.href))
            .filter((url) => {
              const parts = url.pathname.split("/").filter(Boolean);
              return parts.length === 2 && parts[0] === "in";
            })
            .map((url) => `${url.origin}${url.pathname}`)
        )
      )
  );

  if (!candidates.length) {
    throw new Error(
      "No messageable connection found; set LINKEDIN_MESSAGE_PROFILE_URL to a LinkedIn profile"
    );
  }

  return candidates[0];
}
