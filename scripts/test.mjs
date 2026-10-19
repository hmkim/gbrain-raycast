// Bundles test/*.test.ts with esbuild (no Raycast runtime needed) and runs them with node:test.
import { build } from "esbuild";
import { readdirSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const out = join("node_modules", ".cache", "gbrain-tests");
mkdirSync(out, { recursive: true });
const entries = readdirSync("test")
  .filter((f) => f.endsWith(".test.ts"))
  .map((f) => join("test", f));
await build({
  entryPoints: entries,
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: out,
  outExtension: { ".js": ".mjs" },
  external: ["@raycast/api"],
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  logLevel: "warning",
});
const files = entries.map((e) => resolve(out, e.replace(/^test\//, "").replace(/\.ts$/, ".mjs")));
const r = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(r.status ?? 1);
