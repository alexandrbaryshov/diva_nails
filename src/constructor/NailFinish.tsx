// Покрытие одного ногтя: <defs> эффектов и узоров + слои внутри clipPath ногтя.
// Только SVG-средства: градиенты, <pattern>, feTurbulence/feDisplacementMap — без растров.
// Общий для HandView (живой конструктор) и renderHandSvg (карточка).
import type { JSX } from "preact";
import { decorById, shadeById } from "../data/palette";
import type { Effect, Length, Nail, Pattern, Print, Shape } from "../state/design";
import { frameLength, nailLength, nailPath, nailPathLocal, taperAt } from "./geometry";
import type { NailAnchor } from "./hands";

export const EFFECT_LABEL: Record<Effect, string> = {
  gloss: "глянец",
  matte: "матовое",
  chrome: "хром",
  rub: "втирка",
  "cat-eye": "кошачий глаз",
  glitter: "блёстки",
  gradient: "градиент",
};

export const PATTERN_LABEL: Record<Pattern, string> = {
  none: "без узора",
  french: "френч",
  lunar: "лунный",
  ombre: "омбре",
  marble: "мрамор",
  dots: "точки",
  stripes: "полоски",
  hearts: "сердечки",
};

/** Натуральный ноготь без покрытия: одинаковый на любом тоне кожи. */
export const NATURAL = { bed: "#f2d7cf", edge: "#faefea" };
const INK = "#3b2a26";
const WHITE = "#ffffff";

// ── цвет ───────────────────────────────────────────────────────────────────────
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}
/** Тот же цвет насыщеннее (HSL: насыщенность × k) — отблески хрома в макете сочнее самого лака. */
function vivid(c: string, k = 1.25): string {
  const [r, g, b] = rgb(c);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return c;
  const s = (mx - mn) / (l > 127.5 ? 510 - mx - mn : mx + mn);
  const s2 = Math.min(1, s * k);
  // растянуть каналы от серого той же светлоты
  const f = s2 / s;
  return hex([l + (r - l) * f, l + (g - l) * f, l + (b - l) * f]);
}
/** Относительная яркость 0..1. */
function luma(c: string): number {
  const [r, g, b] = rgb(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
const shadeHex = (id: string | null): string | null => (id ? (shadeById(id)?.hex ?? null) : null);
const lightOrDark = (base: string, onLight: string, onDark: string) => shadeHex(luma(base) > 0.62 ? onLight : onDark)!;

/** Тёмно-коричневая обводка, как у пальцев; у ногтя она чуть окрашена его цветом (в макете — сливовая у нюда). */
const NAIL_LINE = "#5a2c2b";
/** Тень на коже под ногтем и тёплая тень объёма на светлых ногтях. */
const SHADOW = "#6e3a2a";
const WARM_SHADE = "#b45f40";
/** Блик глянца — тёплый белый, как в макете (на нюде — персиково-белый, не голубоватый). */
const GLINT = "#fff3ec";

/** Цвет контура ногтя. */
export function nailOutline(nail: Nail): string {
  return mix(NAIL_LINE, shadeHex(nail.shade) ?? NATURAL.bed, 0.18);
}

/** Толщина контура ногтя в единицах руки — одна на все пальцы, как обводка пальцев макета (≈ 6 px макета). */
export const NAIL_STROKE = 8;

/** Сторона света по оси s ногтя: как в макете, блик — слева на экране. */
function lightSide(a: NailAnchor): 1 | -1 {
  return Math.cos((a.angle * Math.PI) / 180) >= 0 ? -1 : 1;
}

/** Второй цвет узора, когда accent не задан. */
function defaultAccent(pattern: Pattern, effect: Effect, base: string): string {
  if (effect === "gradient" && pattern === "none") return mix(base, WHITE, 0.6);
  switch (pattern) {
    case "french":
    case "lunar":
      return luma(base) > 0.86 ? shadeHex("DN07")! : shadeHex("DN40")!;
    case "ombre":
      return lightOrDark(base, "DN18", "DN40");
    case "marble":
      return lightOrDark(base, "DN36", "DN40");
    case "dots":
    case "stripes":
      return lightOrDark(base, "DN34", "DN40");
    case "hearts":
      return lightOrDark(base, "DN28", "DN40");
    default:
      return mix(base, WHITE, 0.6);
  }
}

export interface FinishProps {
  /** уникальный префикс id в документе */
  id: string;
  nail: Nail;
  anchor: NailAnchor;
  shape: Shape;
  length: Length;
  print?: Print;
  /** href картинки принта, если отличается от print.url (data URI для карточки) */
  printHref?: string;
  /** тень на коже под свободным краем (по умолчанию есть; у миниатюры ноготь смотрит вверх — без неё) */
  shadow?: boolean;
}

/** Ноготь целиком: тень на коже, defs + покрытие внутри clipPath. Контур и выделение рисует HandView. */
export function NailFinish({ id, nail, anchor: a, shape, length, print, printHref, shadow = true }: FinishProps) {
  const d = nailPath(shape, length, a);
  const w = a.width;
  const L = frameLength(a, length);
  // настоящая длина этой формы — по ней ложатся блики и объём
  const Ls = nailLength(shape, length, a);
  const natural = nail.shade === null;
  const base = shadeHex(nail.shade) ?? NATURAL.bed;
  const accent = shadeHex(nail.accent) ?? defaultAccent(nail.pattern, nail.effect, base);
  const effect: Effect = natural && nail.effect !== "matte" ? "gloss" : nail.effect;
  const light = luma(base) > 0.45;
  const ls = lightSide(a);
  // Локальная система ногтя: начало — кутикула, x — поперёк, −y — к свободному краю (без отражения).
  const frame = `translate(${r1(a.x)} ${r1(a.y)}) rotate(${r1(a.angle)})`;
  const p = (s: number, t: number) => `${r1(s)} ${r1(-t)}`;
  // точка с учётом сужения ногтя пальца, видного сбоку (большой палец)
  const q = (s: number, t: number) => p(s * taperAt(a, Ls, t), t);
  // слой на весь ноготь — его же контур в локальных осях (а не прямоугольник с запасом)
  const cover = { d: nailPathLocal(shape, length, a) };
  const ids = {
    clip: `${id}-clip`,
    fill: `${id}-fill`,
    vol: `${id}-vol`,
    cut: `${id}-cut`,
    shadow: `${id}-shadow`,
    soft: `${id}-soft`,
    glow: `${id}-glow`,
    cap: `${id}-cap`,
    sheen: `${id}-sheen`,
    tex: `${id}-tex`,
    pat: `${id}-pat`,
    fx: `${id}-fx`,
    decor: `${id}-dec`,
  };
  const url = (k: string) => `url(#${k})`;

  // Объём, как в макете: светлый край со стороны света, тёплая тень вдоль другого края, чуть темнее у кутикулы.
  const tint = light ? WARM_SHADE : mix(base, "#000000", 0.7);
  const vk = effect === "matte" ? 0.6 : 1;
  const defs: JSX.Element[] = [
    <clipPath id={ids.clip} key="clip">
      <path d={d} />
    </clipPath>,
    <linearGradient id={ids.vol} key="vol" gradientUnits="userSpaceOnUse" x1={r1((ls * w) / 2)} y1="0" x2={r1((-ls * w) / 2)} y2="0">
      <stop offset="0" stop-color={WHITE} stop-opacity={r3((light ? 0.12 : 0.1) * vk)} />
      <stop offset="0.1" stop-color={WHITE} stop-opacity={r3((light ? 0.04 : 0.03) * vk)} />
      <stop offset="0.4" stop-color={WHITE} stop-opacity="0" />
      <stop offset="0.74" stop-color={tint} stop-opacity="0" />
      <stop offset="0.82" stop-color={tint} stop-opacity={r3((light ? 0.15 : 0.35) * vk)} />
      <stop offset="0.9" stop-color={tint} stop-opacity={r3((light ? 0.19 : 0.42) * vk)} />
      <stop offset="1" stop-color={tint} stop-opacity={r3((light ? 0.24 : 0.5) * vk)} />
    </linearGradient>,
    <linearGradient id={ids.cut} key="cut" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={r1(-Ls * 0.24)}>
      <stop offset="0" stop-color={tint} stop-opacity={r3((light ? 0.12 : 0.25) * vk)} />
      <stop offset="1" stop-color={tint} stop-opacity="0" />
    </linearGradient>,
    // мягкие края бликов
    <filter id={ids.soft} key="soft" x="-0.5" y="-0.2" width="2" height="1.4" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation={r1(w * 0.012)} />
    </filter>,
    <filter id={ids.glow} key="glow" x="-1" y="-0.3" width="3" height="1.6" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation={r1(w * 0.05)} />
    </filter>,
    // лёгкая тень на коже под свободным краем
    <radialGradient id={ids.shadow} key="shadow">
      <stop offset="0" stop-color={SHADOW} stop-opacity="0.3" />
      <stop offset="0.72" stop-color={SHADOW} stop-opacity="0.2" />
      <stop offset="1" stop-color={SHADOW} stop-opacity="0" />
    </radialGradient>,
  ];
  const layers: JSX.Element[] = [];

  /**
   * Продольный блик-линза: центр sc поперёк, полуширина hw, от t0 до t1; bow — изгиб к краю ногтя;
   * full — полнее к концам (полоса ровной ширины со скруглёнными концами, а не веретено).
   */
  const lens = (sc: number, hw: number, t0: number, t1: number, bow = 0, full = false) => {
    const dt = t1 - t0;
    const sg = Math.sign(sc || ls);
    const out = sc + sg * (hw / 0.75 + bow);
    const inn = sc - sg * (hw / 0.75 - bow);
    const [a1, a2] = full ? [0.02, 0.9] : [0.12, 0.7];
    return `M${q(sc, t0)} C${q(out, t0 + dt * a1)} ${q(out, t0 + dt * a2)} ${q(sc + sg * bow, t1)} C${q(inn, t0 + dt * a2)} ${q(inn, t0 + dt * a1)} ${q(sc, t0)} Z`;
  };
  /** Блик глянца: продольная полоса тёплого белого со стороны света и широкое мягкое сияние вокруг неё. */
  const highlight = (strength: number, key: string) => (
    <g key={key} fill={GLINT}>
      <path d={lens(ls * 0.25 * w, 0.13 * w, 0.08 * Ls, 0.8 * Ls)} fill-opacity={r3(strength * 0.2)} filter={url(ids.glow)} />
      <path d={lens(ls * 0.265 * w, 0.065 * w, 0.11 * Ls, 0.72 * Ls, 0.008 * w)} fill-opacity={r3(strength)} filter={url(ids.soft)} />
    </g>
  );

  // ── основа ──
  let fill = base;
  const sat = vivid(base);
  if (effect === "chrome") {
    // вишнёвый хром макета (замер поперёк безымянного): сочные светлые ободки по обоим краям,
    // яркая полоса у блика, глубокая тёмная середина, ближе к тёмному краю — второй отблеск
    defs.push(
      <linearGradient id={ids.fill} key="fill" gradientUnits="userSpaceOnUse" x1={r1((ls * w) / 2)} y1="0" x2={r1((-ls * w) / 2)} y2="0">
        <stop offset="0" stop-color={mix(sat, WHITE, 0.2)} />
        <stop offset="0.07" stop-color={sat} />
        <stop offset="0.2" stop-color={mix(sat, "#000000", 0.12)} />
        <stop offset="0.3" stop-color={mix(sat, WHITE, 0.1)} />
        <stop offset="0.37" stop-color={sat} />
        <stop offset="0.46" stop-color={mix(sat, "#000000", 0.3)} />
        <stop offset="0.6" stop-color={mix(sat, "#000000", 0.4)} />
        <stop offset="0.78" stop-color={mix(sat, "#000000", 0.36)} />
        <stop offset="0.86" stop-color={mix(sat, WHITE, 0.06)} />
        <stop offset="0.94" stop-color={mix(sat, WHITE, 0.1)} />
        <stop offset="1" stop-color={mix(sat, WHITE, 0.2)} />
      </linearGradient>,
      <radialGradient id={ids.cap} key="cap">
        <stop offset="0" stop-color={mix(sat, WHITE, 0.6)} stop-opacity="0.8" />
        <stop offset="0.55" stop-color={mix(sat, WHITE, 0.4)} stop-opacity="0.3" />
        <stop offset="1" stop-color={sat} stop-opacity="0" />
      </radialGradient>,
    );
    fill = url(ids.fill);
  } else if (effect === "gradient") {
    defs.push(
      <linearGradient id={ids.fill} key="fill" gradientUnits="userSpaceOnUse" x1={r1(-w * 0.5)} y1={r1(-L * 0.15)} x2={r1(w * 0.5)} y2={r1(-L * 0.85)}>
        <stop offset="0.08" stop-color={base} />
        <stop offset="0.92" stop-color={accent} />
      </linearGradient>,
    );
    fill = url(ids.fill);
  }
  layers.push(<path key="base" {...cover} fill={fill} />);
  if (natural) {
    // свободный край натурального ногтя светлее ложа
    layers.push(<path key="edge-free" d={`M${p(-w, a.bed)} L${p(w, a.bed)} L${p(w, L + w * 2)} L${p(-w, L + w * 2)} Z`} fill={NATURAL.edge} />);
  }

  // ── принт ──
  if (print) {
    const side = L * print.scale;
    const cx = (print.x - 0.5) * w;
    const cy = -print.y * L;
    layers.push(
      <g key="print" transform={`translate(${r1(cx)} ${r1(cy)}) rotate(${r1(print.rot)})`}>
        <image
          href={printHref ?? print.url}
          x={r1(-side / 2)}
          y={r1(-side / 2)}
          width={r1(side)}
          height={r1(side)}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>,
    );
  }

  // ── узор ──
  switch (nail.pattern) {
    case "french": {
      const tS = a.bed - 0.3 * w;
      const tC = a.bed - 0.02 * w;
      layers.push(
        <path
          key="pattern"
          d={`M${p(-w, tS - 0.12 * w)} Q${p(0, 2 * tC - tS)} ${p(w, tS - 0.12 * w)} L${p(w, L + w * 2)} L${p(-w, L + w * 2)} Z`}
          fill={accent}
        />,
      );
      break;
    }
    case "lunar": {
      const tS = 0.3 * w;
      const tC = 0.44 * w;
      layers.push(
        <path key="pattern" d={`M${p(-w, -w)} L${p(w, -w)} L${p(w, tS)} Q${p(0, 2 * tC - tS)} ${p(-w, tS)} Z`} fill={accent} />,
      );
      break;
    }
    case "ombre": {
      defs.push(
        <linearGradient id={ids.pat} key="pat" gradientUnits="userSpaceOnUse" x1="0" y1={r1(-L * 0.3)} x2="0" y2={r1(-L * 0.92)}>
          <stop offset="0" stop-color={accent} stop-opacity="0" />
          <stop offset="1" stop-color={accent} stop-opacity="1" />
        </linearGradient>,
      );
      layers.push(<path key="pattern" {...cover} fill={url(ids.pat)} />);
      break;
    }
    case "marble": {
      const f = 1 / w;
      defs.push(
        <filter id={ids.pat} key="pat" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={`${r3(f * 1.1)} ${r3(f * 2.6)}`} numOctaves={3} seed={7} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.3" result="a" />
          <feComponentTransfer in="a" result="veins">
            <feFuncA type="table" tableValues="0 0 0 0.95 0 0 0 0.55 0 0 0 0.8 0" />
          </feComponentTransfer>
          <feTurbulence type="turbulence" baseFrequency={r3(f * 3)} numOctaves={2} seed={3} result="w" />
          <feDisplacementMap in="veins" in2="w" scale={r1(w * 0.12)} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={r1(w * 0.006)} result="b" />
          <feFlood flood-color={accent} />
          <feComposite in2="b" operator="in" />
        </filter>,
      );
      layers.push(<path key="pattern" {...cover} fill={accent} filter={url(ids.pat)} />);
      break;
    }
    case "dots": {
      const s = w * 0.3;
      defs.push(
        <pattern id={ids.pat} key="pat" patternUnits="userSpaceOnUse" width={r1(s)} height={r1(s)} x={r1(-s / 4)} y="0">
          <path d={oval(s / 4, s / 4, w * 0.055) + oval((s * 3) / 4, (s * 3) / 4, w * 0.055)} fill={accent} />
        </pattern>,
      );
      layers.push(<path key="pattern" {...cover} fill={url(ids.pat)} />);
      break;
    }
    case "stripes": {
      const s = w * 0.26;
      defs.push(
        <pattern id={ids.pat} key="pat" patternUnits="userSpaceOnUse" width={r1(s)} height={r1(s)} x={r1(-s / 2)} y="0">
          <path d={`M${r1(s / 2 - w * 0.03)} 0 h${r1(w * 0.06)} v${r1(s)} h${r1(-w * 0.06)} Z`} fill={accent} />
        </pattern>,
      );
      layers.push(<path key="pattern" {...cover} fill={url(ids.pat)} />);
      break;
    }
    case "hearts": {
      const s = w * 0.42;
      const k = w * 0.075;
      defs.push(
        <pattern id={ids.pat} key="pat" patternUnits="userSpaceOnUse" width={r1(s)} height={r1(s)} x={r1(-s / 4)} y="0">
          <path d={heartPath(s / 4, s / 4, k)} fill={accent} />
          <path d={heartPath((s * 3) / 4, (s * 3) / 4, k)} fill={accent} />
        </pattern>,
      );
      layers.push(<path key="pattern" {...cover} fill={url(ids.pat)} />);
      break;
    }
    case "none":
      break;
  }

  // ── объём ── (под бликами эффекта)
  // у хрома объём уже в самой заливке
  if (effect !== "chrome") layers.push(<path key="vol" {...cover} fill={url(ids.vol)} />);
  layers.push(<path key="vol-cut" {...cover} fill={url(ids.cut)} />);

  // ── эффект ──
  switch (effect) {
    case "gloss":
      layers.push(highlight(natural ? 0.55 : 0.78, "fx"));
      break;
    case "matte": {
      defs.push(
        <filter id={ids.tex} key="tex" x="0" y="0" width="1" height="1">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={1} seed={2} />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.16 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>,
        <radialGradient id={ids.sheen} key="sheen" gradientUnits="userSpaceOnUse" cx="0" cy={r1(-L * 0.5)} r={r1(L * 0.6)}>
          <stop offset="0" stop-color={WHITE} stop-opacity="0.14" />
          <stop offset="1" stop-color={WHITE} stop-opacity="0" />
        </radialGradient>,
      );
      layers.push(<path key="fx-sheen" {...cover} fill={url(ids.sheen)} />);
      layers.push(<path key="fx" {...cover} fill={WHITE} filter={url(ids.tex)} />);
      break;
    }
    case "chrome":
      layers.push(
        <g key="fx" fill={mix(sat, WHITE, 0.8)}>
          {/* отблеск у кутикулы со стороны тени: мягкое сияние и серп вдоль скругления */}
          <path d={oval(-ls * 0.18 * w * taperAt(a, Ls, 0.09 * Ls), -0.09 * Ls, 0.26 * w, 0.09 * Ls)} fill={url(ids.cap)} fill-opacity="0.6" />
          <path
            d={`M${q(-ls * 0.04 * w, 0.05 * Ls)} C${q(-ls * 0.28 * w, 0.045 * Ls)} ${q(-ls * 0.4 * w, 0.1 * Ls)} ${q(-ls * 0.41 * w, 0.24 * Ls)} C${q(-ls * 0.33 * w, 0.13 * Ls)} ${q(-ls * 0.22 * w, 0.09 * Ls)} ${q(-ls * 0.04 * w, 0.05 * Ls)} Z`}
            fill={mix(sat, WHITE, 0.7)}
            fill-opacity="0.75"
            filter={url(ids.soft)}
          />
          {/* розовое сияние у светлого края внизу, длинная полоса света и тонкий отблеск у тёмного края */}
          <path d={lens(ls * 0.25 * w, 0.13 * w, 0.55 * Ls, 0.96 * Ls)} fill={mix(sat, WHITE, 0.35)} fill-opacity="0.5" filter={url(ids.glow)} />
          <path d={lens(ls * 0.27 * w, 0.13 * w, 0.1 * Ls, 0.8 * Ls)} fill-opacity="0.32" filter={url(ids.glow)} />
          <path d={lens(ls * 0.28 * w, 0.06 * w, 0.16 * Ls, 0.76 * Ls, 0.01 * w, true)} fill-opacity="0.8" filter={url(ids.soft)} />
          <path d={lens(ls * 0.285 * w, 0.03 * w, 0.2 * Ls, 0.7 * Ls, 0.01 * w, true)} fill={WHITE} fill-opacity="0.85" />
          <path d={lens(-ls * 0.31 * w, 0.035 * w, 0.38 * Ls, 0.74 * Ls, 0.025 * w)} fill-opacity="0.9" filter={url(ids.soft)} />
        </g>,
      );
      break;
    case "rub": {
      defs.push(
        <linearGradient id={ids.sheen} key="sheen" gradientUnits="userSpaceOnUse" x1={r1(-w / 2)} y1="0" x2={r1(w / 2)} y2={r1(-L)}>
          <stop offset="0" stop-color="#ffd7ea" />
          <stop offset="0.3" stop-color="#fff2c4" />
          <stop offset="0.55" stop-color="#d4fbef" />
          <stop offset="0.8" stop-color="#e4dcff" />
          <stop offset="1" stop-color="#ffd7ea" />
        </linearGradient>,
        <filter id={ids.fx} key="fx" x="-0.1" y="-0.1" width="1.2" height="1.2" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency={r3(1.4 / w)} numOctaves={2} seed={5} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={r1(w * 0.5)} xChannelSelector="R" yChannelSelector="B" result="d" />
          <feGaussianBlur in="d" stdDeviation={r1(w * 0.02)} />
        </filter>,
      );
      layers.push(
        <path key="fx" {...cover} fill={url(ids.sheen)} fill-opacity="0.62" filter={url(ids.fx)} style="mix-blend-mode:screen" />,
      );
      layers.push(highlight(0.35, "fx-hl"));
      break;
    }
    case "cat-eye": {
      defs.push(
        <linearGradient id={ids.sheen} key="sheen" gradientUnits="userSpaceOnUse" x1={r1(-w * 0.55)} y1={r1(-L * 0.62)} x2={r1(w * 0.55)} y2={r1(-L * 0.38)}>
          <stop offset="0.3" stop-color={WHITE} stop-opacity="0" />
          <stop offset="0.43" stop-color={mix(base, WHITE, 0.55)} stop-opacity="0.45" />
          <stop offset="0.5" stop-color={mix(base, WHITE, 0.9)} stop-opacity="0.95" />
          <stop offset="0.57" stop-color={mix(base, WHITE, 0.55)} stop-opacity="0.45" />
          <stop offset="0.7" stop-color={WHITE} stop-opacity="0" />
        </linearGradient>,
      );
      // края темнее — полоса света читается сильнее
      layers.push(<path key="fx-dark" {...cover} fill={mix(base, "#000000", 0.45)} fill-opacity="0.35" />);
      layers.push(<path key="fx" class="dn-sheen" {...cover} fill={url(ids.sheen)} />);
      break;
    }
    case "glitter": {
      const s = w * 0.32;
      const spark = mix(base, WHITE, 0.7);
      const dots: [number, number, number, string, number][] = [
        [0.12, 0.18, 0.016, WHITE, 0.95],
        [0.55, 0.09, 0.011, spark, 1],
        [0.86, 0.3, 0.02, "#e9e6ee", 0.9],
        [0.32, 0.46, 0.013, WHITE, 0.85],
        [0.7, 0.58, 0.017, spark, 1],
        [0.08, 0.72, 0.012, "#e9e6ee", 0.95],
        [0.45, 0.83, 0.021, WHITE, 0.9],
        [0.93, 0.88, 0.01, spark, 1],
        [0.24, 0.97, 0.014, WHITE, 0.8],
      ];
      defs.push(
        <pattern id={ids.tex} key="tex" patternUnits="userSpaceOnUse" width={r1(s)} height={r1(s)}>
          {dots.map(([x, y, rr, c, o], k) => (
            <path key={k} d={oval(x * s, y * s, rr * w * 1.6)} fill={c} fill-opacity={o} />
          ))}
        </pattern>,
      );
      layers.push(<path key="fx-grain" {...cover} fill={mix(base, WHITE, 0.25)} fill-opacity="0.25" />);
      layers.push(<path key="fx" {...cover} fill={url(ids.tex)} />);
      layers.push(highlight(0.5, "fx-hl"));
      break;
    }
    case "gradient":
      layers.push(highlight(0.55, "fx"));
      break;
  }

  // ── декор ──
  nail.decor.forEach((dec, k) => {
    const item = decorById(dec.item);
    if (!item) return;
    const size = w * 0.24 * dec.scale;
    const cx = (dec.u - 0.5) * w;
    const cy = -dec.v * L;
    layers.push(
      <g key={`decor-${k}`} class="dn-decor" data-decor={k} transform={`translate(${r1(cx)} ${r1(cy)}) rotate(${r1(dec.rot)})`}>
        {decorArt(dec.item, size, `${ids.decor}-${k}`, defs)}
      </g>,
    );
  });

  return (
    <>
      <defs>{defs}</defs>
      {/* тень на коже: у тёмного бока и под свободным краем */}
      {shadow && (
        <path transform={frame} d={oval(-ls * 0.05 * w, -0.56 * Ls, 0.6 * w * (1 - (a.taper ?? 0) * 0.45), 0.56 * Ls)} fill={url(ids.shadow)} pointer-events="none" />
      )}
      <g clip-path={url(ids.clip)} data-nail-paint="" data-axis={r1(a.angle)}>
        <g transform={frame}>{layers}</g>
      </g>
    </>
  );
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 10000) / 10000;

/** Эллипс (круг при ry = rx) одним подконтуром пути. */
function oval(cx: number, cy: number, rx: number, ry = rx): string {
  return `M${r1(cx - rx)} ${r1(cy)} a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(2 * rx)} 0 a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(-2 * rx)} 0 Z`;
}

/** Сердечко с центром (cx, cy), острием к свободному краю (−y). */
function heartPath(cx: number, cy: number, k: number): string {
  const x = (v: number) => r1(cx + v * k);
  const y = (v: number) => r1(cy - v * k);
  return `M${x(0)} ${y(-0.9)} C${x(-0.2)} ${y(-0.6)} ${x(-1.1)} ${y(-0.1)} ${x(-1.05)} ${y(0.45)} C${x(-1)} ${y(1)} ${x(-0.25)} ${y(1.1)} ${x(0)} ${y(0.55)} C${x(0.25)} ${y(1.1)} ${x(1)} ${y(1)} ${x(1.05)} ${y(0.45)} C${x(1.1)} ${y(-0.1)} ${x(0.2)} ${y(-0.6)} ${x(0)} ${y(-0.9)} Z`;
}

function starPath(r: number, inner: number, points = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const ang = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${r1(Math.cos(ang) * rr)} ${r1(Math.sin(ang) * rr)}`);
  }
  return `M${pts.join(" L")} Z`;
}

/** Рисунок элемента декора размером size с центром в (0,0). Градиенты страз — в общий defs ногтя. */
function decorArt(item: string, size: number, gid: string, defs: JSX.Element[]): JSX.Element {
  const r = size / 2;
  const shadow = <path d={oval(r * 0.12, r * 0.16, r * 1.02, r * 0.98)} fill={INK} fill-opacity="0.22" />;
  const gem = (stops: [string, string, string]) => {
    defs.push(
      <radialGradient id={gid} key={gid} cx="0.35" cy="0.32" r="0.75">
        <stop offset="0" stop-color={stops[0]} />
        <stop offset="0.55" stop-color={stops[1]} />
        <stop offset="1" stop-color={stops[2]} />
      </radialGradient>,
    );
    return (
      <>
        {shadow}
        <path d={oval(0, 0, r)} fill={`url(#${gid})`} />
        <path d={oval(-r * 0.32, -r * 0.34, r * 0.22)} fill={WHITE} fill-opacity="0.85" />
      </>
    );
  };
  switch (item) {
    case "rhinestone-crystal": {
      const el = gem(["#ffffff", "#dfe8f4", "#8fa3c2"]);
      return (
        <>
          {el}
          <path d={starPath(r * 0.7, 0.28, 4)} fill={WHITE} fill-opacity="0.55" />
        </>
      );
    }
    case "rhinestone-pearl":
      return gem(["#fffdf8", "#f3e6da", "#c9b3a2"]);
    case "rhinestone-gold":
      return gem(["#fff3c2", "#e2b65a", "#8f6420"]);
    case "sticker-star":
      return (
        <>
          <path d={starPath(r * 1.05, 0.45)} fill={INK} fill-opacity="0.2" transform={`translate(${r1(r * 0.1)} ${r1(r * 0.12)})`} />
          <path d={starPath(r * 1.05, 0.45)} fill="#f2cf73" />
        </>
      );
    case "sticker-heart":
      return <path d={heartPath(0, 0, r * 0.95)} fill="#c8323f" />;
    case "sticker-snowflake":
      return (
        <g stroke={WHITE} stroke-width={r1(size * 0.09)} stroke-linecap="round" fill="none">
          {[0, 60, 120].map((deg) => (
            <path key={deg} d={`M0 ${r1(-r)} L0 ${r1(r)} M${r1(-r * 0.3)} ${r1(-r * 0.7)} L0 ${r1(-r * 0.45)} L${r1(r * 0.3)} ${r1(-r * 0.7)} M${r1(-r * 0.3)} ${r1(r * 0.7)} L0 ${r1(r * 0.45)} L${r1(r * 0.3)} ${r1(r * 0.7)}`} transform={`rotate(${deg})`} />
          ))}
        </g>
      );
    case "sticker-bow":
      return (
        <g fill="#e7a3b6">
          <path d={`M0 0 C${r1(-r * 0.4)} ${r1(-r * 0.9)} ${r1(-r * 1.2)} ${r1(-r * 0.7)} ${r1(-r * 1.1)} 0 C${r1(-r * 1.2)} ${r1(r * 0.7)} ${r1(-r * 0.4)} ${r1(r * 0.9)} 0 0 Z`} />
          <path d={`M0 0 C${r1(r * 0.4)} ${r1(-r * 0.9)} ${r1(r * 1.2)} ${r1(-r * 0.7)} ${r1(r * 1.1)} 0 C${r1(r * 1.2)} ${r1(r * 0.7)} ${r1(r * 0.4)} ${r1(r * 0.9)} 0 0 Z`} />
          <path d={oval(0, 0, r * 0.26)} fill="#cf7d96" />
        </g>
      );
    case "sticker-leaf":
      return (
        <path
          d={`M0 ${r1(r)} L0 ${r1(r * 0.35)} L${r1(-r * 0.95)} ${r1(r * 0.15)} L${r1(-r * 0.6)} ${r1(-r * 0.1)} L${r1(-r)} ${r1(-r * 0.55)} L${r1(-r * 0.4)} ${r1(-r * 0.45)} L${r1(-r * 0.35)} ${r1(-r * 0.95)} L0 ${r1(-r * 0.55)} L${r1(r * 0.35)} ${r1(-r * 0.95)} L${r1(r * 0.4)} ${r1(-r * 0.45)} L${r1(r)} ${r1(-r * 0.55)} L${r1(r * 0.6)} ${r1(-r * 0.1)} L${r1(r * 0.95)} ${r1(r * 0.15)} L0 ${r1(r * 0.35)} Z`}
          fill="#b9552e"
          stroke="#b9552e"
          stroke-width={r1(size * 0.04)}
          stroke-linejoin="round"
        />
      );
    default:
      return <path d={oval(0, 0, r)} fill={WHITE} />;
  }
}
