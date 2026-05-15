const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");

const contentDirectory = path.join(process.cwd(), "content");
const lessonsDirectory = path.join(process.cwd(), "content/lessons");
const videoDir = path.join(process.cwd(), "videos");

// Strip characters that are invalid in file paths / Docusaurus slugs
function sanitizeNav(str) {
  return str
    .replace(/[*\\/:?"<>|#()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateToBytes(str, maxBytes) {
  const buf = Buffer.from(str, "utf8");
  if (buf.length <= maxBytes) return str;
  let truncated = buf.slice(0, maxBytes).toString("utf8");
  if (truncated.endsWith("\uFFFD")) {
    truncated = truncated.slice(0, -1);
  }
  return truncated.trim();
}

// Docusaurus cache files flatten the full doc path into one filename:
//   site-videos-{cat}-{section}-{playlist}-mdx-{hash}.json
// Linux has a 255-byte filename limit. Only truncate the playlist name
// (the longest segment) when the total would exceed the limit.
const MAX_CACHE_CONTENT_BYTES = 220;
function fitPlaylistNav(categoryNav, sectionNav, playlistNav) {
  const prefixBytes = Buffer.from(categoryNav + " " + sectionNav + " ", "utf8").length;
  const playlistBytes = Buffer.from(playlistNav, "utf8").length;
  if (prefixBytes + playlistBytes <= MAX_CACHE_CONTENT_BYTES) return playlistNav;
  return truncateToBytes(playlistNav, MAX_CACHE_CONTENT_BYTES - prefixBytes);
}

function getResolvedStructure() {
  const fullPath = path.join(contentDirectory, "resolved-structure.json");
  const fileContents = fs.readFileSync(fullPath, "utf8");
  return JSON.parse(fileContents);
}

function getLesson(fileId) {
  const fullPath = path.join(lessonsDirectory, fileId + ".json");
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const data = JSON.parse(fileContents);
  data.items.sort((a, b) => {
    const orderNoArrayA = a.snippet.title.split(" ")[0].split(".");
    const orderNoArrayB = b.snippet.title.split(" ")[0].split(".");
    const orderNoA = Number(orderNoArrayA[orderNoArrayA.length - 1]);
    const orderNoB = Number(orderNoArrayB[orderNoArrayB.length - 1]);
    if (orderNoA < orderNoB) {
      return -1;
    } else {
      return 1;
    }
  });
  return data;
}

async function createMDX() {
  const structure = getResolvedStructure();
  const searchJson = [];
  const videoCount = [];
  const videoIndex = {};

  // Build intro page data
  let introData = "";

  // Process each category
  for (const category of structure.content) {
    let categoryVideoCount = 0;
    const categoryNav = category.nav;
    const categoryDir = path.join(videoDir, categoryNav);

    // Write category _category_.json
    fse.outputFileSync(
      path.join(categoryDir, "_category_.json"),
      JSON.stringify(
        { label: categoryNav, position: Number(category.id) },
        null,
        4
      ),
      "utf8"
    );

    // Build category index.mdx content
    let categoryIndexContent = "# " + category.title + "\n";

    introData += `## [${category.title}](<${categoryNav}/>) \n`;

    for (let sIdx = 0; sIdx < category.sections.length; sIdx++) {
      const section = category.sections[sIdx];
      const sectionNav = sanitizeNav(section.nav);
      const sectionDir = path.join(categoryDir, sectionNav);

      // Write section _category_.json
      fse.outputFileSync(
        path.join(sectionDir, "_category_.json"),
        JSON.stringify({ label: sectionNav, position: sIdx + 1 }, null, 4),
        "utf8"
      );

      // Add section to category index
      if (section.playlists.length > 0) {
        const firstPlaylistNav = fitPlaylistNav(categoryNav, sectionNav, sanitizeNav(section.playlists[0].nav));
        categoryIndexContent +=
          `## [${section.title}](<${sectionNav}/${firstPlaylistNav}>)\n`;
      } else {
        categoryIndexContent += `## ${section.title}\n`;
      }

      introData += `### ${section.title} \n`;

      // Generate playlist MDX files
      for (let pIdx = 0; pIdx < section.playlists.length; pIdx++) {
        const playlist = section.playlists[pIdx];
        const playlistNav = fitPlaylistNav(categoryNav, sectionNav, sanitizeNav(playlist.nav));
        const lesson = getLesson(playlist.id);
        categoryVideoCount += lesson.items.length;

        introData +=
          `- [${playlist.title}](<${categoryNav}/${sectionNav}/${playlistNav}>) \n`;

        // Determine relative import depth (videos/{cat}/{section}/{playlist}.mdx -> 3 levels up)
        const importPrefix = "../../../";

        let mdxContent = "---\n";
        mdxContent += `sidebar_position: ${pIdx + 1}\n`;
        mdxContent += "---\n";
        mdxContent += `import VideoList from '${importPrefix}src/components/Video';\n`;
        mdxContent += `import videoData from '${importPrefix}content/lessons/${playlist.id}.json';\n`;
        mdxContent += "\n";
        mdxContent += "<VideoList data={videoData}/>\n";

        fse.outputFileSync(
          path.join(sectionDir, playlistNav + ".mdx"),
          mdxContent,
          "utf8"
        );

        // Build search records
        const mdxPath = `videos/${categoryNav}/${sectionNav}/${playlistNav}`;
        const cats = [categoryNav, sectionNav];

        const searchRec = {
          id: playlist.id,
          title: playlist.title,
          description: "",
          path: "https://tafsir.institute/" + mdxPath,
          categories: cats,
          section: "true",
        };

        // Add individual video search records
        lesson.items.forEach((lessonItem, itemIndex) => {
          const itemTitle = lessonItem.snippet.title
            .replace(/[0-9]/g, "")
            .replace(/\./g, "")
            .replace(/\_/g, "");
          if (itemTitle !== "Private video") {
            searchRec.description += itemTitle + " ";

            const itemUrl =
              itemIndex !== 0 ? "/" + mdxPath + "#" + itemIndex : "/" + mdxPath;

            const searchRecItem = {
              id: playlist.id + "_" + itemIndex,
              title: itemTitle.trim(),
              description: "",
              path: "https://tafsir.institute" + itemUrl,
              section: false,
              categories: cats,
            };
            if (
              lessonItem.snippet.thumbnails &&
              "medium" in lessonItem.snippet.thumbnails
            ) {
              searchRecItem.image = lessonItem.snippet.thumbnails.medium.url;
            }
            searchJson.push(searchRecItem);

            const videoId =
              lessonItem.snippet.resourceId &&
              lessonItem.snippet.resourceId.videoId;
            if (videoId) {
              videoIndex[videoId] = {
                url: itemUrl,
                videoTitle: lessonItem.snippet.title,
                playlistTitle: playlist.title,
                sectionTitle: section.title,
                categoryTitle: category.title,
              };
            }
          }
        });

        if (
          lesson.items.length > 0 &&
          lesson.items[0].snippet.thumbnails &&
          "medium" in lesson.items[0].snippet.thumbnails
        ) {
          searchRec.image = lesson.items[0].snippet.thumbnails.medium.url;
        }
        searchJson.push(searchRec);
      }
    }

    // Write category index.mdx
    fse.outputFileSync(
      path.join(categoryDir, "index.mdx"),
      categoryIndexContent,
      "utf8"
    );

    videoCount.push(categoryVideoCount);
  }

  // Write top-level intro page
  let topLevelContent = "---\nsidebar_position: 1\n---\n";
  topLevelContent += introData;
  fse.outputFileSync(
    path.join(videoDir, "تدريس اللغة العربية.mdx"),
    topLevelContent,
    "utf8"
  );

  // Write videocount.json
  fse.outputFileSync(
    path.join(contentDirectory, "videocount.json"),
    JSON.stringify({ count: videoCount }, null, 4),
    "utf8"
  );

  // Write search.json
  fse.outputFileSync(
    path.join(contentDirectory, "search.json"),
    JSON.stringify(searchJson, null, 4),
    "utf8"
  );

  // Write videoindex.json — maps stable YouTube videoId to current site URL/title.
  // Used by the homepage "Continue watching" card to self-heal localStorage
  // entries when playlists are renamed or reordered across sync cycles.
  fse.outputFileSync(
    path.join(contentDirectory, "videoindex.json"),
    JSON.stringify(videoIndex, null, 4),
    "utf8"
  );

  console.log(
    "Generated MDX files, search.json, videocount.json, and videoindex.json"
  );
}

fse.emptyDirSync(videoDir);
createMDX();
