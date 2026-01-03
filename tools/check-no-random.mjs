import { readdir, readFile } from "fs/promises";
import path from "path";

const ROOT = path.resolve("src/app");
const DEV_ROOT = path.join(ROOT, "features", "dev");
const MATCH = /Math\.random/;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

function isAllowed(filePath) {
  if (filePath.endsWith(".spec.ts")) return true;
  if (filePath.startsWith(DEV_ROOT)) return true;
  return false;
}

function findMatches(content) {
  const results = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (MATCH.test(line)) {
      results.push({ line: index + 1, text: line.trim() });
    }
  });
  return results;
}

async function main() {
  const files = await walk(ROOT);
  const failures = [];

  for (const file of files) {
    if (isAllowed(file)) continue;
    const content = await readFile(file, "utf8");
    const hits = findMatches(content);
    hits.forEach(hit => {
      failures.push({ file, ...hit });
    });
  }

  if (failures.length) {
    console.error("Found Math.random usage in runtime code:");
    failures.forEach(hit => {
      console.error(`- ${hit.file}:${hit.line} ${hit.text}`);
    });
    process.exit(1);
  }
}

main().catch(error => {
  console.error("check:no-random failed", error);
  process.exit(1);
});
