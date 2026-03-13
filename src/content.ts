/**
 * Content script injected on LinkedIn profile pages.
 *
 * The actual extraction logic comes from the linkedin-profile-export submodule.
 * esbuild resolves the import at build time via the alias map.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — esbuild resolves this alias; tsc sees extractor.d.ts for types
import { extractLinkedInProfile } from "@liex/extractor-linkedin";
import type { LinkedInExport } from "./extractor.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SCRAPE_PROFILE") {
    scrapeCurrentPage()
      .then((result) => {
        // Send to background for relay
        chrome.runtime.sendMessage({
          type: "SCRAPE_RESULT",
          data: result.data,
          warnings: result.warnings,
        });
        sendResponse({ success: true, data: result.data });
      })
      .catch((err) => {
        const errorMsg = err instanceof Error ? err.message : String(err);
        sendResponse({ success: false, error: errorMsg });
      });
    return true;
  }
  return false;
});

async function scrapeCurrentPage(): Promise<{ data: LinkedInExport; warnings: string[] }> {
  const result = await extractLinkedInProfile(document, {
    expandSections: true,
    scrollPage: true,
    includeRawHtml: false,
    fetchDetailPages: false,
  });
  return { data: result, warnings: result.warnings };
}
