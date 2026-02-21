require("dotenv").config();

const fse = require("fs-extra");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const youtube = google.youtube({ version: "v3", auth: YOUTUBE_API_KEY });
const contentDirectory = path.join(process.cwd(), "content");
const lessonsDirectory = path.join(process.cwd(), "content/lessons");

const mappingData = fs.readFileSync(
  path.join(contentDirectory, "mapping.json"),
  "utf8"
);
const mapping = JSON.parse(mappingData);

// Strip characters that are invalid in file paths / Docusaurus slugs
const sanitizeNav = (str) => {
  return str
    .replace(/[*\\/:?"<>|#()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const sleep = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const getPlaylistItems = async (playlistId) => {
  let nextPageToken = "";
  let result = [];
  const maxPages = 4;
  for (let i = 1; i <= maxPages; i++) {
    const res = await youtube.playlistItems.list({
      part: ["snippet", "contentDetails"],
      maxResults: 50,
      playlistId: playlistId,
      pageToken: nextPageToken,
    });
    result.push(...res.data.items);
    if (
      res.data.pageInfo.totalResults <
      res.data.pageInfo.resultsPerPage * i
    ) {
      break;
    } else {
      nextPageToken = res.data.nextPageToken;
    }
  }
  return result;
};

const fetchChannelSections = async (channelId) => {
  console.log("Fetching channel sections for:", channelId);
  const res = await youtube.channelSections.list({
    channelId: channelId,
    part: ["snippet", "contentDetails"],
  });
  return res.data.items;
};

const fetchPlaylistMetadata = async (playlistIds) => {
  const results = [];
  // YouTube API allows up to 50 IDs per request
  for (let i = 0; i < playlistIds.length; i += 50) {
    const batch = playlistIds.slice(i, i + 50);
    const res = await youtube.playlists.list({
      id: batch,
      part: ["snippet"],
      maxResults: 50,
    });
    results.push(...res.data.items);
    if (i + 50 < playlistIds.length) {
      await sleep(10000);
    }
  }
  return results;
};

const main = async () => {
  // Clear lessons directory
  fse.emptyDirSync(lessonsDirectory);

  // 1. Fetch all channel sections
  const allSections = await fetchChannelSections(mapping.channelId);
  console.log(`Found ${allSections.length} channel sections`);
  await sleep(10000);

  // Build a map of section ID -> section data
  const sectionMap = {};
  for (const section of allSections) {
    sectionMap[section.id] = section;
  }

  // 2. For each category, resolve its sections and playlists
  const resolvedStructure = {
    content: [],
  };

  for (const category of mapping.categories) {
    console.log(`\nProcessing category: ${category.title}`);
    const resolvedCategory = {
      id: category.id,
      title: category.title,
      nav: category.nav,
      image: category.image,
      sections: [],
    };

    for (let sIdx = 0; sIdx < category.sectionIds.length; sIdx++) {
      const sectionId = category.sectionIds[sIdx];
      const section = sectionMap[sectionId];

      if (!section) {
        console.warn(`  Section not found: ${sectionId}`);
        continue;
      }

      const sectionTitle =
        section.snippet && section.snippet.title
          ? section.snippet.title
          : `Section ${sIdx + 1}`;

      console.log(`  Section: ${sectionTitle}`);

      const playlistIds =
        section.contentDetails && section.contentDetails.playlists
          ? section.contentDetails.playlists
          : [];

      if (playlistIds.length === 0) {
        console.warn(`  No playlists in section: ${sectionTitle}`);
        continue;
      }

      // Fetch playlist metadata
      console.log(`  Fetching metadata for ${playlistIds.length} playlists...`);
      const playlistMetas = await fetchPlaylistMetadata(playlistIds);
      await sleep(10000);

      // Build ordered playlist metadata map
      const playlistMetaMap = {};
      for (const pm of playlistMetas) {
        playlistMetaMap[pm.id] = pm;
      }

      const resolvedSection = {
        title: sectionTitle,
        nav: sanitizeNav(sectionTitle),
        playlists: [],
      };

      // Fetch videos for each playlist
      for (let pIdx = 0; pIdx < playlistIds.length; pIdx++) {
        const playlistId = playlistIds[pIdx];
        const meta = playlistMetaMap[playlistId];
        const playlistTitle = meta
          ? meta.snippet.title
          : `Playlist ${pIdx + 1}`;
        const playlistNav = sanitizeNav(playlistTitle);

        console.log(`    Playlist: ${playlistTitle}`);

        const items = await getPlaylistItems(playlistId);
        console.log(`    Fetched ${items.length} videos`);

        // Build lesson file ID: {categoryId}_{sectionIdx}_{playlistIdx}
        const fileId = `${category.id}_${sIdx}_${pIdx}`;

        // Write lesson JSON file (same format as before)
        const lessonData = {
          items: items,
          title: playlistTitle,
          nav: playlistNav,
          id: fileId,
        };

        fs.writeFileSync(
          path.join(lessonsDirectory, fileId + ".json"),
          JSON.stringify(lessonData, null, 4),
          "utf8"
        );

        resolvedSection.playlists.push({
          id: fileId,
          playlistId: playlistId,
          title: playlistTitle,
          nav: playlistNav,
          videoCount: items.length,
        });

        await sleep(10000);
      }

      resolvedCategory.sections.push(resolvedSection);
    }

    resolvedStructure.content.push(resolvedCategory);
  }

  // 3. Write resolved-structure.json
  fs.writeFileSync(
    path.join(contentDirectory, "resolved-structure.json"),
    JSON.stringify(resolvedStructure, null, 4),
    "utf8"
  );

  console.log("\nDone! Written resolved-structure.json and lesson files.");
};

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
