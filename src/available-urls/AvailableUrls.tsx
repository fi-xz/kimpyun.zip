import styles from "./AvailableUrls.module.css";

import kpj from "../assets/KPJ.png";
import chzzk from "../assets/CHZZK.png";
import kpjFull from "../assets/KPJFull.jpg";
import kpjRage from "../assets/KPJRage.jpg";
import xIcon from "../assets/X.svg";
import discordIcon from "../assets/Discord.svg";
import naverCafeIcon from "../assets/NaverCafe.webp";

interface UrlItem {
  icon: string | null;
  iconType: "round" | "square" | "svg" | "letter";
  letterBg?: string;
  letter?: string;
  label: string;
  shortUrl: string;
  href: string;
}

const urls: UrlItem[] = [
  {
    icon: kpj,
    iconType: "round",
    label: "본 채널",
    shortUrl: "/youtube",
    href: "https://kimpyun.zip/youtube",
  },
  {
    icon: kpjFull,
    iconType: "round",
    label: "풀영상 채널",
    shortUrl: "/full",
    href: "https://kimpyun.zip/full",
  },
  {
    icon: kpjRage,
    iconType: "round",
    label: "빡겜 김편집 채널",
    shortUrl: "/rage",
    href: "https://kimpyun.zip/rage",
  },
  {
    icon: chzzk,
    iconType: "square",
    label: "치지직",
    shortUrl: "/chzzk",
    href: "https://kimpyun.zip/chzzk",
  },
  {
    icon: chzzk,
    iconType: "square",
    label: "치지직 (채팅)",
    shortUrl: "/chzzk/chat",
    href: "https://kimpyun.zip/chzzk/chat",
  },
  {
    icon: chzzk,
    iconType: "square",
    label: "치지직 (HLS .m3u8)",
    shortUrl: "/chzzk.m3u8",
    href: "https://kimpyun.zip/chzzk.m3u8",
  },
  {
    icon: chzzk,
    iconType: "square",
    label: "치지직 (라디오 .m3u8)",
    shortUrl: "/chzzk-radio.m3u8",
    href: "https://kimpyun.zip/chzzk-radio.m3u8",
  },
  {
    icon: naverCafeIcon,
    iconType: "square",
    label: "편찻집 (네이버 팬카페)",
    shortUrl: "/cafe",
    href: "https://kimpyun.zip/cafe",
  },
  {
    icon: xIcon,
    iconType: "svg",
    label: "X (구 트위터)",
    shortUrl: "/twitter",
    href: "https://kimpyun.zip/twitter",
  },
  {
    icon: discordIcon,
    iconType: "svg",
    label: "김편집 디스코드",
    shortUrl: "/discord",
    href: "https://kimpyun.zip/discord",
  },
];

export default function AvailableUrls() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>사용 가능한 URL 목록</h1>
      <p className={styles.subtitle}>단축 URL</p>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>플랫폼</span>
          <span>단축 URL</span>
        </div>

        {urls.map((item, i) => (
          <a
            key={item.label}
            href={item.href}
            className={`${styles.row} ${i === urls.length - 1 ? styles.rowLast : ""}`}
          >
            <span className={styles.platform}>
              {item.iconType === "round" && (
                <img src={item.icon!} className={styles.iconRound} alt="" />
              )}
              {item.iconType === "square" && (
                <img src={item.icon!} className={styles.iconSquare} alt="" />
              )}
              {item.iconType === "svg" && (
                <img src={item.icon!} className={styles.iconSvg} alt="" />
              )}
              {item.iconType === "letter" && (
                <span
                  className={styles.iconLetter}
                  style={{ background: item.letterBg }}
                >
                  {item.letter}
                </span>
              )}
              {item.label}
            </span>
            <span className={styles.url}>{item.shortUrl}</span>
          </a>
        ))}
      </div>

      <footer className={styles.footer}>
        <p>
          이 웹사이트는 인터넷 방송인 "김편집"이 소유하고 있지 않으며,
          비공식적인 도메인입니다.
        </p>
        <p>
          방송인 본인이 원하지 않는 경우 웹사이트는 언제든지 사라질 수 있음을
          미리 고지합니다.
        </p>
        <p>
          웹사이트를 사용하면서 발생하는 모든 문제에 대해 인터넷 방송인
          "김편집"은 책임 질 수 없습니다.
        </p>
        <p>"치지직"은 주식회사 네이버의 등록된 상표입니다.</p>
        <p>
          웹사이트와 관련된 문의는{" "}
          <a href="mailto:admin@kimpyun.zip">admin@kimpyun.zip</a> 를
          이용해주십시오.
        </p>
        <p>일반적으로, 민원 처리 이후 회신을 드리고 있지 않습니다.</p>
      </footer>
    </div>
  );
}
