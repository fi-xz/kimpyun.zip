import React from "react";
import styles from "./App.module.css";

import kpj from "./assets/KPJ.png";
import chzzk from "./assets/CHZZK.png";
import kpjFull from "./assets/KPJFull.jpg";
import kpjRage from "./assets/KPJRage.jpg";
import kpjEdit from "./assets/KPJEdit.jpg";
import xIcon from "./assets/X.svg";
import urlIcon from "./assets/URL.svg";

interface Link {
  icon: string;
  label: string;
  href: string;
  iconClass: string;
}

const links: Link[] = [
  {
    icon: kpj,
    label: "유튜브 본 채널",
    href: "https://www.youtube.com/channel/UCqIsRcbdqG2AyR4dZWaLAGg",
    iconClass: "iconRound",
  },
  {
    icon: chzzk,
    label: "치지직",
    href: "https://chzzk.naver.com/live/0f171fd568c130cf09f2d3a641c4cbf1",
    iconClass: "iconSquare",
  },
  {
    icon: kpjFull,
    label: "풀영상 채널",
    href: "https://www.youtube.com/channel/UC84_f3MneocxMfDs8sm18CA",
    iconClass: "iconRound",
  },
  {
    icon: kpjRage,
    label: "빡겜 김편집 채널",
    href: "https://www.youtube.com/channel/UCSq0uzRoCGJkYzXNA5IRA8A",
    iconClass: "iconRound",
  },
  {
    icon: kpjEdit,
    label: "김편집편집 채널",
    href: "https://www.youtube.com/channel/UCyRlJv071Hb0ezcb7aZ4XeQ",
    iconClass: "iconRound",
  },
  {
    icon: xIcon,
    label: "X (구 Twitter)",
    href: "https://twitter.com/__ARPA",
    iconClass: "iconSvg",
  },
];

export default function App() {
  return (
    <div className={styles.container}>
      <img src={kpj} className={styles.profile} alt="김편집" />
      <h1 className={styles.name}>김편집</h1>
      <div className={styles.divider} />

      <div className={styles.linksRow}>
        {links.map((link, i) => (
          <React.Fragment key={link.label}>
            <a href={link.href} className={styles.link}>
              <img src={link.icon} className={styles[link.iconClass]} alt="" />
              <span>{link.label}</span>
            </a>
            {i < links.length - 1 && <span className={styles.sep}>|</span>}
          </React.Fragment>
        ))}
      </div>

      <a href="/available-urls/" className={styles.subLink}>
        <img src={urlIcon} className={styles.iconSvg} alt="" />
        <span>사용 가능한 URL 목록</span>
      </a>

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
