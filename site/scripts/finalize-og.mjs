/**
 * GitHub Pages serves extensionless files as application/octet-stream, which
 * breaks social previews. The Next metadata route writes the Open Graph card
 * to out/opengraph-image with no extension, so after the export we copy it to
 * out/og.png and point the meta tags at that.
 *
 * Runs from the site directory after `next build`. Safe to run when no
 * Open Graph image was generated.
 */
import { access, copyFile, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const out = "out";
const source = join(out, "opengraph-image");

try {
  await access(source);
} catch {
  console.log("finalize-og: no opengraph-image in the export, nothing to do");
  process.exit(0);
}

await copyFile(source, join(out, "og.png"));

let rewrites = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    const html = await readFile(full, "utf8");
    const next = html.replace(/opengraph-image(\?[^"'\s>]*)?/g, "og.png");
    if (next !== html) {
      await writeFile(full, next);
      rewrites += 1;
    }
  }
}

await walk(out);
console.log(`finalize-og: wrote out/og.png and updated ${rewrites} page(s)`);
