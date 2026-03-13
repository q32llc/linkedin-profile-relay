import type { EndpointManifest, RegisteredEndpoint } from "./types.js";

const WELL_KNOWN_PATH = "/.well-known/linkedin-export.json";

export class DiscoveryError extends Error {
  constructor(message: string, public readonly origin: string) {
    super(message);
    this.name = "DiscoveryError";
  }
}

/**
 * Fetch and validate the .well-known manifest for a domain.
 * Enforces HTTPS and validates the manifest schema.
 */
export async function discoverEndpoint(origin: string): Promise<RegisteredEndpoint> {
  // Normalize: accept bare domains, ensure https (localhost allowed for dev)
  const isLocalDev =
    origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1");
  let url: URL;
  try {
    const normalized = isLocalDev
      ? origin
      : origin.startsWith("https://")
        ? origin
        : `https://${origin}`;
    url = new URL(WELL_KNOWN_PATH, normalized);
  } catch {
    throw new DiscoveryError(`Invalid domain: ${origin}`, origin);
  }

  if (url.protocol !== "https:" && !isLocalDev) {
    throw new DiscoveryError("Only HTTPS endpoints are allowed", origin);
  }

  const manifestUrl = url.toString();

  let response: Response;
  try {
    response = await fetch(manifestUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    throw new DiscoveryError(
      `Failed to fetch ${manifestUrl}: ${err instanceof Error ? err.message : String(err)}`,
      origin
    );
  }

  if (!response.ok) {
    throw new DiscoveryError(
      `${manifestUrl} returned ${response.status} ${response.statusText}`,
      origin
    );
  }

  let manifest: unknown;
  try {
    manifest = await response.json();
  } catch {
    throw new DiscoveryError(`${manifestUrl} did not return valid JSON`, origin);
  }

  // Validate manifest shape
  if (!manifest || typeof manifest !== "object") {
    throw new DiscoveryError("Manifest is not a JSON object", origin);
  }

  const m = manifest as Record<string, unknown>;

  if (m.schema_version !== 1) {
    throw new DiscoveryError(`Unsupported schema_version: ${m.schema_version}`, origin);
  }

  if (typeof m.name !== "string" || m.name.length === 0) {
    throw new DiscoveryError("Manifest missing required 'name' field", origin);
  }

  if (typeof m.endpoint !== "string" || m.endpoint.length === 0) {
    throw new DiscoveryError("Manifest missing required 'endpoint' field", origin);
  }

  // Resolve endpoint URL relative to origin
  let endpointUrl: URL;
  try {
    endpointUrl = new URL(m.endpoint, url.origin);
  } catch {
    throw new DiscoveryError(`Invalid endpoint path: ${m.endpoint}`, origin);
  }

  // Endpoint must be on the same origin (no open redirect attacks)
  if (endpointUrl.origin !== url.origin) {
    throw new DiscoveryError(
      `Endpoint origin ${endpointUrl.origin} does not match manifest origin ${url.origin}`,
      origin
    );
  }

  return {
    origin: url.origin,
    endpoint_url: endpointUrl.toString(),
    name: m.name as string,
    icon: typeof m.icon === "string" ? new URL(m.icon, url.origin).toString() : undefined,
    registered_at: new Date().toISOString(),
    enabled: true,
  };
}
