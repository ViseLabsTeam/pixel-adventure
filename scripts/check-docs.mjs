import { readdir, readFile, access } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
const root = process.cwd(),
  files = [];
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (
      [
        "node_modules",
        ".git",
        ".idea",
        "dist",
        "artifacts",
        "test-results",
      ].includes(entry.name)
    )
      continue;
    const file = resolve(dir, entry.name);
    if (entry.isDirectory()) await scan(file);
    else if (entry.name.endsWith(".md")) files.push(file);
  }
}
await scan(root);
const failures = [];
let links = 0;
for (const file of files) {
  const body = await readFile(file, "utf8");
  for (const match of body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    links++;
    try {
      await access(resolve(dirname(file), decodeURIComponent(target)));
    } catch {
      failures.push(relative(root, file) + ": " + target);
    }
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    files.length + " documentos; " + links + " enlaces locales válidos.",
  );
