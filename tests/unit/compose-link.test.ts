import { describe, expect, it } from "vitest";
import { createComposeLink, getComposeMessage } from "@src/compose-link.js";

describe("draft-message links", () => {
  it("round-trips a message through a LinkedIn profile URL", () => {
    const message = "Hi Jane,\nWould you have 15 minutes next week?";
    const link = createComposeLink("https://linkedin.com/in/jane-smith/", message);

    expect(link).toContain("https://www.linkedin.com/in/jane-smith/");
    expect(getComposeMessage(link)).toBe(message);
  });

  it("returns null for ordinary profile links", () => {
    expect(getComposeMessage("https://www.linkedin.com/in/jane-smith/")).toBeNull();
  });

  it("rejects non-LinkedIn and non-profile URLs", () => {
    expect(() => createComposeLink("https://example.com/in/jane/", "Hello")).toThrow();
    expect(() => createComposeLink("https://www.linkedin.com/company/acme/", "Hello")).toThrow();
  });

  it("rejects an empty draft", () => {
    expect(() => createComposeLink("https://www.linkedin.com/in/jane/", "")).toThrow();
  });
});
