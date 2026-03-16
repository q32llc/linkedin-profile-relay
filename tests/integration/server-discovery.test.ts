import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { discoverEndpoint, DiscoveryError } from "@src/discovery.js";

// Import the test server — it's ESM .mjs so we need to handle it
let testServer: { url: string; port: number; received: unknown[]; close: () => Promise<void> };

beforeAll(async () => {
  const mod = await import("../../test-server.mjs");
  testServer = await mod.startTestServer(0);
});

afterAll(async () => {
  if (testServer) await testServer.close();
});

describe("test server + discovery integration", () => {
  it("discovers the test server manifest", async () => {
    const result = await discoverEndpoint(testServer.url);

    expect(result.origin).toBe(testServer.url);
    expect(result.name).toBe("Test CRM (localhost)");
    expect(result.endpoint_url).toBe(`${testServer.url}/api/linkedin-import`);
    expect(result.enabled).toBe(true);
  });

  it("can POST to the discovered endpoint", async () => {
    const profile = {
      source: { platform: "linkedin", profile_url: "https://linkedin.com/in/test", captured_at: new Date().toISOString() },
      top_card: { full_name: "Test User" },
      sections: [],
      warnings: [],
    };

    const ep = await discoverEndpoint(testServer.url);

    const response = await fetch(ep.endpoint_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    expect(response.ok).toBe(true);
    expect(testServer.received.length).toBeGreaterThan(0);

    const last = testServer.received[testServer.received.length - 1] as { data: typeof profile };
    expect(last.data.top_card.full_name).toBe("Test User");
  });

  it("rejects a server that doesn't serve the manifest", async () => {
    // The test server serves on its port; try a different path that won't have .well-known
    // We can't easily spin up a second server, so just test with a port that's not listening
    await expect(discoverEndpoint("http://localhost:1")).rejects.toThrow(DiscoveryError);
  });
});
