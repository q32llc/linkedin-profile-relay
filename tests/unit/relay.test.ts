import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RegisteredEndpoint } from "@src/types.js";

// We need to mock storage before importing relay, since relay imports getEndpoints
let storedEndpoints: RegisteredEndpoint[] = [];

vi.mock("@src/storage.js", () => ({
  getEndpoints: vi.fn(async () => storedEndpoints),
}));

// Now import after mock is set up
const { relayToEndpoints } = await import("@src/relay.js");

function makeEndpoint(origin: string, enabled = true): RegisteredEndpoint {
  return {
    origin,
    endpoint_url: `${origin}/api/import`,
    name: `CRM at ${origin}`,
    registered_at: new Date().toISOString(),
    enabled,
  };
}

beforeEach(() => {
  storedEndpoints = [];
  vi.restoreAllMocks();
});

describe("relayToEndpoints", () => {
  it("returns empty array when no endpoints registered", async () => {
    const results = await relayToEndpoints({ test: true });
    expect(results).toEqual([]);
  });

  it("returns empty array when all endpoints disabled", async () => {
    storedEndpoints = [makeEndpoint("https://a.com", false)];

    const results = await relayToEndpoints({ test: true });
    expect(results).toEqual([]);
  });

  it("POSTs to enabled endpoints", async () => {
    storedEndpoints = [makeEndpoint("https://a.com")];
    const payload = { profile: "data" };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 })
    );

    const results = await relayToEndpoints(payload);

    expect(fetch).toHaveBeenCalledWith("https://a.com/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ origin: "https://a.com", ok: true, status: 200 });
  });

  it("POSTs to multiple endpoints in parallel", async () => {
    storedEndpoints = [
      makeEndpoint("https://a.com"),
      makeEndpoint("https://b.com"),
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 })
    );

    const results = await relayToEndpoints({ test: true });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it("skips disabled endpoints", async () => {
    storedEndpoints = [
      makeEndpoint("https://a.com", true),
      makeEndpoint("https://b.com", false),
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200 })
    );

    const results = await relayToEndpoints({ test: true });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
    expect(results[0].origin).toBe("https://a.com");
  });

  it("handles endpoint failure gracefully", async () => {
    storedEndpoints = [
      makeEndpoint("https://a.com"),
      makeEndpoint("https://b.com"),
    ];

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockRejectedValueOnce(new Error("Connection refused"))
    );

    const results = await relayToEndpoints({ test: true });

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ origin: "https://a.com", ok: true, status: 200 });
    expect(results[1].ok).toBe(false);
    expect(results[1].status).toBe(0);
    expect(results[1].error).toContain("Connection refused");
  });

  it("reports non-200 responses", async () => {
    storedEndpoints = [makeEndpoint("https://a.com")];

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );

    const results = await relayToEndpoints({ test: true });

    expect(results[0]).toEqual({ origin: "https://a.com", ok: false, status: 500 });
  });
});
