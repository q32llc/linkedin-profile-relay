import type { RegisteredEndpoint } from "./types.js";

const STORAGE_KEY = "registered_endpoints";

export async function getEndpoints(): Promise<RegisteredEndpoint[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] ?? [];
}

export async function saveEndpoints(endpoints: RegisteredEndpoint[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: endpoints });
}

export async function addEndpoint(endpoint: RegisteredEndpoint): Promise<void> {
  const endpoints = await getEndpoints();
  // Replace if same origin already registered
  const filtered = endpoints.filter((e) => e.origin !== endpoint.origin);
  filtered.push(endpoint);
  await saveEndpoints(filtered);
}

export async function removeEndpoint(origin: string): Promise<void> {
  const endpoints = await getEndpoints();
  await saveEndpoints(endpoints.filter((e) => e.origin !== origin));
}

export async function toggleEndpoint(origin: string, enabled: boolean): Promise<void> {
  const endpoints = await getEndpoints();
  const ep = endpoints.find((e) => e.origin === origin);
  if (ep) {
    ep.enabled = enabled;
    await saveEndpoints(endpoints);
  }
}
