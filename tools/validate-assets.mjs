import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentRoot = path.join(root, "src", "app", "content");
const assetsRoot = path.join(root, "src", "assets");

const assetSources = new Map();

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      return;
    }
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      collectFromFile(full);
    }
  });
}

function collectFromFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const assetRegex = /['"`](assets\/[^'"`]+)['"`]/g;
  let match;
  while ((match = assetRegex.exec(content))) {
    const assetPath = match[1];
    if (!assetPath.startsWith("assets/")) continue;
    if (assetPath.includes("${")) continue;
    addAsset(assetPath, filePath);
  }

  const spriteRegex =
    /\b(?:battleSpriteId|defaultBattleSpriteId)\s*:\s*['"`]([^'"`]+)['"`]/g;
  while ((match = spriteRegex.exec(content))) {
    const spriteId = match[1];
    const assetPath = spriteIdToAssetPath(spriteId);
    addAsset(assetPath, filePath);
  }
}

function spriteIdToAssetPath(spriteId) {
  const safeId = spriteId?.trim() ? spriteId : "velvet_battle_default";
  const folder = safeId.split("_")[0] || "velvet";
  return `assets/battle/characters/${folder}/${safeId}.png`;
}

function addAsset(assetPath, filePath) {
  const sources = assetSources.get(assetPath) ?? new Set();
  sources.add(path.relative(root, filePath));
  assetSources.set(assetPath, sources);
}

function resolveAssetPath(assetPath) {
  const relative = assetPath.replace(/^assets\//, "");
  return path.join(assetsRoot, relative);
}

walk(contentRoot);

const missing = [];
for (const [assetPath, sources] of assetSources.entries()) {
  const absPath = resolveAssetPath(assetPath);
  if (!fs.existsSync(absPath)) {
    missing.push({
      assetPath,
      sources: Array.from(sources).sort(),
    });
  }
}

if (missing.length) {
  console.error("Missing asset files:");
  missing
    .sort((a, b) => a.assetPath.localeCompare(b.assetPath))
    .forEach((entry) => {
      console.error(`- ${entry.assetPath}`);
      entry.sources.forEach((source) => console.error(`  referenced by ${source}`));
    });
  process.exit(1);
}

console.log(`Asset validation passed (${assetSources.size} paths checked).`);
