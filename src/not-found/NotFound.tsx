import { useEffect, useRef } from "react";
import styles from "./NotFound.module.css";
import daenggang from "../assets/d.mp4";
import poster from "../assets/d.webp";

export default function NotFound() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const replay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    void v.play();
  };

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!reduce) void videoRef.current?.play();
  }, []);

  return (
    <main className={styles.container}>
      <button
        type="button"
        className={styles.replay}
        onClick={replay}
        aria-label="영상 다시 재생"
      >
        <video
          ref={videoRef}
          className={styles.video}
          src={daenggang}
          poster={poster}
          width={600}
          height={458}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      </button>

      <h1 className={styles.code}>404 Not Found</h1>
      <p className={styles.message}>KPJ daenggang found</p>

      <a href="/" className={styles.home}>
        홈으로 돌아가기
      </a>
    </main>
  );
}
