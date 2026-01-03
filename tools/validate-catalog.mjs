import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const filename = fileURLToPath(import.meta.url);
const jiti = require("jiti")(filename, { esmResolve: true, interopDefault: true });

const modulePath = path.resolve(
  process.cwd(),
  "src",
  "app",
  "content",
  "validators",
  "catalog.validator.ts"
);

const { validateCatalogs } = jiti(modulePath);
const report = validateCatalogs();

if (report.warnings?.length) {
  console.warn("Catalog validation warnings:");
  report.warnings.forEach((msg) => console.warn(`- ${msg}`));
}

if (report.errors?.length) {
  console.error("Catalog validation errors:");
  report.errors.forEach((msg) => console.error(`- ${msg}`));
  process.exit(1);
}

console.log("Catalog validation passed.");
