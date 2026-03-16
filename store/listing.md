# Chrome Web Store Listing

## Name (max 75 chars)
LinkedIn Profile Relay

## Short description (max 132 chars)
Scrape LinkedIn profiles with one click and relay structured data to your CRM — no custom extension needed.

## Detailed description

### For recruiters and sales teams
Scrape any LinkedIn profile with one click and automatically send structured
data to your CRM, ATS, or any tool that supports it. No copy-pasting, no
manual data entry.

### For CRM and ATS vendors
Let your users import LinkedIn profiles without building your own extension.
Just serve a simple manifest file at /.well-known/linkedin-export.json and
your users can connect in one click.

### How it works
1. Your CRM/ATS adds a small manifest file to their website
2. You register the CRM in the extension (one-time, takes 5 seconds)
3. Navigate to any LinkedIn profile and click "Scrape & Relay"
4. Structured profile data is POSTed to your registered endpoints

### Features
- One-click scraping from any LinkedIn profile page
- Extracts: name, headline, experience, education, skills, certifications, publications, and more
- Send to multiple CRMs simultaneously
- Toggle endpoints on/off without removing them
- Open standard: any site can become a receiver by serving a manifest
- HTTPS-only with same-origin validation for security
- No data sent to third parties — you control every endpoint
- Fully open source

### For developers
Integration guide and full payload schema available at
https://github.com/q32llc/linkedin-profile-relay

## Category
Productivity

## Language
English

## Permission justifications

### activeTab
Required to access the LinkedIn profile page the user is currently viewing
when they click the scrape button. Only activates on user action.

### tabs
Required to find open LinkedIn profile tabs when the scrape button is
clicked. Used only to locate the correct tab to extract data from.

### scripting
Required to inject the profile extraction script into LinkedIn pages.
Only runs when the user explicitly triggers a scrape.

### storage
Required to persist the user's list of registered CRM endpoints between
browser sessions.

### Host permission: linkedin.com
Required to read the DOM of LinkedIn profile pages for data extraction.

### Host permission: */.well-known/linkedin-export.json
Required to discover and validate CRM endpoint manifests when the user
registers a new endpoint.
