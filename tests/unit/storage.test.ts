import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getEndpoints,
  saveEndpoints,
  addEndpoint,
  removeEndpoint,
  toggleEndpoint,
} from "@src/storage.js";
import type { RegisteredEndpoint } from "@src/types.js";

// Mock chrome.storage.local
let store: Record<string, unknown> = {};

vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: store[key] })),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        Object.assign(store, obj);
      }),
    },
  },
});

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
  store = {};
  vi.clearAllMocks();
});

describe("storage", () => {
  it("returns empty array when no endpoints stored", async () => {
    expect(await getEndpoints()).toEqual([]);
  });

  it("saves and retrieves endpoints", async () => {
    const ep = makeEndpoint("https://crm.example.com");
    await saveEndpoints([ep]);

    const result = await getEndpoints();
    expect(result).toHaveLength(1);
    expect(result[0].origin).toBe("https://crm.example.com");
  });

  it("addEndpoint appends new endpoint", async () => {
    await addEndpoint(makeEndpoint("https://a.com"));
    await addEndpoint(makeEndpoint("https://b.com"));

    const result = await getEndpoints();
    expect(result).toHaveLength(2);
  });

  it("addEndpoint replaces existing endpoint with same origin", async () => {
    await addEndpoint(makeEndpoint("https://a.com"));
    await addEndpoint({ ...makeEndpoint("https://a.com"), name: "Updated" });

    const result = await getEndpoints();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Updated");
  });

  it("removeEndpoint removes by origin", async () => {
    await addEndpoint(makeEndpoint("https://a.com"));
    await addEndpoint(makeEndpoint("https://b.com"));
    await removeEndpoint("https://a.com");

    const result = await getEndpoints();
    expect(result).toHaveLength(1);
    expect(result[0].origin).toBe("https://b.com");
  });

  it("removeEndpoint is a no-op for unknown origin", async () => {
    await addEndpoint(makeEndpoint("https://a.com"));
    await removeEndpoint("https://unknown.com");

    expect(await getEndpoints()).toHaveLength(1);
  });

  it("toggleEndpoint enables/disables", async () => {
    await addEndpoint(makeEndpoint("https://a.com", true));

    await toggleEndpoint("https://a.com", false);
    let result = await getEndpoints();
    expect(result[0].enabled).toBe(false);

    await toggleEndpoint("https://a.com", true);
    result = await getEndpoints();
    expect(result[0].enabled).toBe(true);
  });

  it("toggleEndpoint is a no-op for unknown origin", async () => {
    await addEndpoint(makeEndpoint("https://a.com", true));
    await toggleEndpoint("https://unknown.com", false);

    const result = await getEndpoints();
    expect(result[0].enabled).toBe(true);
  });
});
