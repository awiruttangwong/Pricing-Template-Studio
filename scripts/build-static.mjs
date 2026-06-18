import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const entriesToCopy = ["index.html", "assets", "icons", "scripts"];

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  for (const entry of entriesToCopy) {
    const source = path.join(rootDir, entry);
    const target = path.join(distDir, entry);
    await cp(source, target, { recursive: true });
  }

  console.log(`Built static site into ${distDir}`);
}

build().catch((error) => {
  console.error("Static build failed:", error);
  process.exitCode = 1;
});
