/**
 * SUITE Variable 서브셋 생성.
 *
 * 전체 폰트는 523 KB 인데 이 사이트가 쓰는 글자는 400자 미만입니다.
 * 한글 글리프는 개당 약 41 바이트라, 쓰지 않는 음절을 넣는 만큼 선형으로 커집니다.
 * (전체 한글 범위로 자르는 것은 무의미합니다 — 이 폰트는 사실상 전부 한글이라 4% 밖에 안 줄어듭니다.)
 *
 * 사용법:
 *   node scripts/build-font-subset.mjs
 *
 * fontTools 는 uv 가 있으면 일회성으로 받아 씁니다(가상환경을 남기지 않습니다).
 * uv 가 없으면 `pip install fonttools brotli` 후 실행하거나,
 * PYTHON 환경변수로 fontTools 가 설치된 인터프리터를 지정하십시오.
 *
 * 소스의 문구를 고친 뒤에는 반드시 다시 실행하십시오.
 * 빠뜨리면 `pnpm check:font` 가 잡아냅니다.
 *
 * 주석은 글자를 모을 때 뺍니다. 화면에 나오지 않는 글자로 폰트가 커지지 않게 합니다.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { parseSync } from "vite";

const SRC_DIRS = ["src", "pages"];
const EXTS = new Set([".tsx", ".ts", ".html", ".css"]);
const SKIP = /node_modules|_source|[.]venv|dist/;

const FULL = "src/assets/_source/SUITE-Variable.woff2";
const OUT = "public/fonts/SUITE-Variable.woff2";
const MANIFEST = "public/fonts/charset.txt";

/** 서브셋에 항상 포함할 여유 마진.
 *  새 URL 경로·영문·기호·자모는 이 범위로 전부 커버됩니다.
 *  커버되지 않는 것은 "새 한글 음절" 뿐이고, 그건 check:font 가 감시합니다. */
const MARGIN = [
  "U+0020-007E", // ASCII
  "U+00A0-00FF", // Latin-1 supplement
  "U+2000-206F", // 일반 구두점
  "U+20A0-20BF", // 통화 기호
  "U+2190-21FF", // 화살표
  "U+2460-24FF", // 원문자
  "U+25A0-25FF", // 도형
  "U+2600-26FF", // 기타 기호
  "U+3000-303F", // CJK 구두점
  "U+3130-318F", // 한글 호환 자모
  "U+FF00-FFEF", // 전각
].join(",");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP.test(p)) continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXTS.has(extname(name))) out.push(p);
  }
  return out;
}

/**
 * 주석을 지운 소스. 화면에 나올 수 있는 글자(문자열·JSX 텍스트·CSS content 등)만 남깁니다.
 *
 * .ts/.tsx 는 정규식이 아니라 파서(Vite 가 내보내는 oxc)로 주석 위치를 찾습니다.
 * 정규식으로는 "https://" 같은 문자열이나 JSX 텍스트 속 "//" 를 주석으로 오인해,
 * 실제로 보이는 글자를 빠뜨릴 수 있습니다. 빠뜨리는 쪽이 더 위험합니다(폴백 폰트로 렌더).
 * 그래서 파싱에 실패하면 주석을 지우지 않고 원문 그대로 셉니다.
 */
function stripComments(file, text) {
  const ext = extname(file);
  if (ext === ".css") return text.replace(/\/\*[\s\S]*?\*\//g, "");
  if (ext === ".html") return text.replace(/<!--[\s\S]*?-->/g, "");

  const { comments, errors } = parseSync(file, text);
  if (errors.length) {
    console.warn(`  ! ${file}: 파싱 실패 — 주석을 포함해 셉니다`);
    return text;
  }
  // 뒤에서부터 지워야 앞쪽 위치가 밀리지 않습니다.
  let out = text;
  for (const c of [...comments].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, c.start) + out.slice(c.end);
  }
  return out;
}

export function collectChars() {
  const text = SRC_DIRS.flatMap((d) => walk(d))
    .map((f) => stripComments(f, readFileSync(f, "utf8")))
    .join("");
  return [...new Set(text)]
    .filter((c) => c.codePointAt(0) >= 0x20)
    .sort()
    .join("");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const chars = collectChars();
  writeFileSync(MANIFEST, chars, "utf8");

  const args = [
    "-m",
    "fontTools.subset",
    FULL,
    `--output-file=${OUT}`,
    "--flavor=woff2",
    "--layout-features=*",
    `--text-file=${MANIFEST}`,
    `--unicodes=${MARGIN}`,
  ];

  /** fontTools 가 import 되는 인터프리터인지 */
  const usable = (cmd, pre = []) => {
    try {
      execFileSync(cmd, [...pre, "-c", "import fontTools, brotli"], {
        stdio: "ignore",
      });
      return true;
    } catch {
      return false;
    }
  };

  // 1) PYTHON 지정  2) 시스템 python  3) uv 로 일회성 실행(환경을 남기지 않음)
  const candidates = [
    [process.env.PYTHON, []],
    ["python", []],
    ["uv", ["run", "--quiet", "--with", "fonttools[woff]", "python"]],
  ].filter(([cmd]) => cmd);

  const found = candidates.find(([cmd, pre]) => usable(cmd, pre));
  if (!found) {
    console.error("✖ fontTools 를 실행할 방법을 찾지 못했습니다.");
    console.error(
      "  uv 를 설치하거나(권장), pip install fonttools brotli 후 다시 실행하십시오.",
    );
    process.exit(1);
  }

  const [cmd, pre] = found;
  console.log(`  실행: ${[cmd, ...pre].join(" ")}`);
  execFileSync(cmd, [...pre, ...args], { stdio: "inherit" });

  const kb = (n) => (statSync(n).size / 1024).toFixed(1) + " KB";
  console.log(`\n  원본   ${FULL}  ${kb(FULL)}`);
  console.log(`  서브셋 ${OUT}  ${kb(OUT)}`);
  console.log(`  문자표 ${MANIFEST}  ${chars.length}자`);
}
