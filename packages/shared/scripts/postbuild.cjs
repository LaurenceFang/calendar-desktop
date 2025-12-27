const { existsSync, renameSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const cjsDir = join(__dirname, "..", "dist", "cjs");
const sourceFile = join(cjsDir, "index.js");
const targetFile = join(cjsDir, "index.cjs");

if (existsSync(sourceFile)) {
  renameSync(sourceFile, targetFile);
}

writeFileSync(join(cjsDir, "package.json"), "{\n  \"type\": \"commonjs\"\n}\n");
