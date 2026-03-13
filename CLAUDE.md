# LinkedIn Profile Relay — Chrome Extension

Chrome MV3 extension that scrapes LinkedIn profiles and POSTs structured data
to registered CRM endpoints.

## Architecture

- **Discovery**: CRM sites serve `/.well-known/linkedin-export.json` manifests
- **Registration**: Extension validates HTTPS + manifest, stores endpoint
- **Scrape**: Content script runs the extractor on LinkedIn profile DOM
- **Relay**: Background worker POSTs to all enabled endpoints

## Key directories

- `src/` — Extension source (TypeScript)
- `dist/` — Build output (load as unpacked extension)
- `docs/` — Integration guide for CRM vendors
- `lib/linkedin-profile-export/` — Git submodule with the extractor

## Build

```bash
pnpm install
pnpm build     # → dist/
```

Load `dist/` as an unpacked extension in `chrome://extensions`.

## Dependencies

- `linkedin-profile-export` is added as a git submodule under `lib/`
- The content script bundles the extractor at build time via esbuild
