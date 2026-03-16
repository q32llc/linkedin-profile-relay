# CRM Integration Guide

## How to make your site work with LinkedIn Profile Relay

### 1. Serve a `.well-known` manifest

Create a file at `https://your-domain.com/.well-known/linkedin-export.json`:

```json
{
  "schema_version": 1,
  "name": "Your CRM Name",
  "endpoint": "/api/linkedin-import",
  "icon": "/favicon.png"
}
```

Requirements:
- Must be served over **HTTPS** with a valid SSL certificate
- `endpoint` is resolved relative to your origin (must stay on the same origin)
- `name` is shown to the user in the extension popup
- `icon` is optional, displayed next to your name

### 2. Add a one-click connect button

Add this snippet to your site. When users click it, the extension
discovers your `.well-known` manifest and registers your endpoint.

The extension declares `externally_connectable` for all HTTPS origins,
so any site can trigger registration — no need to be pre-listed.

```html
<button id="connect-linkedin-relay">Connect LinkedIn Profile Relay</button>

<script>
  // Extension ID from the Chrome Web Store listing
  const EXTENSION_ID = "YOUR_EXTENSION_ID_HERE";

  const btn = document.getElementById("connect-linkedin-relay");

  btn.addEventListener("click", () => {
    if (!chrome?.runtime?.sendMessage) {
      // Extension not installed — direct user to install it
      window.open(
        "https://chromewebstore.google.com/detail/" + EXTENSION_ID,
        "_blank"
      );
      return;
    }

    chrome.runtime.sendMessage(
      EXTENSION_ID,
      { action: "register", origin: window.location.origin },
      (response) => {
        if (chrome.runtime.lastError) {
          // Extension not installed or not connectable
          window.open(
            "https://chromewebstore.google.com/detail/" + EXTENSION_ID,
            "_blank"
          );
          return;
        }
        if (response?.success) {
          alert(`Connected! ${response.endpoint.name} will now receive LinkedIn profiles.`);
        } else {
          alert(`Connection failed: ${response?.error}`);
        }
      }
    );
  });
</script>
```

The button gracefully degrades: if the extension isn't installed, it
redirects to the Chrome Web Store listing instead.

### 3. Handle incoming POSTs

Your endpoint receives a JSON body matching the `LinkedInExport` schema:

```json
{
  "source": {
    "platform": "linkedin",
    "profile_url": "https://www.linkedin.com/in/someone",
    "captured_at": "2026-03-13T12:00:00.000Z"
  },
  "top_card": {
    "full_name": "Jane Smith",
    "headline": "Software Engineer at Acme",
    "location": "San Francisco, CA",
    ...
  },
  "sections": [
    { "id": "experience", "heading": "Experience", "items": [...] },
    { "id": "education", "heading": "Education", "items": [...] },
    ...
  ],
  "warnings": []
}
```

Respond with any 2xx status to confirm receipt.

### 4. Payload schema

The full TypeScript types are available in the
[linkedin-profile-extractor](https://github.com/earonesty/linkedin-profile-extractor) repository under
`packages/schema/src/types.ts`.
