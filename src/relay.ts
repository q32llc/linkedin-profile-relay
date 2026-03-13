import type { RegisteredEndpoint } from "./types.js";
import { getEndpoints } from "./storage.js";

export type RelayResult = {
  origin: string;
  ok: boolean;
  status: number;
  error?: string;
};

/**
 * POST scraped profile data to all enabled registered endpoints.
 */
export async function relayToEndpoints(profileData: unknown): Promise<RelayResult[]> {
  const endpoints = await getEndpoints();
  const active = endpoints.filter((e) => e.enabled);

  if (active.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    active.map((ep) => postToEndpoint(ep, profileData))
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      origin: active[i].origin,
      ok: false,
      status: 0,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });
}

async function postToEndpoint(ep: RegisteredEndpoint, data: unknown): Promise<RelayResult> {
  const response = await fetch(ep.endpoint_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  return {
    origin: ep.origin,
    ok: response.ok,
    status: response.status,
  };
}
