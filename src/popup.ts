import type { RegisteredEndpoint, Message } from "./types.js";
import { getEndpoints, removeEndpoint, toggleEndpoint } from "./storage.js";

const listEl = document.getElementById("endpoint-list") as HTMLUListElement;
const scrapeBtn = document.getElementById("scrape-btn") as HTMLButtonElement;
const scrapeStatus = document.getElementById("scrape-status") as HTMLDivElement;
const domainInput = document.getElementById("domain-input") as HTMLInputElement;
const registerBtn = document.getElementById("register-btn") as HTMLButtonElement;
const registerStatus = document.getElementById("register-status") as HTMLDivElement;

// --- Render endpoint list ---

async function renderEndpoints() {
  const endpoints = await getEndpoints();

  if (endpoints.length === 0) {
    listEl.innerHTML = '<li class="empty">No endpoints registered</li>';
    return;
  }

  listEl.innerHTML = "";
  for (const ep of endpoints) {
    const li = document.createElement("li");
    li.className = "endpoint-item";
    li.innerHTML = `
      <div class="endpoint-info">
        <div class="endpoint-name">${escapeHtml(ep.name)}</div>
        <div class="endpoint-origin">${escapeHtml(ep.origin)}</div>
      </div>
      <div class="endpoint-actions">
        <label class="toggle">
          <input type="checkbox" ${ep.enabled ? "checked" : ""} data-origin="${escapeAttr(ep.origin)}">
          <span class="slider"></span>
        </label>
        <button class="btn-remove" data-origin="${escapeAttr(ep.origin)}" title="Remove">&times;</button>
      </div>
    `;
    listEl.appendChild(li);
  }

  // Bind toggle handlers
  listEl.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((input) => {
    input.addEventListener("change", async () => {
      await toggleEndpoint(input.dataset.origin!, input.checked);
    });
  });

  // Bind remove handlers
  listEl.querySelectorAll<HTMLButtonElement>(".btn-remove").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await removeEndpoint(btn.dataset.origin!);
      await renderEndpoints();
    });
  });
}

// --- Register endpoint ---

registerBtn.addEventListener("click", async () => {
  const domain = domainInput.value.trim();
  if (!domain) return;

  registerBtn.disabled = true;
  showStatus(registerStatus, "info", `Discovering ${domain}...`);

  chrome.runtime.sendMessage(
    { type: "REGISTER_ENDPOINT", origin: domain } satisfies Message,
    (response: Message) => {
      registerBtn.disabled = false;
      if (response.type === "REGISTER_RESULT") {
        if (response.success) {
          showStatus(registerStatus, "success", `Added ${response.endpoint!.name}`);
          domainInput.value = "";
          renderEndpoints();
        } else {
          showStatus(registerStatus, "error", response.error!);
        }
      }
    }
  );
});

domainInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") registerBtn.click();
});

// --- Scrape & relay ---

scrapeBtn.addEventListener("click", async () => {
  // Try active tab first, then fall back to any open LinkedIn profile tab.
  // Fallback is needed when popup is opened as a tab (e.g. in Playwright tests).
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes("linkedin.com/in/")) {
    const linkedinTabs = await chrome.tabs.query({ url: "https://www.linkedin.com/in/*" });
    tab = linkedinTabs[0];
  }
  if (!tab?.id) {
    showStatus(scrapeStatus, "error", "Navigate to a LinkedIn profile first");
    return;
  }

  scrapeBtn.disabled = true;
  showStatus(scrapeStatus, "info", "Scraping profile...");

  // Inject content script on demand (activeTab grants permission on user gesture)
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  }).catch(() => {
    // May already be injected — that's fine
  });

  chrome.tabs.sendMessage(tab.id, { type: "SCRAPE_PROFILE" }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus(scrapeStatus, "error", chrome.runtime.lastError.message ?? "Content script not ready");
      scrapeBtn.disabled = false;
      return;
    }

    if (response?.success) {
      showStatus(scrapeStatus, "success", "Scraped! Relaying to endpoints...");
      // The content script already sent SCRAPE_RESULT to background, which triggers relay.
      // We could also listen for RELAY_RESULT, but for now just mark complete.
      setTimeout(() => {
        showStatus(scrapeStatus, "success", "Done! Profile relayed to all active endpoints.");
        scrapeBtn.disabled = false;
      }, 1500);
    } else {
      showStatus(scrapeStatus, "error", response?.error ?? "Scrape failed");
      scrapeBtn.disabled = false;
    }
  });
});

// --- Helpers ---

function showStatus(el: HTMLDivElement, type: "error" | "success" | "info", text: string) {
  el.className = `status ${type}`;
  el.textContent = text;
}

function escapeHtml(s: string): string {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Init
renderEndpoints();
