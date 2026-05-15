import React from "react";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";

export const Player = (props) => {
  const { id, title, onPlay } = props;
  return (
    <div>
      <LiteYouTubeEmbed
        id={id}
        title={title}
        poster="hqdefault"
        params="modestbranding=1&rel=0&enablejsapi=1&playsinline=1&cc_load_policy=0"
        onIframeAdded={onPlay}
      />
    </div>
  );
};

export default Player;
