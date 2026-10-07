/**
 * 소스에 등장하는 글자가 전부 서브셋 폰트에 들어 있는지 검사합니다.
 *
 * 서브셋을 다시 만들지 않고 문구만 추가하면 그 글자가 폴백 폰트로 렌더되어
 * 글자만 섞여 보입니다. 원인을 찾기 어려운 버그라 자동으로 막습니다.
 *
 * 의존성 없음 (순수 Node) — CI 에서 바로 돌릴 수 있습니다.
 */
import { readFileSync } from "node:fs";
import { collectChars } from "./build-font-subset.mjs";

const MANIFEST = "public/fonts/charset.txt";
/** build-font-subset.mjs 의 MARGIN 과 동일한 범위 */
const MARGIN = [
  [0x20, 0x7e],
  [0xa0, 0xff],
  [0x2000, 0x206f],
  [0x20a0, 0x20bf],
  [0x2190, 0x21ff],
  [0x2460, 0x24ff],
  [0x25a0, 0x25ff],
  [0x2600, 0x26ff],
  [0x3000, 0x303f],
  [0x3130, 0x318f],
  [0xff00, 0xffef],
];

const inMargin = (cp) => MARGIN.some(([lo, hi]) => cp >= lo && cp <= hi);

const covered = new Set(readFileSync(MANIFEST, "utf8"));
const missing = [...collectChars()].filter(
  (c) => !covered.has(c) && !inMargin(c.codePointAt(0)),
);

if (missing.length) {
  console.error(
    `\n✖ 서브셋 폰트에 없는 글자 ${missing.length}개: ${missing.join("")}\n` +
      `  이대로 두면 해당 글자만 폴백 폰트로 렌더됩니다.\n` +
      `  해결: node scripts/build-font-subset.mjs 를 다시 실행하십시오.\n`,
  );
  process.exit(1);
}
console.log(`✓ 폰트 커버리지 정상 (${covered.size}자 + 마진 범위)`);
