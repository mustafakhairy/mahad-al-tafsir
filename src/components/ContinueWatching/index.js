import React, { useState, useEffect } from "react";
import Link from "@docusaurus/Link";
import videoIndex from "../../../content/videoindex.json";
import styles from "./styles.module.css";

const RECENTLY_WATCHED_KEY = "tafsir:recentlyWatched";

export default function ContinueWatching() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENTLY_WATCHED_KEY);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;

      // Resolve each stored videoId against the fresh build-time index so
      // entries self-heal across sync cycles (playlist renames, index drift).
      // Entries whose video no longer exists on the site are dropped silently.
      const resolved = list
        .map((e) => {
          if (!e || !e.videoId) return null;
          const fresh = videoIndex[e.videoId];
          if (!fresh) return null;
          return {
            videoId: e.videoId,
            url: fresh.url,
            videoTitle: fresh.videoTitle,
            playlistTitle: fresh.playlistTitle,
            sectionTitle: fresh.sectionTitle,
          };
        })
        .filter(Boolean);

      setEntries(resolved);
    } catch (e) {
      // localStorage unavailable or corrupt — show nothing
    }
  }, []);

  if (entries.length === 0) return null;

  return (
    <section className={styles.continueSection}>
      <div className="container">
        <h2 className={styles.title}>تابع من حيث توقفت</h2>
        <ul className={styles.list}>
          {entries.map((e) => (
            <li key={e.videoId} className={styles.item}>
              <Link to={e.url} className={styles.link}>
                <div className={styles.videoTitle}>{e.videoTitle}</div>
                <div className={styles.playlistTitle}>{e.playlistTitle}</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
