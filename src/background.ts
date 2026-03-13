import type { Message } from "./types.js";
import { discoverEndpoint, DiscoveryError } from "./discovery.js";
import { addEndpoint } from "./storage.js";
import { relayToEndpoints } from "./relay.js";

/**
 * Handle messages from popup and content scripts.
 */
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse: (response: Message) => void) => {
    if (message.type === "REGISTER_ENDPOINT") {
      discoverEndpoint(message.origin)
        .then((endpoint) => {
          return addEndpoint(endpoint).then(() => endpoint);
        })
        .then((endpoint) => {
          sendResponse({ type: "REGISTER_RESULT", success: true, endpoint });
        })
        .catch((err) => {
          const errorMsg =
            err instanceof DiscoveryError
              ? err.message
              : `Unexpected error: ${err instanceof Error ? err.message : String(err)}`;
          sendResponse({ type: "REGISTER_RESULT", success: false, error: errorMsg });
        });
      return true; // keep channel open for async response
    }

    if (message.type === "SCRAPE_RESULT") {
      relayToEndpoints(message.data)
        .then((results) => {
          sendResponse({ type: "RELAY_RESULT", results });
        })
        .catch((err) => {
          sendResponse({
            type: "RELAY_RESULT",
            results: [{ origin: "relay", ok: false, status: 0 }],
          });
          console.error("Relay failed:", err);
        });
      return true;
    }

    return false;
  }
);

/**
 * Handle one-click registration via custom URL pattern.
 * CRM sites link to: https://<extension-id>.chromiumapp.org/register?origin=crm.example.com
 * Or we intercept a query param pattern on the CRM site itself.
 */
chrome.runtime.onMessageExternal.addListener(
  (message: { action: string; origin?: string }, sender, sendResponse) => {
    if (message.action === "register" && message.origin) {
      discoverEndpoint(message.origin)
        .then((endpoint) => addEndpoint(endpoint).then(() => endpoint))
        .then((endpoint) => {
          sendResponse({ success: true, endpoint });
        })
        .catch((err) => {
          sendResponse({ success: false, error: String(err) });
        });
      return true;
    }
    return false;
  }
);
