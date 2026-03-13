/** Manifest served at https://<domain>/.well-known/linkedin-export.json */
export type EndpointManifest = {
  /** Schema version for forward-compat */
  schema_version: 1;
  /** Human-readable name shown in consent prompt */
  name: string;
  /** POST endpoint path (relative to origin, or absolute URL on same origin) */
  endpoint: string;
  /** Optional icon URL for the popup list */
  icon?: string;
  /** Optional public key (PEM or JWK) for future payload signing */
  public_key?: string;
};

/** Stored registration for a validated endpoint */
export type RegisteredEndpoint = {
  /** Origin, e.g. "https://crm.example.com" */
  origin: string;
  /** Resolved absolute POST URL */
  endpoint_url: string;
  /** Display name from manifest */
  name: string;
  /** Icon URL from manifest */
  icon?: string;
  /** When this endpoint was registered */
  registered_at: string;
  /** Whether this endpoint is currently active (receives scrapes) */
  enabled: boolean;
};

/** Message types between content script ↔ background ↔ popup */
export type Message =
  | { type: "SCRAPE_PROFILE" }
  | { type: "SCRAPE_RESULT"; data: unknown; warnings: string[] }
  | { type: "SCRAPE_ERROR"; error: string }
  | { type: "REGISTER_ENDPOINT"; origin: string }
  | { type: "REGISTER_RESULT"; success: boolean; error?: string; endpoint?: RegisteredEndpoint }
  | { type: "RELAY_RESULT"; results: Array<{ origin: string; ok: boolean; status: number }> };
