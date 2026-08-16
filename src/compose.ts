import { getComposeMessage } from "./compose-link.js";
import type { Message } from "./types.js";

const POLL_INTERVAL_MS = 250;
const PROFILE_ACTION_TIMEOUT_MS = 20_000;
const COMPOSER_TIMEOUT_MS = 15_000;
const PENDING_DRAFT_MAX_AGE_MS = 60_000;

const linkedMessage = getComposeMessage(window.location.href);

if (linkedMessage) {
  // Consume the request once so a refresh does not open and refill it again.
  history.replaceState(history.state, "", `${location.pathname}${location.search}`);
  void savePendingDraft(linkedMessage).then((saved) => {
    if (saved) return draftMessage(linkedMessage);
    console.warn("LinkedIn Profile Relay: could not preserve the message draft");
  });
} else if (location.pathname.startsWith("/messaging/")) {
  void getPendingDraft().then((pendingMessage) => {
    if (pendingMessage) return fillOpenComposer(pendingMessage);
  });
}

async function draftMessage(messageText: string): Promise<void> {
  let openedMoreMenu = false;
  const messageButton = await waitFor(() => {
    const directAction = findMessageAction();
    if (directAction) return directAction;

    const moreAction = openedMoreMenu ? null : findMoreAction();
    if (moreAction && !openedMoreMenu) {
      moreAction.click();
      openedMoreMenu = true;
    }
    return null;
  }, PROFILE_ACTION_TIMEOUT_MS);

  if (!messageButton) {
    console.warn("LinkedIn Profile Relay: could not find the Message action");
    clearPendingDraft();
    return;
  }

  messageButton.click();

  const editor = await waitFor(findVisibleComposer, COMPOSER_TIMEOUT_MS);
  if (!editor) {
    console.warn("LinkedIn Profile Relay: the message composer did not open");
    clearPendingDraft();
    return;
  }

  fillComposer(editor, messageText);
  clearPendingDraft();
}

async function fillOpenComposer(messageText: string): Promise<void> {
  const editor = await waitFor(findVisibleComposer, COMPOSER_TIMEOUT_MS);
  if (!editor) {
    console.warn("LinkedIn Profile Relay: the message composer did not load");
    clearPendingDraft();
    return;
  }

  fillComposer(editor, messageText);
  clearPendingDraft();
}

function findMoreAction(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    'main button[aria-label*="More"], main button'
  );

  return (
    Array.from(candidates).find((element) => {
      if (!isVisible(element)) return false;

      const text = element.innerText.trim().replace(/\s+/g, " ");
      const label = element.getAttribute("aria-label")?.trim() ?? "";
      return text === "More" || label === "More" || label === "More actions";
    }) ?? null
  );
}

function findMessageAction(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>(
    'main button, main a, [role="menuitem"]'
  );

  return (
    Array.from(candidates).find((element) => {
      if (!isVisible(element)) return false;

      const text = element.innerText.trim().replace(/\s+/g, " ");
      const label = element.getAttribute("aria-label")?.trim() ?? "";
      return text === "Message" || (element.closest("main") !== null && /^Message(?:\s|$)/.test(label));
    }) ?? null
  );
}

function findVisibleComposer(): HTMLElement | null {
  const editors = document.querySelectorAll<HTMLElement>(
    '.msg-form__contenteditable[contenteditable="true"], [role="textbox"][contenteditable="true"]'
  );
  return Array.from(editors).filter(isVisible).at(-1) ?? null;
}

function fillComposer(editor: HTMLElement, messageText: string): void {
  editor.focus();

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection?.removeAllRanges();
  selection?.addRange(range);

  // LinkedIn's editor listens to the browser's editing events, so inserting
  // text this way updates both the DOM and its internal composer state.
  const inserted = document.execCommand("insertText", false, messageText);
  if (!inserted) {
    editor.textContent = messageText;
    editor.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: messageText,
      })
    );
  }
}

function isVisible(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
}

async function waitFor<T>(find: () => T | null, timeoutMs: number): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  let result = find();

  while (!result && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    result = find();
  }

  return result;
}

async function savePendingDraft(messageText: string): Promise<boolean> {
  const response = await sendRuntimeMessage({
    type: "SAVE_PENDING_DRAFT",
    message: messageText,
    createdAt: Date.now(),
  });
  return response?.type === "PENDING_DRAFT_SAVED" && response.success;
}

async function getPendingDraft(): Promise<string | null> {
  const response = await sendRuntimeMessage({ type: "GET_PENDING_DRAFT" });
  const draft = response?.type === "PENDING_DRAFT_RESULT" ? response.draft : undefined;

  if (
    draft &&
    draft.message.length > 0 &&
    Date.now() - draft.createdAt <= PENDING_DRAFT_MAX_AGE_MS
  ) {
    return draft.message;
  }

  clearPendingDraft();
  return null;
}

function clearPendingDraft(): void {
  void sendRuntimeMessage({ type: "CLEAR_PENDING_DRAFT" });
}

function sendRuntimeMessage(message: Message): Promise<Message | undefined> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: Message | undefined) => {
      if (chrome.runtime.lastError) {
        console.warn(`LinkedIn Profile Relay: ${chrome.runtime.lastError.message}`);
        resolve(undefined);
        return;
      }
      resolve(response);
    });
  });
}
