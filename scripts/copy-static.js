const fs = require("fs/promises");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "client", "dist");
const imgDir = path.join(projectRoot, "img");
const fontDir = path.join(projectRoot, "font");

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  try {
    await fs.access(distDir);
  } catch {
    console.error("dist folder not found. Run the build first.");
    process.exit(1);
  }

  try {
    await fs.access(imgDir);
  } catch {
    console.warn("img folder not found. Skipping static copy.");
  }

  const imgTarget = path.join(distDir, "img");
  await copyDir(imgDir, imgTarget);
  console.log("Copied img to dist/img");

  try {
    await fs.access(fontDir);
    const fontTarget = path.join(distDir, "font");
    await copyDir(fontDir, fontTarget);
    console.log("Copied font to dist/font");
  } catch {
    console.warn("font folder not found. Skipping font copy.");
  }
}

main().catch((error) => {
  console.error("Static copy failed:", error);
  process.exit(1);
});
