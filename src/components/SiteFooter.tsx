import styles from "./SiteFooter.module.css";

export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <h3>안내</h3>
      <p>
        이 웹사이트는 인터넷 방송인 "김편집"이 소유하고 있지 않으며, 비공식적인
        도메인입니다.
      </p>
      <p>
        방송인 본인이 원하지 않는 경우 웹사이트는 언제든지 사라질 수 있음을 미리
        알립니다.
      </p>
      <p>
        웹사이트를 사용하면서 발생하는 모든 문제에 대해 인터넷 방송인 "김편집"은
        책임질 수 없습니다.
      </p>
      <p>
        웹사이트와 관련된 문의는{" "}
        <a href="mailto:admin@kimpyun.zip">admin@kimpyun.zip</a> 를
        이용해주십시오.
      </p>
      <p>일반적으로, 민원 처리 이후 회신을 드리고 있지 않습니다.</p>
      <h3>법적 고지</h3>
      <p>
        <b>치지직</b>은 네이버(주)의 등록된 상표입니다.
      </p>
    </footer>
  );
}
