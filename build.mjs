import * as esbuild from "esbuild";
import { cpSync, mkdirSync, readdirSync } from "fs";
import { resolve } from "path";

const watch = process.argv.includes("--watch");

// Map @liex/* workspace packages to submodule source paths
const SUBMODULE = "lib/linkedin-profile-export/packages";
const alias = {};
for (const dir of readdirSync(SUBMODULE)) {
  const pkgPath = resolve(SUBMODULE, dir, "package.json");
  try {
    const pkg = JSON.parse((await import("fs")).readFileSync(pkgPath, "utf8"));
    alias[pkg.name] = resolve(SUBMODULE, dir, "src/index.ts");
  } catch {}
}

const shared = {
  bundle: true,
  sourcemap: true,
  target: "chrome120",
  format: "esm",
  alias,
};

const entries = [
  { entryPoints: ["src/background.ts"], outfile: "dist/background.js" },
  { entryPoints: ["src/content.ts"], outfile: "dist/content.js" },
  { entryPoints: ["src/popup.ts"], outfile: "dist/popup.js" },
];

mkdirSync("dist", { recursive: true });

// Copy static assets to dist
cpSync("manifest.json", "dist/manifest.json");
cpSync("src/popup.html", "dist/popup.html");
cpSync("icons", "dist/icons", { recursive: true });

if (watch) {
  for (const entry of entries) {
    const ctx = await esbuild.context({ ...shared, ...entry });
    await ctx.watch();
  }
  console.log("Watching for changes...");
} else {
  for (const entry of entries) {
    await esbuild.build({ ...shared, ...entry });
  }
  console.log("Build complete → dist/");
}
