# Privacy Policy — LinkedIn Profile Relay

**Last updated:** March 2026

## What this extension does

LinkedIn Profile Relay extracts publicly visible profile data from LinkedIn
pages you are actively viewing and sends that data to endpoints you have
explicitly registered and approved.

## Data collected

- **LinkedIn profile data**: Name, headline, location, experience, education,
  skills, and other sections visible on a LinkedIn profile page you navigate to.
- **Registered endpoints**: The domain names and endpoint URLs of services you
  choose to register with the extension, stored locally in your browser.

## How data is used

- Profile data is extracted **only when you click the "Scrape & Relay" button**.
  The extension never scrapes automatically or in the background.
- Extracted data is sent **only to endpoints you have explicitly registered**.
  No data is sent to the extension developer or any third party.
- Registered endpoint information is stored locally in Chrome's extension
  storage and never transmitted anywhere.

## Data sharing

- This extension does **not** collect analytics, telemetry, or usage data.
- This extension does **not** send data to the extension developer.
- This extension does **not** use cookies or tracking mechanisms.
- Profile data is sent exclusively to endpoints you configure. You control
  which services receive your data and can remove them at any time.

## Data storage

- Registered endpoints are stored in `chrome.storage.local`, which is local
  to your browser and synced only if you have Chrome Sync enabled for
  extensions.
- No profile data is stored by the extension. It is extracted, relayed, and
  discarded.

## Permissions

| Permission | Why it's needed |
|------------|-----------------|
| `storage` | Save your list of registered endpoints |
| `activeTab` | Access the current tab to extract profile data when you click the button |
| `scripting` | Inject the extraction script into LinkedIn pages |
| `host_permissions: linkedin.com` | Read LinkedIn profile page DOM |
| `host_permissions: */.well-known/*` | Discover and validate CRM endpoint manifests |

## Your choices

- You can view, disable, or remove any registered endpoint from the extension
  popup at any time.
- You can uninstall the extension at any time, which removes all stored data.

## Contact

For questions about this privacy policy, open an issue at
https://github.com/q32llc/linkedin-profile-relay/issues
