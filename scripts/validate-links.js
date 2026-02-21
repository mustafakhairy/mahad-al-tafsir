const fs = require("fs");
const path = require("path");

const videoDir = path.join(process.cwd(), "videos");

// Mirrors generatemdx.js
const MAX_CACHE_CONTENT_BYTES = 220;

function getAllFiles(dir, ext, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllFiles(full, ext, results);
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

// Extract internal links from MDX content
// Matches both [text](<path>) and [text](path) but skips URLs and imports
function extractLinks(content) {
  const links = [];
  // Match [text](<path>) — angle bracket links
  const angleBracketRe = /\]\(<([^>]+)>\)/g;
  let m;
  while ((m = angleBracketRe.exec(content)) !== null) {
    links.push(m[1]);
  }
  // Match [text](path) — regular links (no angle brackets)
  const regularRe = /\]\(([^)<\s][^)]*)\)/g;
  while ((m = regularRe.exec(content)) !== null) {
    const href = m[1];
    // Skip external URLs and import paths
    if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("../") || href.startsWith("./")) continue;
    // Skip anchor-only links
    if (href.startsWith("#")) continue;
    links.push(href);
  }
  return links;
}

// Check if a link target resolves to a real file/directory
function resolveLink(sourceFile, linkPath) {
  const sourceDir = path.dirname(sourceFile);
  // Remove trailing slash for directory links
  const cleanPath = linkPath.replace(/\/$/, "");
  const resolved = path.resolve(sourceDir, cleanPath);

  // Try as .mdx file
  if (fs.existsSync(resolved + ".mdx")) return true;
  // Try as directory with index.mdx (for trailing-slash category links)
  if (fs.existsSync(path.join(resolved, "index.mdx"))) return true;
  // Try as exact file (if path already includes extension)
  if (fs.existsSync(resolved)) return true;

  return false;
}

// Check for filename collisions within each directory
function checkCollisions(dir) {
  const errors = [];
  const dirs = [dir];

  while (dirs.length > 0) {
    const current = dirs.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    const names = new Map(); // basename (without ext) -> full path

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        dirs.push(full);
      } else if (entry.name.endsWith(".mdx")) {
        const base = entry.name.replace(/\.mdx$/, "");
        if (names.has(base)) {
          errors.push(
            `Filename collision in ${path.relative(process.cwd(), current)}: "${base}" appears multiple times`
          );
        }
        names.set(base, full);
      }
    }
  }
  return errors;
}

// Check cache filename byte length for each MDX file
// Docusaurus cache format: site-videos-{segments}-mdx-{hash}.json
function checkCacheLength(mdxFiles) {
  const errors = [];
  for (const file of mdxFiles) {
    const rel = path.relative(videoDir, file); // e.g. "cat/section/playlist.mdx"
    const withoutExt = rel.replace(/\.mdx$/, "");
    // Docusaurus flattens path separators to hyphens
    const flattened = withoutExt.replace(/\//g, "-").replace(/ /g, "-");
    // Full cache filename pattern: site-videos-{flattened}-mdx-XXX.json
    // The hash part is typically 3 hex chars, so ~7 extra chars for "-mdx-XXX.json"
    const cachePrefix = "site-videos-" + flattened + "-mdx-";
    const cacheName = cachePrefix + "XXX.json"; // conservative estimate
    const byteLen = Buffer.from(cacheName, "utf8").length;
    // fitPlaylistNav in generatemdx.js caps content at 220 bytes; with the
    // ~25-byte overhead (site-videos-...-mdx-XXX.json) the max is ~245.
    // Warn at 250 to catch drift while avoiding false positives.
    if (byteLen > 250) {
      errors.push(
        `Cache filename too long: ${path.relative(process.cwd(), file)} (${byteLen} bytes, limit ~255)`
      );
    }
  }
  return errors;
}

// Validate _category_.json files reference valid labels
function checkCategoryJson(dir) {
  const errors = [];
  const catFiles = getAllFiles(dir, "_category_.json");

  for (const file of catFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!data.label || typeof data.label !== "string") {
        errors.push(
          `Invalid _category_.json: ${path.relative(process.cwd(), file)} — missing or invalid label`
        );
        continue;
      }
      // The label should match the directory name
      const dirName = path.basename(path.dirname(file));
      if (data.label !== dirName) {
        errors.push(
          `Label mismatch in ${path.relative(process.cwd(), file)}: label "${data.label}" != directory "${dirName}"`
        );
      }
    } catch (e) {
      errors.push(
        `Invalid JSON in ${path.relative(process.cwd(), file)}: ${e.message}`
      );
    }
  }
  return errors;
}

// --- Main ---

if (!fs.existsSync(videoDir)) {
  console.error("videos/ directory not found. Run generatemdx.js first.");
  process.exit(1);
}

const mdxFiles = getAllFiles(videoDir, ".mdx");
if (mdxFiles.length === 0) {
  console.error("No MDX files found in videos/. Run generatemdx.js first.");
  process.exit(1);
}

const errors = [];
let linkCount = 0;

// 1. Validate all internal links
for (const file of mdxFiles) {
  const content = fs.readFileSync(file, "utf8");
  const links = extractLinks(content);

  for (const link of links) {
    linkCount++;
    if (!resolveLink(file, link)) {
      const rel = path.relative(process.cwd(), file);
      errors.push(`Broken link in ${rel} → ${link} (file not found)`);
    }
  }
}

// 2. Check filename collisions
errors.push(...checkCollisions(videoDir));

// 3. Validate _category_.json files
errors.push(...checkCategoryJson(videoDir));

// 4. Check cache filename byte lengths
errors.push(...checkCacheLength(mdxFiles));

// --- Output ---
if (errors.length === 0) {
  console.log(`✓ ${linkCount} links checked, all valid`);
  console.log(`✓ ${mdxFiles.length} MDX files checked, no issues found`);
  process.exit(0);
} else {
  for (const err of errors) {
    console.error(`✗ ${err}`);
  }
  console.error(`\nFound ${errors.length} error(s)`);
  process.exit(1);
}
