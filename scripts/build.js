/**
 * Material You New Tab - Build & Verification Script
 * Validates project structure, assets, scripts, locales, and schemas.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("🚀 Starting Material You New Tab build verification...\n");

let errors = 0;
let warnings = 0;

function checkFile(relPath, required = true) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    if (required) {
      console.error(`❌ Missing required file: ${relPath}`);
      errors++;
    } else {
      console.warn(`⚠️  Optional file missing: ${relPath}`);
      warnings++;
    }
    return false;
  }
  return true;
}

// 1. Verify Core Files
const coreFiles = [
  "index.html",
  "style.css",
  "manifest.json",
  "package.json",
  "server/index.js",
  "server/app.js",
  "server/routes/api.js",
  "server/routes/health.js",
  "server/routes/suggestions.js",
  "server/routes/weather.js",
  "server/routes/quotes.js",
  "server/routes/bookmarks.js",
  "server/middleware/security.js",
  "server/middleware/errorHandler.js"
];

for (const file of coreFiles) {
  checkFile(file);
}

// 2. Validate JSON Schemas
const jsonFiles = [
  "manifest.json",
  "package.json",
  "server/data/quotes.json",
  "server/data/default-bookmarks.json"
];

for (const jsonFile of jsonFiles) {
  const fullPath = path.join(rootDir, jsonFile);
  if (fs.existsSync(fullPath)) {
    try {
      JSON.parse(fs.readFileSync(fullPath, "utf-8"));
      console.log(`✅ Valid JSON: ${jsonFile}`);
    } catch (err) {
      console.error(`❌ Corrupt JSON in ${jsonFile}: ${err.message}`);
      errors++;
    }
  }
}

// 3. Verify Scripts Referenced in index.html Exist on Disk
const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf-8");
const scriptMatches = [...indexHtml.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/gi)];

console.log(`\n🔍 Verifying ${scriptMatches.length} script tags in index.html...`);
for (const match of scriptMatches) {
  const scriptSrc = match[1];
  if (!scriptSrc.startsWith("http://") && !scriptSrc.startsWith("https://")) {
    const cleanSrc = scriptSrc.replace(/^\.\//, "");
    if (!checkFile(cleanSrc)) {
      errors++;
    }
  }
}

// 4. Asset Summary
const localesDir = path.join(rootDir, "locales");
const localesCount = fs.existsSync(localesDir) ? fs.readdirSync(localesDir).filter(f => f.endsWith(".js")).length : 0;

const scriptsDir = path.join(rootDir, "scripts");
const scriptsCount = fs.existsSync(scriptsDir) ? fs.readdirSync(scriptsDir).filter(f => f.endsWith(".js")).length : 0;

const svgsDir = path.join(rootDir, "svgs");
const svgsCount = fs.existsSync(svgsDir) ? fs.readdirSync(svgsDir).filter(f => f.endsWith(".svg")).length : 0;

console.log("\n📊 Project Assets Summary:");
console.log(`   - Scripts:  ${scriptsCount} files`);
console.log(`   - Locales:  ${localesCount} languages`);
console.log(`   - Icons:    ${svgsCount} SVGs`);

if (errors > 0) {
  console.error(`\n❌ Build verification failed with ${errors} error(s) and ${warnings} warning(s).`);
  process.exit(1);
} else {
  console.log(`\n✨ Build verification passed cleanly with 0 errors!`);
}
