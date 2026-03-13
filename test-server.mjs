/**
 * Minimal test server for development.
 *
 * - GET  /.well-known/linkedin-export.json  → serves the manifest
 * - POST /api/linkedin-import               → logs the received profile data
 * - GET  /                                  → serves a page with a "Connect" button
 *
 * Usage: node test-server.mjs [port]
 */

import { createServer } from "http";

const PORT = parseInt(process.argv[2] || "3456", 10);

const MANIFEST = JSON.stringify({
  schema_version: 1,
  name: "Test CRM (localhost)",
  endpoint: "/api/linkedin-import",
  icon: "",
}, null, 2);

const INDEX_HTML = `<!DOCTYPE html>
<html>
<head><title>Test CRM</title></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 40px auto;">
  <h1>Test CRM</h1>
  <p>This is a fake CRM site for testing the LinkedIn Profile Relay extension.</p>
  <h2>Received Profiles</h2>
  <pre id="log" style="background: #f5f5f5; padding: 16px; max-height: 400px; overflow: auto;">Waiting for data...</pre>
  <script>
    // Poll for received profiles (simple dev tool)
    setInterval(async () => {
      const res = await fetch('/api/received');
      const data = await res.json();
      if (data.length > 0) {
        document.getElementById('log').textContent = JSON.stringify(data, null, 2);
      }
    }, 2000);
  </script>
</body>
</html>`;

/** @type {unknown[]} */
const received = [];

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  console.log(`${req.method} ${url.pathname}`);

  // CORS headers for extension requests
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Manifest discovery
  if (url.pathname === "/.well-known/linkedin-export.json") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(MANIFEST);
    return;
  }

  // Receive profile data
  if (url.pathname === "/api/linkedin-import" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        received.push({ received_at: new Date().toISOString(), data });
        console.log("\n=== RECEIVED PROFILE ===");
        console.log("Name:", data.top_card?.full_name ?? "(unknown)");
        console.log("URL:", data.source?.profile_url ?? "(unknown)");
        console.log("Sections:", data.sections?.length ?? 0);
        console.log("========================\n");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error("Bad JSON:", err);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid JSON" }));
      }
    });
    return;
  }

  // View received profiles (for the test page)
  if (url.pathname === "/api/received") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(received));
    return;
  }

  // Index page
  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(INDEX_HTML);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`\nTest CRM server running at http://localhost:${PORT}`);
  console.log(`  Manifest:  http://localhost:${PORT}/.well-known/linkedin-export.json`);
  console.log(`  POST endpoint: http://localhost:${PORT}/api/linkedin-import`);
  console.log(`\nIn the extension popup, register: http://localhost:${PORT}\n`);
});
