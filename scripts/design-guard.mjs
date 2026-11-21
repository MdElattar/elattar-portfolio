import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const baselinePath = join(root, ".design-guard.json");
const update = process.argv.includes("--update");
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
      walk(full);
    } else if (/\.(tsx|jsx|css)$/.test(entry.name)) {
      files.push(full);
    }
  }
}

walk(join(root, "src"));

const tokens = [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const add = (value) => {
    const normalized = String(value).replace(/\s+/g, " ").trim();
    if (normalized) tokens.push(`${relative(root, file)}:${normalized}`);
  };

  for (const match of source.matchAll(/className\s*=\s*(?:`([^`]*)`|"([^"]*)")/g)) {
    add(match[1] ?? match[2]);
  }
  for (const match of source.matchAll(/style\s*=\s*\{\{([\s\S]*?)\}\}/g)) add(match[1]);
  for (const match of source.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) add(match[0]);
  for (const match of source.matchAll(/rgba?\([^)]*\)/g)) add(match[0]);
  for (const match of source.matchAll(/font-family\s*:\s*([^;]+);/g)) add(match[1]);
  for (const match of source.matchAll(/\b(initial|animate|exit|transition|variants)\s*=\s*\{\{([\s\S]*?)\}\}/g)) {
    add(`${match[1]}=${match[2]}`);
  }
  for (const match of source.matchAll(/numStars\s*=\s*\d+/g)) add(match[0]);
}

tokens.sort();
const hash = createHash("sha256").update(tokens.join("\n")).digest("hex");
const report = { hash, count: tokens.length };

if (update || !existsSync(baselinePath)) {
  writeFileSync(baselinePath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Design guard baseline updated: ${report.count} visual tokens (${hash.slice(0, 12)})`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
if (baseline.hash !== hash) {
  console.error(`Design guard failed: visual token signature changed (${baseline.count} -> ${report.count}).`);
  console.error(`Expected ${baseline.hash.slice(0, 12)}, got ${hash.slice(0, 12)}.`);
  process.exit(1);
}

console.log(`Design guard passed: ${report.count} visual tokens unchanged (${hash.slice(0, 12)})`);
