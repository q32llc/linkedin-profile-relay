# LinkedIn Profile Relay

A Chrome extension that scrapes LinkedIn profiles and POSTs structured data to any registered endpoint. CRM and ATS vendors can receive LinkedIn data without building their own extension — just serve a manifest file.

```
[LinkedIn profile]  →  [Extension]  →  [Your CRM]  [Another CRM]  [ATS]
                         scrapes         POSTs to all registered endpoints
```

## For users

1. Install the extension from the [Chrome Web Store](#) <!-- TODO: update with store URL -->
2. Open the extension popup and enter your CRM's domain (e.g. `crm.example.com`)
3. Navigate to any LinkedIn profile and click **Scrape & Relay**
4. Done — structured profile data is sent to your registered endpoints

You can register multiple endpoints and toggle them on/off from the popup.

## For CRM / ATS vendors

Your site becomes a receiver in two steps:

**1. Serve a manifest** at `https://your-domain.com/.well-known/linkedin-export.json`:

```json
{
  "schema_version": 1,
  "name": "Your CRM Name",
  "endpoint": "/api/linkedin-import"
}
```

**2. Handle the POST** — your endpoint receives a `LinkedInExport` JSON payload with top card info, experience, education, skills, and more.

That's it. Users point the extension at your domain, it discovers the manifest, and you start receiving data.

For one-click registration buttons, payload schema, and full details see the **[Integration Guide](docs/integration-guide.md)**.

## Security

- **HTTPS-only** — endpoints must have valid SSL certificates (localhost exempt for dev)
- **Same-origin enforcement** — the POST endpoint must be on the same origin as the manifest
- **User-controlled** — data is only sent when the user clicks the button, only to endpoints they've registered
- **No telemetry** — the extension sends no data to the developer or any third party

## Development

```bash
pnpm install
pnpm build          # dev build → dist/
pnpm build:prod     # prod build → dist-prod/ (minified, no localhost)
pnpm test           # unit + integration tests
pnpm test:e2e       # e2e with Playwright (requires login, see tests/save-login.mjs)
```

Load `dist/` as an unpacked extension at `chrome://extensions` (developer mode).

## License

[MIT](LICENSE)

## Privacy Policy

[Privacy Policy](store/privacy-policy.md)
