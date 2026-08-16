export const COMPOSE_MESSAGE_PARAM = "linkedin-profile-relay-message";

/**
 * Build a LinkedIn profile link that the extension will turn into a drafted
 * message when it is opened.
 */
export function createComposeLink(profileUrl: string, message: string): string {
  const url = new URL(profileUrl);

  if (
    url.protocol !== "https:" ||
    !["linkedin.com", "www.linkedin.com"].includes(url.hostname) ||
    !url.pathname.startsWith("/in/")
  ) {
    throw new Error("profileUrl must be an HTTPS LinkedIn profile URL");
  }

  if (!message) {
    throw new Error("message must not be empty");
  }

  url.hostname = "www.linkedin.com";
  url.hash = new URLSearchParams({ [COMPOSE_MESSAGE_PARAM]: message }).toString();
  return url.toString();
}

/** Read the requested draft from the current LinkedIn profile URL. */
export function getComposeMessage(url: string): string | null {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.hash.slice(1));
  const message = params.get(COMPOSE_MESSAGE_PARAM);
  return message || null;
}
