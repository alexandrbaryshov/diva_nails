// Миниатюра дизайна для ленты: палец крупно и ноготь дизайна — рисуется кодом из данных пресета.
// По утверждённому макету (comp-1.png, лента «Дизайн месяца»): стройный, чуть сужающийся к подушечке палец
// с тонким контуром и мягкой светотенью, вытянутый ноготь выходит за подушечку; на ногте — сам дизайн
// той же отделкой, что на руке (NailFinish). Единицы рисунка — CSS px карточки (.dn-thumb 70×71).
import toneData from "../handTones.json";
import type { Design, Nail } from "../../state/design";
import { nailLength, nailPath } from "../geometry";
import { NailFinish, mix, nailOutline } from "../NailFinish";
import type { NailAnchor } from "../hands";
import { nailSummary } from "../../booking/telegram";

interface ToneColors {
  skin: string;
  light: string;
  shade: string;
  outline: string;
}
const TONES = toneData.tones as ToneColors[];

/** Ноготь, который лучше всего показывает дизайн: тот, что на большинстве ногтей. */
export function featuredNail(d: Design): Nail {
  const keys = d.nails.map(nailSummary);
  let best = 2;
  let bestCount = 0;
  keys.forEach((k, i) => {
    const c = keys.filter((x) => x === k).length;
    if (c > bestCount) {
      best = i;
      bestCount = c;
    }
  });
  return d.nails[best];
}

// Замер макета (карточка 302×311 px ↔ 76.6×79 CSS px): ноготь 78×168 px, кончик на 21% высоты карточки,
// кутикула — на 75%; палец у низа 120 px, у подушечки ≈ 98 px.
const VW = 70;
const VH = 71;
/** ширина ногтя */
const W = 19.8;
/** ложе: «овал / короткие» даёт ноготь макета — длина ≈ 2.15 ширины */
const BED = W * 1.85;
/** кутикула */
const CUTICLE = 51;
/** ширина пальца у низа карточки и у подушечки */
const FINGER_BOTTOM = 30.5;
const FINGER_TIP = 25;

const r1 = (n: number) => Math.round(n * 100) / 100;

export function PresetThumb({ design, uid, tone }: { design: Design; uid: string; tone: number }) {
  const nail = featuredNail(design);
  const t = TONES[tone] ?? TONES[1];
  const cx = VW / 2;
  const a: NailAnchor = { x: cx, y: CUTICLE, angle: 0, width: W, bed: BED };
  const len = nailLength(design.shape, design.length, a);
  // длинный ноготь: рисунок уменьшается к низу карточки, чтобы кончик остался виден
  const k = Math.min(1, (VH - 4) / (VH - CUTICLE + len));
  // палец: светлее руки, как в макете; бока темнее, слева — мягкий блик
  const skin = mix(t.skin, t.light, 0.45);
  const line = mix(t.outline, skin, 0.42);
  const top = CUTICLE - BED * 0.9; // подушечка — под ногтем, ноготь выходит за неё
  const rb = FINGER_BOTTOM / 2;
  const rt = FINGER_TIP / 2;
  const yr = top + rt;
  const finger =
    `M${r1(cx - rb)} ${VH + 2} C${r1(cx - rb)} ${r1(VH - 16)} ${r1(cx - rt)} ${r1(yr + 18)} ${r1(cx - rt)} ${r1(yr)} ` +
    `C${r1(cx - rt)} ${r1(yr - rt * 0.56)} ${r1(cx - rt * 0.56)} ${r1(top)} ${r1(cx)} ${r1(top)} ` +
    `C${r1(cx + rt * 0.56)} ${r1(top)} ${r1(cx + rt)} ${r1(yr - rt * 0.56)} ${r1(cx + rt)} ${r1(yr)} ` +
    `C${r1(cx + rt)} ${r1(yr + 18)} ${r1(cx + rb)} ${r1(VH - 16)} ${r1(cx + rb)} ${VH + 2}`;
  const fill = `${uid}-finger`;
  return (
    <svg class="dn-thumb" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={fill} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color={mix(skin, t.shade, 0.35)} />
          <stop offset="0.12" stop-color={skin} />
          <stop offset="0.3" stop-color={mix(skin, t.light, 0.5)} />
          <stop offset="0.7" stop-color={skin} />
          <stop offset="0.88" stop-color={mix(skin, t.shade, 0.4)} />
          <stop offset="1" stop-color={mix(skin, t.shade, 0.75)} />
        </linearGradient>
      </defs>
      <g transform={k < 1 ? `translate(${cx} ${VH}) scale(${r1(k)}) translate(${-cx} ${-VH})` : undefined}>
        <path d={`${finger} Z`} fill={`url(#${fill})`} />
        <path d={finger} data-thumb-finger="" fill="none" stroke={line} stroke-width="0.7" stroke-linejoin="round" />
        <NailFinish id={uid} nail={nail} anchor={a} shape={design.shape} length={design.length} shadow={false} />
        <path
          d={nailPath(design.shape, design.length, a)}
          data-thumb-nail=""
          fill="none"
          stroke={nailOutline(nail)}
          stroke-opacity="0.8"
          stroke-width="0.65"
          stroke-linejoin="round"
        />
      </g>
    </svg>
  );
}
