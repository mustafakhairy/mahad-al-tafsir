require("dotenv").config();
const fs = require("fs");
const path = require("path");
const algoliasearch = require("algoliasearch");

const { ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY, ALGOLIA_INDEX } = process.env;

if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_API_KEY || !ALGOLIA_INDEX) {
  console.error(
    "Missing env: ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY, ALGOLIA_INDEX must be set in .env"
  );
  process.exit(1);
}

const searchJsonPath = path.join(__dirname, "..", "content", "search.json");
const MAX_RECORD_BYTES = 9500;

function fit(record) {
  let desc = record.description || "";
  while (Buffer.byteLength(JSON.stringify(record), "utf8") > MAX_RECORD_BYTES && desc.length > 0) {
    desc = desc.slice(0, Math.max(0, desc.length - 200));
    record.description = desc;
  }
  return record;
}

const records = JSON.parse(fs.readFileSync(searchJsonPath, "utf8")).map((r) =>
  fit({ ...r, objectID: r.id })
);

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_API_KEY);
const index = client.initIndex(ALGOLIA_INDEX);

(async () => {
  console.log(`Uploading ${records.length} records to index "${ALGOLIA_INDEX}"...`);
  await index.setSettings({
    searchableAttributes: ["title", "categories", "description"],
    attributesForFaceting: ["categories"],
  });
  await index.replaceAllObjects(records, { safe: true });
  console.log("Done.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
