/**
 * Bump version in package.json and manifest.json, commit, tag, and push.
 *
 * Usage: node scripts/release.mjs <patch|minor|major>
 *   or:  node scripts/release.mjs 0.2.0
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node scripts/release.mjs <patch|minor|major|x.y.z>");
  process.exit(1);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));

const [major, minor, patch] = pkg.version.split(".").map(Number);

let newVersion;
if (arg === "patch") newVersion = `${major}.${minor}.${patch + 1}`;
else if (arg === "minor") newVersion = `${major}.${minor + 1}.0`;
else if (arg === "major") newVersion = `${major + 1}.0.0`;
else if (/^\d+\.\d+\.\d+$/.test(arg)) newVersion = arg;
else {
  console.error(`Invalid version: ${arg}`);
  process.exit(1);
}

console.log(`${pkg.version} → ${newVersion}`);

pkg.version = newVersion;
manifest.version = newVersion;

writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
writeFileSync("manifest.json", JSON.stringify(manifest, null, 2) + "\n");

execSync("git add package.json manifest.json", { stdio: "inherit" });
execSync(`git commit -m "Release v${newVersion}"`, { stdio: "inherit" });
execSync(`git tag v${newVersion}`, { stdio: "inherit" });
execSync("git push && git push --tags", { stdio: "inherit" });

console.log(`\nReleased v${newVersion} — publish workflow will run automatically.`);
