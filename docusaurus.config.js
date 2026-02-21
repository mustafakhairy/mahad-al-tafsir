// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion
require("dotenv").config();
const { themes } = require("prism-react-renderer");
const lightCodeTheme = themes.github;
const darkCodeTheme = themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "معهد التفسير",
  tagline: "التسجيلات الصوتية للشيخ علي هاني العقرباوي",
  url: "https://tafsir.institute",
  baseUrl: "/",
  onBrokenLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName: "ismaelrumzan", // Usually your GitHub org/user name.
  projectName: "mahad-al-tafsir", // Usually your repo name.
  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: "videos",
          routeBasePath: "videos",
          sidebarPath: "./sidebars.js",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
        gtag: {
          trackingID: "G-CRLE7L55TR",
          anonymizeIP: true,
        },
      }),
    ],
  ],
  i18n: {
    defaultLocale: "ar",
    locales: ["ar"],
  },
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },
  customFields: {
    // Put your custom environment here
    algoliaAppId: process.env.ALGOLIA_APP_ID,
    algoliaApiKey: process.env.ALGOLIA_API_KEY,
    algoliaIndex: process.env.ALGOLIA_INDEX,
    YTKey: process.env.YOUTUBE_API_KEY,
  },

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 2,
      },
      navbar: {
        logo: {
          alt: "logo",
          src: "img/logo-white.png",
          srcDark: "img/logo-black.png",
        },
        items: [
          {
            type: "doc",
            docId: "تدريس اللغة العربية",
            position: "left",
            label: "التسجيلات الصوتية",
          },
        ],
      },
      footer: {
        style: "dark",
        copyright: `حقوق النشر © ${new Date().getFullYear()} معهد تفسير`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
