import React, { useState, useEffect } from "react";
import Link from "@docusaurus/Link";
import videoIndex from "../../../content/videoindex.json";
import styles from "./styles.module.css";

const RECENTLY_WATCHED_KEY = "tafsir:recentlyWatched";

function readStoredList() {
  try {
    const raw = window.localStorage.getItem(RECENTLY_WATCHED_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function writeStoredList(list) {
  try {
    if (list.length === 0) {
      window.localStorage.removeItem(RECENTLY_WATCHED_KEY);
    } else {
      window.localStorage.setItem(RECENTLY_WATCHED_KEY, JSON.stringify(list));
    }
  } catch (e) {
    // ignore
  }
}

function resolveEntries(list) {
  // Resolve each stored videoId against the fresh build-time index so
  // entries self-heal across sync cycles (playlist renames, index drift).
  // Entries whose video no longer exists on the site are dropped silently.
  return list
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
}

export default function ContinueWatching() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    setEntries(resolveEntries(readStoredList()));
  }, []);

  function removeOne(videoId) {
    const next = readStoredList().filter((e) => e && e.videoId !== videoId);
    writeStoredList(next);
    setEntries(resolveEntries(next));
  }

  function clearAll() {
    if (!window.confirm("هل تريد مسح كل سجل المشاهدة؟")) return;
    writeStoredList([]);
    setEntries([]);
  }

  if (entries.length === 0) return null;

  return (
    <section className={styles.continueSection}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.title}>تابع من حيث توقفت</h2>
          <button
            type="button"
            onClick={clearAll}
            className={styles.clearAll}
            aria-label="مسح كل سجل المشاهدة"
          >
            مسح الكل
          </button>
        </div>
        <ul className={styles.list}>
          {entries.map((e) => (
            <li key={e.videoId} className={styles.item}>
              <Link to={e.url} className={styles.link}>
                <div className={styles.videoTitle}>{e.videoTitle}</div>
                <div className={styles.playlistTitle}>{e.playlistTitle}</div>
              </Link>
              <button
                type="button"
                onClick={() => removeOne(e.videoId)}
                className={styles.removeBtn}
                aria-label="إزالة من السجل"
                title="إزالة من السجل"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
