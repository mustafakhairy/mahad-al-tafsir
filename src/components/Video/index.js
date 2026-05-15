import React, { useState, useEffect } from "react";
import { useLocation, useHistory } from "@docusaurus/router";
import Select from "react-select";
import Player from "./ytplayer";
import styles from "./styles.module.css";

const RECENTLY_WATCHED_KEY = "tafsir:recentlyWatched";
const RECENTLY_WATCHED_MAX = 5;

function saveRecentlyWatched(item, idx) {
  if (typeof window === "undefined") return;
  const videoId =
    item && item.snippet && item.snippet.resourceId && item.snippet.resourceId.videoId;
  if (!videoId) return;

  const entry = {
    videoId,
    videoTitle: item.snippet.title,
    url:
      window.location.pathname + (idx > 0 ? "#" + idx : ""),
    savedAt: Date.now(),
  };

  try {
    const raw = window.localStorage.getItem(RECENTLY_WATCHED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(list)
      ? list.filter((e) => e && e.videoId !== videoId)
      : [];
    filtered.unshift(entry);
    window.localStorage.setItem(
      RECENTLY_WATCHED_KEY,
      JSON.stringify(filtered.slice(0, RECENTLY_WATCHED_MAX))
    );
  } catch (e) {
    // localStorage unavailable (Safari private mode, quota, etc.) — silently skip
  }
}

export default function VideoList({ children, data = {} }) {
  const location = useLocation();
  const history = useHistory();
  const [itemIndex, setItemIndex] = useState(0);
  const [vidItem, setvidItem] = useState({});
  const vidOptions = [];

  // Sync the selected video with the URL hash whenever it changes. Using
  // Docusaurus's reactive location avoids a race where window.location.hash
  // isn't yet populated when the component first mounts via client-side nav.
  useEffect(() => {
    if (!location.hash) return;
    const idx = Number(location.hash.replace("#", ""));
    if (
      Number.isInteger(idx) &&
      idx >= 0 &&
      data.items &&
      idx < data.items.length
    ) {
      setItemIndex(idx);
    }
  }, [location.hash]);

  function handlePlay() {
    const idx = Number(itemIndex) || 0;
    const item = data.items && data.items[idx];
    if (item) saveRecentlyWatched(item, idx);
  }

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

  data.items.map((item, index) => {
    vidOptions.push({ value: index, label: item.snippet.title });
  });

  function changeItem(i) {
    setvidItem(i);
    setItemIndex(i.value);
    history.push({ hash: `#${i.value}` });
  }

  function changeItemNav(i, direction) {
    let num = 0;
    direction === "forward"
      ? (num = data.items.indexOf(i) + 1)
      : (num = data.items.indexOf(i) - 1);

    if (num >= 0 && num !== null && num !== undefined) {
      setvidItem(num);
      setItemIndex(num);
      history.push({ hash: `#${num}` });
    }
  }

  return (
    <main>
      <div className={styles.navContainer}>
        <div className={styles.selectContainer}>
          <Select
            className={styles.selectClass}
            options={vidOptions}
            onChange={changeItem}
            value={vidOptions[Number(itemIndex) || 0]}
          />
        </div>
      </div>
      <div className={styles.vidContainer}>
        {children}
        <Player
          id={data.items[itemIndex].snippet.resourceId.videoId}
          title={data.items[itemIndex].snippet.title}
          onPlay={handlePlay}
        />
      </div>
    </main>
  );
}
