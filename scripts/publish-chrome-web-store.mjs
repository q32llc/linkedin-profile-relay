import { readFile } from "node:fs/promises";

const [archivePath] = process.argv.slice(2);
const accessToken = process.env.GOOGLE_ACCESS_TOKEN;
const publisherId = process.env.CHROME_PUBLISHER_ID;
const extensionId = process.env.CHROME_EXTENSION_ID;

if (!archivePath || !accessToken || !publisherId || !extensionId) {
  console.error(
    "Usage: GOOGLE_ACCESS_TOKEN=... CHROME_PUBLISHER_ID=... CHROME_EXTENSION_ID=... node scripts/publish-chrome-web-store.mjs <archive.zip>",
  );
  process.exit(2);
}

const itemName = `publishers/${publisherId}/items/${extensionId}`;
const apiBase = "https://chromewebstore.googleapis.com";
const authorization = `Bearer ${accessToken}`;

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: authorization,
      ...options.headers,
    },
  });
  const body = await response.text();
  let json;
  try {
    json = body ? JSON.parse(body) : {};
  } catch {
    json = { body };
  }
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${url} failed (${response.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

const archive = await readFile(archivePath);
console.log(`Uploading ${archivePath} to Chrome Web Store API v2...`);
const upload = await requestJson(`${apiBase}/upload/v2/${itemName}:upload`, {
  method: "POST",
  headers: { "Content-Type": "application/zip" },
  body: archive,
});
console.log(`Upload state: ${upload.uploadState}`);

let uploadState = upload.uploadState;
const deadline = Date.now() + 4 * 60 * 1000;
while (uploadState === "IN_PROGRESS" || uploadState === "UPLOAD_IN_PROGRESS") {
  if (Date.now() >= deadline) {
    throw new Error("Chrome Web Store upload was still processing after 4 minutes");
  }
  await new Promise((resolve) => setTimeout(resolve, 5_000));
  const status = await requestJson(`${apiBase}/v2/${itemName}:fetchStatus`);
  uploadState = status.lastAsyncUploadState;
  console.log(`Upload state: ${uploadState}`);
}

if (uploadState !== "SUCCEEDED" && uploadState !== "UPLOAD_SUCCEEDED") {
  throw new Error(`Chrome Web Store upload did not succeed: ${uploadState}`);
}

console.log("Submitting the uploaded version for publication...");
const published = await requestJson(`${apiBase}/v2/${itemName}:publish`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" }),
});
console.log(`Submission state: ${published.state}`);
