import { describe, it, expect, vi, beforeEach } from "vitest";
import { discoverEndpoint, DiscoveryError } from "@src/discovery.js";

const VALID_MANIFEST = {
  schema_version: 1,
  name: "Test CRM",
  endpoint: "/api/linkedin-import",
  icon: "/icon.png",
};

function mockFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Not Found",
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("discoverEndpoint", () => {
  // --- Happy path ---

  it("discovers a valid HTTPS endpoint from a bare domain", async () => {
    vi.stubGlobal("fetch", mockFetch(VALID_MANIFEST));

    const result = await discoverEndpoint("crm.example.com");

    expect(fetch).toHaveBeenCalledWith(
      "https://crm.example.com/.well-known/linkedin-export.json",
      expect.objectContaining({ method: "GET" })
    );
    expect(result.origin).toBe("https://crm.example.com");
    expect(result.endpoint_url).toBe("https://crm.example.com/api/linkedin-import");
    expect(result.name).toBe("Test CRM");
    expect(result.icon).toBe("https://crm.example.com/icon.png");
    expect(result.enabled).toBe(true);
    expect(result.registered_at).toBeTruthy();
  });

  it("accepts a full https:// URL", async () => {
    vi.stubGlobal("fetch", mockFetch(VALID_MANIFEST));

    const result = await discoverEndpoint("https://crm.example.com");

    expect(result.origin).toBe("https://crm.example.com");
    expect(result.endpoint_url).toBe("https://crm.example.com/api/linkedin-import");
  });

  it("allows localhost for dev", async () => {
    vi.stubGlobal("fetch", mockFetch(VALID_MANIFEST));

    const result = await discoverEndpoint("http://localhost:3456");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3456/.well-known/linkedin-export.json",
      expect.any(Object)
    );
    expect(result.origin).toBe("http://localhost:3456");
    expect(result.endpoint_url).toBe("http://localhost:3456/api/linkedin-import");
  });

  it("allows 127.0.0.1 for dev", async () => {
    vi.stubGlobal("fetch", mockFetch(VALID_MANIFEST));

    const result = await discoverEndpoint("http://127.0.0.1:8080");

    expect(result.origin).toBe("http://127.0.0.1:8080");
  });

  it("omits icon when not in manifest", async () => {
    const manifest = { ...VALID_MANIFEST, icon: undefined };
    vi.stubGlobal("fetch", mockFetch(manifest));

    const result = await discoverEndpoint("crm.example.com");

    expect(result.icon).toBeUndefined();
  });

  // --- HTTPS enforcement ---

  it("normalizes bare domain to https", async () => {
    // http:// input for non-localhost gets normalized to https://
    // (the code prepends https:// when the input doesn't start with https://)
    vi.stubGlobal("fetch", mockFetch(VALID_MANIFEST));

    const result = await discoverEndpoint("crm.example.com");
    expect(result.origin).toBe("https://crm.example.com");
  });

  // --- Fetch errors ---

  it("throws on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("DNS failed")));

    await expect(discoverEndpoint("crm.example.com")).rejects.toThrow(DiscoveryError);
    await expect(discoverEndpoint("crm.example.com")).rejects.toThrow("DNS failed");
  });

  it("throws on non-200 response", async () => {
    vi.stubGlobal("fetch", mockFetch({}, 404));

    await expect(discoverEndpoint("crm.example.com")).rejects.toThrow("404");
  });

  it("throws on invalid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error("bad json")),
      })
    );

    await expect(discoverEndpoint("crm.example.com")).rejects.toThrow("valid JSON");
  });

  // --- Manifest validation ---

  it("rejects non-object manifest", async () => {
    vi.stubGlobal("fetch", mockFetch("just a string"));

    await expect(discoverEndpoint("crm.example.com")).rejects.toThrow("not a JSON object");
  });

  it("rejects wrong schema_version", async () => {
    vi.stubGlobal("fetch", mockFetch({ ...VALID_MANIFEST, schema_version: 2 }));

    await expect(discoverEndpoint("crm.example.com")).rejects.toThrow("schema_version");
  });

  it("rejects missing name", async () => {
    vi.stubGlobal("fetch", mockFetch({ ...VALID_MANIFEST, name: "" }));

    await expect(discoverEndpoint("crm.example.com")).rejects.toThrow("name");
  });

  it("rejects missing endpoint", async () => {
    vi.stubGlobal("fetch", mockFetch({ ...VALID_MANIFEST, endpoint: "" }));

    await expect(discoverEndpoint("crm.example.com")).rejects.toThrow("endpoint");
  });

  // --- Same-origin enforcement ---

  it("rejects cross-origin endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ ...VALID_MANIFEST, endpoint: "https://evil.com/steal" })
    );

    await expect(discoverEndpoint("crm.example.com")).rejects.toThrow("does not match");
  });

  // --- Invalid domain ---

  it("rejects garbage input", async () => {
    await expect(discoverEndpoint("not a domain at all!!!")).rejects.toThrow(DiscoveryError);
  });
});
