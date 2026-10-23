import type React from "react";
import styles from "./App.module.css";
import SiteFooter from "./components/SiteFooter";
import type { ShortUrl } from "./data/shortlinks";

import kpj from "./assets/KPJ-256.webp";
import chzzk from "./assets/CHZZK-96.webp";
import kpjFull from "./assets/KPJFull-96.webp";
import kpjRage from "./assets/KPJRage-96.webp";
import kpjBasement1 from "./assets/KPJBasement1-96.webp";
import XIcon from "./assets/X.svg?react";
import UrlIcon from "./assets/URL.svg?react";

type IconComponent = React.FC<React.SVGProps<SVGSVGElement>>;

interface Link {
  /** 사진·로고는 URL, 단색 아이콘은 SVG 컴포넌트 */
  icon: string | IconComponent;
  label: string;
  /**
   * 외부 주소가 아니라 자기 단축 URL 로 보냅니다. 채널 주소가 바뀌면
   * shortlinks.ts 한 곳만 고치면 되고, 없는 경로를 쓰면 타입 검사가 잡습니다.
   */
  href: ShortUrl;
  iconClass: "iconRound" | "iconSquare" | "iconSvg";
}

const links: Link[] = [
  {
    icon: kpj,
    label: "유튜브 본 채널",
    href: "https://kimpyun.zip/youtube",
    iconClass: "iconRound",
  },
  {
    icon: chzzk,
    label: "치지직",
    href: "https://kimpyun.zip/chzzk",
    iconClass: "iconSquare",
  },
  {
    icon: kpjFull,
    label: "풀영상 채널",
    href: "https://kimpyun.zip/full",
    iconClass: "iconRound",
  },
  {
    icon: kpjRage,
    label: "빡겜 김편집 채널",
    href: "https://kimpyun.zip/rage",
    iconClass: "iconRound",
  },
  {
    icon: kpjBasement1,
    label: "김편집 지하1층 채널",
    href: "https://kimpyun.zip/basement1",
    iconClass: "iconRound",
  },
  {
    icon: XIcon,
    label: "X (구 Twitter)",
    href: "https://kimpyun.zip/x",
    iconClass: "iconSvg",
  },
];

export default function App() {
  return (
    <div className={styles.container}>
      <img
        src={kpj}
        width={256}
        height={256}
        decoding="async"
        className={styles.profile}
        alt=""
      />
      <h1 className={styles.name}>김편집</h1>
      <div className={styles.head}>
        <div className={styles.divider} />

        <div className={styles.linksRow}>
          {links.map(({ icon: Icon, label, href, iconClass }) => (
            <a key={label} href={href} className={styles.link}>
              {typeof Icon === "string" ? (
                <img
                  src={Icon}
                  width={96}
                  height={96}
                  decoding="async"
                  className={styles[iconClass]}
                  alt=""
                />
              ) : (
                <Icon
                  className={styles[iconClass]}
                  aria-hidden="true"
                  focusable="false"
                />
              )}
              <span>{label}</span>
            </a>
          ))}
        </div>
      </div>

      <a href="/available-urls/" className={styles.subLink}>
        <UrlIcon
          className={styles.iconSvg}
          aria-hidden="true"
          focusable="false"
        />
        <span>사용 가능한 URL 목록</span>
      </a>

      <SiteFooter />
    </div>
  );
}
