import React from "react";
import styles from "./styles.module.css";
import { useColorMode } from '@docusaurus/theme-common';
import useBaseUrl from "@docusaurus/useBaseUrl";
import structureJson from "../../../content/resolved-structure.json";
import videocount from "../../../content/videocount.json";
import VideoIcon from "@site/static/svg/tv-solid.svg";
import YoutubeIcon from "@site/static/svg/youtube-brands.svg";
import Link from "@docusaurus/Link";

function sanitizeNav(str) {
  return str
    .replace(/[*\\/:?"<>|#()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function Feature({ image, title, nav, sections, index }) {
  const {colorMode} = useColorMode();

  // Flatten sections into a list of playlists for display
  const allPlaylists = [];
  for (const section of sections) {
    for (const playlist of section.playlists) {
      allPlaylists.push({
        ...playlist,
        nav: sanitizeNav(playlist.nav),
        sectionNav: sanitizeNav(section.nav),
      });
    }
  }

  const firstPlaylist = allPlaylists.length > 0 ? allPlaylists[0] : null;
  const iconFill = colorMode === 'dark' ? '#4dbf4d' : '#853934';

  return (
    <div className={styles.card}>
      <div className={styles.cardImage}>
        <img src={useBaseUrl("/img/sections/" + image)} alt={title} />
      </div>
      <div className={styles.cardBody}>
        <Link
          to={
            firstPlaylist
              ? `/videos/${nav}/${firstPlaylist.sectionNav}/${firstPlaylist.nav}`
              : `/videos/${nav}`
          }
        >
          <h3 className={styles.cardTitle}>{title}</h3>
        </Link>
        <ul className={styles.playlistList}>
          {allPlaylists.map((item, idx) => (
            <li key={idx}>
              <YoutubeIcon
                title="Youtube video"
                className="videoIconClass"
                width="14px"
                fill={iconFill}
              />
              <Link to={`/videos/${nav}/${item.sectionNav}/${item.nav}`}>
                {item.nav}
              </Link>
            </li>
          ))}
        </ul>
        <div className={styles.cardFooter}>
          <VideoIcon
            title="video count"
            className="videoIconClass"
            width="12px"
            fill={iconFill}
          /> {videocount.count[index]} تسجيلات
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        {structureJson.content.map((props, idx) => (
          <Feature key={idx} {...props} index={idx} />
        ))}
      </div>
    </section>
  );
}
