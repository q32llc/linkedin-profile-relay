import * as esbuild from "esbuild";
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const watch = process.argv.includes("--watch");
const prod = process.argv.includes("--prod");
const outdir = prod ? "dist-prod" : "dist";

// Map @liex/* workspace packages to submodule source paths
const SUBMODULE = "lib/linkedin-profile-export/packages";
const alias = {};
for (const dir of readdirSync(SUBMODULE)) {
  const pkgPath = resolve(SUBMODULE, dir, "package.json");
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    alias[pkg.name] = resolve(SUBMODULE, dir, "src/index.ts");
  } catch {}
}

const shared = {
  bundle: true,
  sourcemap: !prod,
  target: "chrome120",
  format: "esm",
  alias,
  minify: prod,
};

const entries = [
  { entryPoints: ["src/background.ts"], outfile: `${outdir}/background.js` },
  { entryPoints: ["src/content.ts"], outfile: `${outdir}/content.js` },
  { entryPoints: ["src/popup.ts"], outfile: `${outdir}/popup.js` },
];

mkdirSync(outdir, { recursive: true });

// Build manifest — strip localhost permissions for prod
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
if (prod) {
  // Prod uses activeTab only — strip all host permissions
  manifest.host_permissions = [];
  if (manifest.externally_connectable?.matches) {
    manifest.externally_connectable.matches = manifest.externally_connectable.matches.filter(
      (p) => !p.includes("localhost")
    );
  }
}
writeFileSync(`${outdir}/manifest.json`, JSON.stringify(manifest, null, 2));

// Copy static assets
cpSync("src/popup.html", `${outdir}/popup.html`);
cpSync("icons", `${outdir}/icons`, { recursive: true });

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
  const mode = prod ? "PROD" : "DEV";
  console.log(`Build complete (${mode}) → ${outdir}/`);
}
