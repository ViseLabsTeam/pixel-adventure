import { build } from "esbuild";
import { readFile } from "node:fs/promises";
const { dependencies } = JSON.parse(
  await readFile("apps/server/package.json", "utf8"),
);
await build({
  entryPoints: ["apps/server/src/index.ts"],
  outfile: "apps/server/dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  external: Object.keys(dependencies).filter(
    (name) => !name.startsWith("@umbral/"),
  ),
});
