/**
 * HTML 리디렉션 모드(staging 실험)용 경로별 아이콘 생성.
 *
 *   node scripts/build-link-icons.mjs   (= pnpm run icons:links)
 *
 * src/assets 의 원본 → public/link-icons/<이름>.png (정사각 SIZE×SIZE).
 * Google 은 favicon 을 48px 의 배수인 정사각으로 권장하므로 192 를 씁니다.
 * 결과 PNG 는 커밋합니다. 원본을 바꿨을 때만 다시 실행하십시오.
 *
 * - 사진·로고 래스터: 가운데를 정사각으로 잘라 줄입니다.
 * - SVG 로고: 브랜드색 정사각 배경 위에 흰 로고를 얹습니다
 *   (X.svg 는 currentColor 라 그대로는 색이 없습니다).
 *
 * Pillow · resvg-py 는 uv 가 있으면 일회성으로 받아 씁니다(가상환경을 남기지 않습니다).
 * uv 가 없으면 `pip install pillow resvg-py` 후 실행하거나,
 * PYTHON 환경변수로 둘이 설치된 인터프리터를 지정하십시오.
 */
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { routableLinks } from "../src/data/shortlinks.ts";

const SIZE = 192;
const OUT_DIR = "public/link-icons";

/** LinkIconName → 원본. src/data/shortlinks.ts 의 LinkIconName 과 키가 같아야 합니다 */
const ICONS = {
  kpj: { src: "src/assets/_source/KPJ.jpg" },
  "kpj-full": { src: "src/assets/_source/KPJFull.jpg" },
  "kpj-rage": { src: "src/assets/_source/KPJRage.jpg" },
  "kpj-basement1": { src: "src/assets/_source/KPJBasement1.jpg" },
  chzzk: { src: "src/assets/_source/CHZZK.png" },
  "naver-cafe": { src: "src/assets/_source/NaverCafe.webp" },
  // logo: 배경 한 변 대비 로고가 차지하는 비율
  x: {
    svg: "src/assets/X.svg",
    recolor: ["currentColor", "#ffffff"],
    bg: "#000000",
    logo: 0.56,
  },
  discord: {
    svg: "src/assets/Discord.svg",
    recolor: ["#5865f2", "#ffffff"],
    bg: "#5865f2",
    logo: 0.62,
  },
};

const used = [
  ...new Set(routableLinks.flatMap((l) => (l.linkIcon ? [l.linkIcon] : []))),
];
const unknown = used.filter((name) => !(name in ICONS));
if (unknown.length) {
  console.error(
    `✖ ICONS 에 원본이 지정되지 않은 아이콘: ${unknown.join(", ")}`,
  );
  process.exit(1);
}

/** stdin 으로 넘기는 Python. 사양은 환경변수(JSON)로 받습니다 */
const PY = String.raw`
import io, json, os, re
from PIL import Image
import resvg_py

size = int(os.environ["LINK_ICON_SIZE"])
out_dir = os.environ["LINK_ICON_OUT"]
specs = json.loads(os.environ["LINK_ICON_SPECS"])

def square(img):
    w, h = img.size
    s = min(w, h)
    left, top = (w - s) // 2, (h - s) // 2
    return img.crop((left, top, left + s, top + s))

def raster(spec):
    img = Image.open(spec["src"])
    img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
    return square(img).resize((size, size), Image.LANCZOS)

def svg(spec):
    text = open(spec["svg"], encoding="utf-8").read()
    src, dst = spec["recolor"]
    text = re.sub(re.escape(src), dst, text, flags=re.IGNORECASE)
    _, _, vw, vh = map(float, re.search(r'viewBox="([^"]+)"', text).group(1).split())
    box = size * spec["logo"]
    scale = box / max(vw, vh)
    w, h = max(1, round(vw * scale)), max(1, round(vh * scale))
    png = bytes(resvg_py.svg_to_bytes(svg_string=text, width=w, height=h))
    logo = Image.open(io.BytesIO(png)).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), spec["bg"])
    canvas.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    return canvas.convert("RGB")

for name, spec in specs.items():
    img = svg(spec) if "svg" in spec else raster(spec)
    path = os.path.join(out_dir, name + ".png")
    img.save(path, optimize=True)
    print(f"  {path}  {img.size[0]}x{img.size[1]}  {os.path.getsize(path) / 1024:.1f} KB")
`;

/** Pillow · resvg-py 가 import 되는 인터프리터인지 */
const usable = (cmd, pre = []) => {
  try {
    execFileSync(cmd, [...pre, "-c", "import PIL, resvg_py"], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
};

// 1) PYTHON 지정  2) 시스템 python  3) uv 로 일회성 실행
const candidates = [
  [process.env.PYTHON, []],
  ["python", []],
  [
    "uv",
    [
      "run",
      "--quiet",
      "--no-project",
      "--with",
      "pillow",
      "--with",
      "resvg-py",
      "python",
    ],
  ],
].filter(([cmd]) => cmd);

const found = candidates.find(([cmd, pre]) => usable(cmd, pre));
if (!found) {
  console.error("✖ Pillow · resvg-py 를 실행할 방법을 찾지 못했습니다.");
  console.error(
    "  uv 를 설치하거나(권장), pip install pillow resvg-py 후 다시 실행하십시오.",
  );
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const specs = Object.fromEntries(used.map((name) => [name, ICONS[name]]));

const [cmd, pre] = found;
console.log(`  실행: ${[cmd, ...pre].join(" ")}`);
execFileSync(cmd, [...pre, "-"], {
  input: PY,
  stdio: ["pipe", "inherit", "inherit"],
  env: {
    ...process.env,
    LINK_ICON_SIZE: String(SIZE),
    LINK_ICON_OUT: OUT_DIR,
    LINK_ICON_SPECS: JSON.stringify(specs),
  },
});
console.log(`✓ ${OUT_DIR}/ — 아이콘 ${used.length}개`);
