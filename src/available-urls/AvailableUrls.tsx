import { useEffect, useRef, useState, type FC, type SVGProps } from "react";
import styles from "./AvailableUrls.module.css";
import SiteFooter from "../components/SiteFooter";
import { SITE, listedBySection, type ListedPath } from "../data/shortlinks";

import kpj from "../assets/KPJ-96.webp";
import chzzk from "../assets/CHZZK-96.webp";
import kpjFull from "../assets/KPJFull-96.webp";
import kpjRage from "../assets/KPJRage-96.webp";
import kpjBasement1 from "../assets/KPJBasement1-96.webp";
import XIcon from "@/assets/X.svg?react";
import discordIcon from "../assets/Discord.svg";
import naverCafeIcon from "../assets/NaverCafe-96.webp";

type IconComponent = FC<SVGProps<SVGSVGElement>>;

interface IconSpec {
  /** 사진·브랜드 로고는 URL, 단색 아이콘은 SVG 컴포넌트 */
  icon: string | IconComponent;
  iconType: "round" | "square" | "svg";
}

/**
 * 경로 → 아이콘. 키가 ListedPath 이므로 목록에 링크를 추가하면
 * 아이콘을 빠뜨릴 수 없습니다(타입 검사 실패).
 *
 * 아이콘은 shortlinks.ts 가 아니라 여기 둡니다 — 그 파일은 Worker 번들에도
 * 들어가므로 이미지를 import 하면 안 됩니다.
 */
const icons: Record<ListedPath, IconSpec> = {
  "/youtube": { icon: kpj, iconType: "round" },
  "/full": { icon: kpjFull, iconType: "round" },
  "/rage": { icon: kpjRage, iconType: "round" },
  "/basement1": { icon: kpjBasement1, iconType: "round" },
  "/chzzk": { icon: chzzk, iconType: "square" },
  "/chzzk/chat": { icon: chzzk, iconType: "square" },
  "/chzzk.m3u8": { icon: chzzk, iconType: "square" },
  "/chzzk-radio.m3u8": { icon: chzzk, iconType: "square" },
  "/cafe": { icon: naverCafeIcon, iconType: "square" },
  "/x": { icon: XIcon, iconType: "svg" },
  "/discord": { icon: discordIcon, iconType: "svg" },
};

const shapeClass = {
  round: styles.iconRound,
  square: styles.iconSquare,
  svg: styles.iconSvg,
} as const;

function Platform({ path, label }: { path: ListedPath; label: string }) {
  const { icon: Icon, iconType } = icons[path];
  return (
    <span className={styles.platform}>
      {typeof Icon === "string" ? (
        <img
          src={Icon}
          width={96}
          height={96}
          decoding="async"
          className={shapeClass[iconType]}
          alt=""
        />
      ) : (
        <Icon
          className={shapeClass[iconType]}
          aria-hidden="true"
          focusable="false"
        />
      )}
      {label}
    </span>
  );
}

type CopyState = "idle" | "done" | "fail";

const COPY_LABEL: Record<CopyState, string> = {
  idle: "복사",
  done: "복사됨",
  fail: "복사 실패",
};

/**
 * 복사 성공을 alert 이 아니라 인터페이스 안에서 알립니다.
 *
 * 보이는 글자는 바뀌지만 접근 가능한 이름(aria-label)은 고정입니다.
 * 이름이 바뀌면 스크린리더가 컨트롤이 바뀐 것으로 읽습니다.
 * 결과는 옆의 <output> 이 대신 알립니다.
 *
 * 색으로 성공을 표시하지 않습니다 — 액센트는 "상호작용 가능" 한 가지 뜻으로만 씁니다.
 */
function CopyButton({ url, path }: { url: string; path: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState("done");
    } catch {
      // clipboard 는 보안 컨텍스트(https)에서만 동작합니다.
      // 실패해도 주소는 화면에 그대로 있으니 직접 선택할 수 있습니다.
      setState("fail");
    }
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2000);
  }

  return (
    <span className={styles.copyCell}>
      <button
        type="button"
        className={styles.copy}
        onClick={copy}
        aria-label={`${path} 복사`}
      >
        {COPY_LABEL[state]}
      </button>
      {/* <output> 은 role="status" + aria-live="polite" 를 기본으로 가집니다 */}
      <output className={styles.srOnly}>
        {state === "idle" ? "" : `${path} ${COPY_LABEL[state]}`}
      </output>
    </span>
  );
}

export default function AvailableUrls() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>사용 가능한 URL 목록</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>채널</h2>

        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>플랫폼</span>
            <span>단축 URL</span>
          </div>

          {listedBySection.channel.map(({ path, label }) => (
            <a key={path} href={`${SITE}${path}`} className={styles.row}>
              <Platform path={path} label={label} />
              <span className={styles.url}>{path}</span>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>방송 링크</h2>
        <p className={styles.sectionNote}>
          외부 영상 플레이어에 붙여넣어 쓰는 주소입니다. 리다이렉트가 아닙니다.
        </p>

        {/* 행이 링크가 아닙니다. <a> 의 콘텐츠 모델은 상호작용 요소를 금지하므로
            복사 버튼을 넣으려면 행이 링크이기를 포기해야 합니다.
            404 페이지에서 <video controls> 를 <button> 안에 못 넣는 것과 같은 제약입니다. */}
        <div className={styles.table}>
          <div className={`${styles.tableHeader} ${styles.streamGrid}`}>
            <span>플랫폼</span>
            <span>주소</span>
            <span className={styles.srOnly}>복사</span>
          </div>

          {listedBySection.stream.map(({ path, label }) => (
            <div key={path} className={`${styles.row} ${styles.streamGrid}`}>
              <Platform path={path} label={label} />
              <span className={styles.url}>{path}</span>
              <CopyButton url={`${SITE}${path}`} path={path} />
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
